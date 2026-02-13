use tauri::{AppHandle, Emitter, State};

use crate::app_manager::lifecycle;
use crate::app_manager::state::{AppManager, AppRuntimeState};
use crate::resource_monitor::{AppResourceUsage, ResourceMonitor};

#[tauri::command]
pub fn get_resource_usage(
    monitor: State<'_, ResourceMonitor>,
) -> Vec<AppResourceUsage> {
    monitor.get_all()
}

#[tauri::command(rename_all = "snake_case")]
pub fn kill_app(
    app_id: String,
    app_handle: AppHandle,
    app_manager: State<'_, AppManager>,
) -> Result<(), String> {
    let destroyed_url = lifecycle::destroy_app_webview(&app_handle, &app_id)?;

    let mut apps = app_manager.apps.lock().expect("apps lock");
    if let Some(runtime) = apps.get_mut(&app_id) {
        match &runtime.state {
            AppRuntimeState::Active { current_url } => {
                let url = destroyed_url.unwrap_or_else(|| current_url.clone());
                runtime.state = AppRuntimeState::Hibernated { last_url: url };
            }
            AppRuntimeState::Hibernated { .. } => {
                // Already hibernated, no state change needed
            }
            AppRuntimeState::Disabled => {
                // Disabled apps should stay disabled
            }
        }
    }
    drop(apps);

    let _ = app_handle.emit("app-killed", &app_id);
    Ok(())
}
