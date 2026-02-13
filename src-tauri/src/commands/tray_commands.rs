use tauri::{AppHandle, State};
use tauri_plugin_autostart::ManagerExt;

use crate::config::manager::ConfigManager;

#[tauri::command]
pub fn set_launch_at_login(
    enabled: bool,
    app_handle: AppHandle,
    config_manager: State<'_, ConfigManager>,
) -> Result<(), String> {
    let autostart = app_handle.autolaunch();
    if enabled {
        autostart.enable().map_err(|e| e.to_string())?;
    } else {
        autostart.disable().map_err(|e| e.to_string())?;
    }

    let mut config = config_manager.get_config();
    config.general.launch_at_login = enabled;
    config_manager
        .save_config(config)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_launch_at_login(
    config_manager: State<'_, ConfigManager>,
) -> Result<bool, String> {
    Ok(config_manager.get_config().general.launch_at_login)
}
