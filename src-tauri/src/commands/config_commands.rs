use tauri::State;

use crate::config::manager::ConfigManager;
use crate::config::models::{AppConfig, GeneralConfig, OrblyConfig};

#[tauri::command]
pub fn get_config(config_manager: State<'_, ConfigManager>) -> Result<OrblyConfig, String> {
    Ok(config_manager.get_config())
}

#[tauri::command]
pub fn get_apps(config_manager: State<'_, ConfigManager>) -> Result<Vec<AppConfig>, String> {
    Ok(config_manager.get_config().apps)
}

#[tauri::command]
pub fn get_app(
    app_id: String,
    config_manager: State<'_, ConfigManager>,
) -> Result<Option<AppConfig>, String> {
    Ok(config_manager.get_app(&app_id))
}

#[tauri::command]
pub fn add_app(
    app: AppConfig,
    config_manager: State<'_, ConfigManager>,
) -> Result<(), String> {
    config_manager.add_app(app).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_app(
    app: AppConfig,
    config_manager: State<'_, ConfigManager>,
) -> Result<(), String> {
    config_manager.update_app(app).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn remove_app(
    app_id: String,
    config_manager: State<'_, ConfigManager>,
) -> Result<Option<AppConfig>, String> {
    config_manager
        .remove_app(&app_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_general_config(
    general: GeneralConfig,
    config_manager: State<'_, ConfigManager>,
) -> Result<(), String> {
    let mut config = config_manager.get_config();
    config.general = general;
    config_manager
        .save_config(config)
        .map_err(|e| e.to_string())
}
