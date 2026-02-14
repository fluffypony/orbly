use tauri::{AppHandle, Emitter, Manager, State};

use crate::app_manager::lifecycle;
use crate::app_manager::session_state::SessionState;
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
    webview: tauri::Webview,
    app_handle: AppHandle,
    app_manager: State<'_, AppManager>,
) -> Result<(), String> {
    crate::commands::require_main_webview(&webview)?;
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
            _ => {
                // Error/Crashed states -> move to hibernated
                let url = destroyed_url.unwrap_or_default();
                runtime.state = AppRuntimeState::Hibernated { last_url: url };
            }
        }
    }
    drop(apps);

    // Remove from session state for crash recovery
    if let Some(session_state) = app_handle.try_state::<SessionState>() {
        session_state.remove(&app_id);
    }

    let _ = app_handle.emit("app-killed", &app_id);
    Ok(())
}
