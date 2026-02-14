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
    let _destroyed_url = lifecycle::destroy_app_webview(&app_handle, &app_id)?;

    app_manager.set_state(&app_id, AppRuntimeState::Crashed);

    // Remove from session state for crash recovery
    if let Some(session_state) = app_handle.try_state::<SessionState>() {
        session_state.remove(&app_id);
    }

    let _ = app_handle.emit("app-crashed", &app_id);
    Ok(())
}
