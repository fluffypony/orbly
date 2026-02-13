use tauri::{AppHandle, Emitter, Manager};

pub fn start_resource_polling(app_handle: AppHandle) {
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(5));
        loop {
            interval.tick().await;

            let monitor = app_handle.state::<super::ResourceMonitor>();
            let app_manager = app_handle.state::<crate::app_manager::state::AppManager>();
            let config_manager = app_handle.state::<crate::config::manager::ConfigManager>();

            let config = config_manager.get_config();
            let apps = app_manager.apps.lock().unwrap().clone();

            let mut usages = Vec::new();

            for (app_id, runtime) in &apps {
                let app_config = config.apps.iter().find(|a| a.id == *app_id);
                let name = app_config.map(|a| a.name.clone()).unwrap_or_default();

                let status = match &runtime.state {
                    crate::app_manager::state::AppRuntimeState::Active { .. } => "active",
                    crate::app_manager::state::AppRuntimeState::Hibernated { .. } => "hibernated",
                    crate::app_manager::state::AppRuntimeState::Disabled => "disabled",
                };

                let (cpu, memory) = get_webview_resources(&app_handle, app_id);

                let usage = super::AppResourceUsage {
                    app_id: app_id.clone(),
                    app_name: name,
                    status: status.to_string(),
                    cpu_percent: cpu,
                    memory_mb: memory,
                };

                monitor.update(app_id, usage.clone());
                usages.push(usage);
            }

            let _ = app_handle.emit("resource-usage-updated", &usages);

            check_high_usage_alerts(&app_handle, &usages);
        }
    });
}

fn get_webview_resources(_app_handle: &AppHandle, _app_id: &str) -> (Option<f64>, Option<f64>) {
    // Per-webview resource attribution is unreliable on macOS (shared WebKit helper processes)
    // and not yet implemented on Windows/Linux.
    // Returns (cpu_percent, memory_mb) - None when attribution is not available.
    (None, None)
}

fn check_high_usage_alerts(app_handle: &AppHandle, usages: &[super::AppResourceUsage]) {
    let monitor = app_handle.state::<super::ResourceMonitor>();
    let mut alerted = monitor.alerted.lock().unwrap();

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
