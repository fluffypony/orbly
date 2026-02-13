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

#[tauri::command]
pub fn update_adblock_config(
    adblock: crate::config::models::AdblockConfig,
    config_manager: State<'_, ConfigManager>,
) -> Result<(), String> {
    let mut config = config_manager.get_config();
    config.adblock = adblock;
    config_manager
        .save_config(config)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_downloads_config(
    downloads: crate::config::models::DownloadGlobalConfig,
    config_manager: State<'_, ConfigManager>,
) -> Result<(), String> {
    let mut config = config_manager.get_config();
    config.downloads = downloads;
    config_manager
        .save_config(config)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_link_routing_config(
    link_routing: crate::config::models::LinkRoutingConfig,
    config_manager: State<'_, ConfigManager>,
) -> Result<(), String> {
    let mut config = config_manager.get_config();
    config.link_routing = link_routing;
    config_manager
        .save_config(config)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn test_link_route(
    url: String,
    config_manager: State<'_, ConfigManager>,
) -> String {
    let config = config_manager.get_config();
    let opts = glob::MatchOptions {
        case_sensitive: false,
        require_literal_separator: false,
        require_literal_leading_dot: false,
    };
    for rule in &config.link_routing.rules {
        if glob::Pattern::new(&rule.pattern)
            .map(|p| p.matches_with(&url, opts))
            .unwrap_or(false)
        {
            return rule.target.clone();
        }
    }
    "external".to_string()
}

#[tauri::command]
pub fn export_config_json(
    config_manager: State<'_, ConfigManager>,
) -> Result<String, String> {
    let config = config_manager.get_config();
    serde_json::to_string_pretty(&config).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn import_config_json(
    json: String,
    config_manager: State<'_, ConfigManager>,
) -> Result<(), String> {
    let config: OrblyConfig = serde_json::from_str(&json).map_err(|e| e.to_string())?;
    config_manager.save_config(config).map_err(|e| e.to_string())
}
