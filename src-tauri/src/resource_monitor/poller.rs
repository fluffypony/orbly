use std::collections::HashSet;
use sysinfo::{Pid, ProcessesToUpdate};
use tauri::{AppHandle, Emitter, Manager};

/// Walk the process tree to find all PIDs descended from `root_pid`.
fn collect_tree_pids(sys: &sysinfo::System, root_pid: Pid) -> HashSet<Pid> {
    let mut pids = HashSet::new();
    pids.insert(root_pid);
    let mut changed = true;
    while changed {
        changed = false;
        for (pid, process) in sys.processes() {
            if !pids.contains(pid) {
                if let Some(parent) = process.parent() {
                    if pids.contains(&parent) {
                        pids.insert(*pid);
                        changed = true;
                    }
                }
            }
        }
    }
    pids
}

/// Measure total CPU% (normalized to 0-100 of total capacity) and memory (MB)
/// for the entire Tauri process tree (main + WebView helpers).
fn get_process_tree_resources(monitor: &super::ResourceMonitor) -> (f64, f64) {
    let mut sys = monitor.sys.lock().expect("sysinfo lock");
    let current_pid = Pid::from_u32(std::process::id());

    sys.refresh_cpu_all();
    sys.refresh_processes(ProcessesToUpdate::All, true);

    let tree_pids = collect_tree_pids(&sys, current_pid);

    let mut total_cpu: f32 = 0.0;
    let mut total_memory: u64 = 0;
    for pid in &tree_pids {
        if let Some(process) = sys.process(*pid) {
            total_cpu += process.cpu_usage();
            total_memory += process.memory();
        }
    }

    let num_cpus = sys.cpus().len().max(1) as f64;
    let cpu_percent = (total_cpu as f64) / num_cpus;
    let memory_mb = total_memory as f64 / (1024.0 * 1024.0);

    (cpu_percent, memory_mb)
}

pub fn start_resource_polling(app_handle: AppHandle) {
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(5));
        loop {
            interval.tick().await;

            let monitor = app_handle.state::<super::ResourceMonitor>();
            let app_manager = app_handle.state::<crate::app_manager::state::AppManager>();
            let config_manager = app_handle.state::<crate::config::manager::ConfigManager>();
            let config = config_manager.get_config();
            let apps = app_manager.apps.lock().expect("apps lock").clone();

            let active_count = apps.values()
                .filter(|r| matches!(r.state, crate::app_manager::state::AppRuntimeState::Active { .. }))
                .count();

            let (total_cpu, total_memory) = if active_count > 0 {
                get_process_tree_resources(&monitor)
            } else {
                (0.0, 0.0)
            };

            let per_app_cpu = if active_count > 0 { total_cpu / active_count as f64 } else { 0.0 };
            let per_app_mem = if active_count > 0 { total_memory / active_count as f64 } else { 0.0 };

            let mut usages = Vec::new();
            for (app_id, runtime) in &apps {
                let app_config = config.apps.iter().find(|a| a.id == *app_id);
                let name = app_config.map(|a| a.name.clone()).unwrap_or_default();
                let (status, cpu, mem) = match &runtime.state {
                    crate::app_manager::state::AppRuntimeState::Active { .. } =>
                        ("active", Some(per_app_cpu), Some(per_app_mem)),
                    crate::app_manager::state::AppRuntimeState::Hibernated { .. } =>
                        ("hibernated", Some(0.0), Some(0.0)),
                    crate::app_manager::state::AppRuntimeState::Disabled =>
                        ("disabled", Some(0.0), Some(0.0)),
                };
                let usage = super::AppResourceUsage {
                    app_id: app_id.clone(),
                    app_name: name,
                    status: status.to_string(),
                    cpu_percent: cpu,
                    memory_mb: mem,
                };
                monitor.update(app_id, usage.clone());
                usages.push(usage);
            }

            let _ = app_handle.emit("resource-usage-updated", &usages);
            check_high_usage_alerts(&app_handle, &usages);
        }
    });
}

fn check_high_usage_alerts(app_handle: &AppHandle, usages: &[super::AppResourceUsage]) {
    let monitor = app_handle.state::<super::ResourceMonitor>();
    let mut alerted = monitor.alerted.lock().expect("resource alerted lock");

    for usage in usages {
        if let Some(cpu) = usage.cpu_percent {
            if cpu > 30.0 {
                let should_alert = match alerted.get(&usage.app_id) {
                    Some(first_seen) => first_seen.elapsed() > std::time::Duration::from_secs(30),
                    None => {
                        alerted.insert(usage.app_id.clone(), std::time::Instant::now());
                        false
                    }
                };

                if should_alert {
                    let _ = app_handle.emit("high-usage-alert", serde_json::json!({
                        "appId": usage.app_id,
                        "appName": usage.app_name,
                        "cpu": cpu,
                    }));
                    alerted.remove(&usage.app_id);
                }
            } else {
                alerted.remove(&usage.app_id);
            }
        }
    }
}
