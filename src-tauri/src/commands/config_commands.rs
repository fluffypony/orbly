use tauri::{AppHandle, Manager, State};

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

#[tauri::command(rename_all = "snake_case")]
pub fn get_app(
    app_id: String,
    config_manager: State<'_, ConfigManager>,
) -> Result<Option<AppConfig>, String> {
    Ok(config_manager.get_app(&app_id))
}

#[tauri::command]
pub fn add_app(
    app: AppConfig,
    app_handle: AppHandle,
    config_manager: State<'_, ConfigManager>,
) -> Result<(), String> {
    config_manager.add_app(app).map_err(|e| e.to_string())?;
    crate::tray::rebuild_tray_menu(&app_handle);
    Ok(())
}

#[tauri::command]
pub fn update_app(
    app: AppConfig,
    app_handle: AppHandle,
    config_manager: State<'_, ConfigManager>,
) -> Result<(), String> {
    config_manager.update_app(app).map_err(|e| e.to_string())?;
    crate::tray::rebuild_tray_menu(&app_handle);
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub fn remove_app(
    app_id: String,
    delete_data: bool,
    app_handle: AppHandle,
    config_manager: State<'_, ConfigManager>,
) -> Result<Option<AppConfig>, String> {
    let result = config_manager.remove_app(&app_id).map_err(|e| e.to_string())?;

    if delete_data {
        // Attempt to close webview if active
        if let Some(webview) = app_handle.get_webview(&app_id) {
            let _ = webview.clear_all_browsing_data();
            let _ = webview.close();
        }
        // Best-effort filesystem cleanup of data store
        if let Some(ref removed_app) = result {
            let data_dir = app_handle
                .path()
                .app_data_dir()
                .ok();
            if let Some(dir) = data_dir {
                let store_dir = dir.join("WebKit").join(removed_app.data_store_uuid.to_string());
                if store_dir.exists() {
                    let _ = std::fs::remove_dir_all(&store_dir);
                    log::info!("Cleaned up data store for app {}", app_id);
                }
            }
        }
    }

    // Remove from runtime state
    if let Some(app_manager) = app_handle.try_state::<crate::app_manager::state::AppManager>() {
        app_manager.remove(&app_id);
    }

    crate::tray::rebuild_tray_menu(&app_handle);
    Ok(result)
}

#[tauri::command]
pub fn update_general_config(
    general: GeneralConfig,
    app_handle: AppHandle,
    config_manager: State<'_, ConfigManager>,
) -> Result<(), String> {
    let mut config = config_manager.get_config();
    config.general = general;
    config_manager
        .save_config(config)
        .map_err(|e| e.to_string())?;
    crate::tray::rebuild_tray_menu(&app_handle);
    Ok(())
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

#[tauri::command(rename_all = "snake_case")]
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
    for rule in &config.link_routing.rules {
        if crate::utils::wildcard_match(&rule.pattern, &url) {
            return rule.target.clone();
        }
    }
    "external".to_string()
}

#[tauri::command]
pub fn export_config_json(
    webview: tauri::Webview,
    config_manager: State<'_, ConfigManager>,
) -> Result<String, String> {
    crate::commands::require_main_webview(&webview)?;
    let config = config_manager.get_config();
    serde_json::to_string_pretty(&config).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn import_config_json(
    json: String,
    webview: tauri::Webview,
    config_manager: State<'_, ConfigManager>,
) -> Result<(), String> {
    crate::commands::require_main_webview(&webview)?;
    let config: OrblyConfig = serde_json::from_str(&json).map_err(|e| e.to_string())?;
    config_manager.save_config(config).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_shortcuts_config(
    shortcuts: crate::config::models::ShortcutConfig,
    config_manager: State<'_, ConfigManager>,
) -> Result<(), String> {
    let mut config = config_manager.get_config();
    config.shortcuts = shortcuts;
    config_manager.save_config(config).map_err(|e| e.to_string())
}
