use tauri::{AppHandle, Emitter, Manager, State};

use crate::app_manager::lifecycle;
use crate::app_manager::state::{AppManager, AppRuntimeState};
use crate::resource_monitor::{AppResourceUsage, ResourceMonitor};

#[tauri::command]
pub fn get_resource_usage(
    monitor: State<'_, ResourceMonitor>,
) -> Vec<AppResourceUsage> {
    monitor.get_all()
}

#[tauri::command]
pub fn kill_app(
    app_id: String,
    app_handle: AppHandle,
    app_manager: State<'_, AppManager>,
) -> Result<(), String> {
    let _last_url = lifecycle::destroy_app_webview(&app_handle, &app_id)?;

    let mut apps = app_manager.apps.lock().unwrap();
    if let Some(runtime) = apps.get_mut(&app_id) {
        let url = match &runtime.state {
            AppRuntimeState::Active { current_url } => current_url.clone(),
            AppRuntimeState::Hibernated { last_url } => last_url.clone(),
            _ => String::new(),
        };
        runtime.state = AppRuntimeState::Hibernated { last_url: url };
    }
    drop(apps);

    let _ = app_handle.emit("app-killed", &app_id);
    Ok(())
}
