use tauri::{AppHandle, Emitter, Manager, State};

use crate::config::manager::ConfigManager;
use crate::config::models::{AppConfig, GeneralConfig, OrblyConfig};

#[tauri::command]
pub fn get_config(
    webview: tauri::Webview,
    config_manager: State<'_, ConfigManager>,
) -> Result<OrblyConfig, String> {
    crate::commands::require_main_webview(&webview)?;
    Ok(config_manager.get_config())
}

#[tauri::command]
pub fn get_apps(
    webview: tauri::Webview,
    config_manager: State<'_, ConfigManager>,
) -> Result<Vec<AppConfig>, String> {
    crate::commands::require_main_webview(&webview)?;
    Ok(config_manager.get_config().apps)
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_app(
    app_id: String,
    webview: tauri::Webview,
    config_manager: State<'_, ConfigManager>,
) -> Result<Option<AppConfig>, String> {
    crate::commands::require_main_webview(&webview)?;
    Ok(config_manager.get_app(&app_id))
}

#[tauri::command]
pub fn add_app(
    app: AppConfig,
    webview: tauri::Webview,
    app_handle: AppHandle,
    config_manager: State<'_, ConfigManager>,
) -> Result<(), String> {
    crate::commands::require_main_webview(&webview)?;
    config_manager.add_app(app).map_err(|e| e.to_string())?;
    crate::tray::rebuild_tray_menu(&app_handle);
    Ok(())
}

#[tauri::command]
pub fn update_app(
    app: AppConfig,
    webview: tauri::Webview,
    app_handle: AppHandle,
    config_manager: State<'_, ConfigManager>,
) -> Result<(), String> {
    crate::commands::require_main_webview(&webview)?;
    let old = config_manager.get_app(&app.id);
    config_manager.update_app(app.clone()).map_err(|e| e.to_string())?;
    crate::tray::rebuild_tray_menu(&app_handle);

    // If properties that require webview recreation changed, destroy and recreate
    if let Some(old_app) = old {
        let needs_recreate = old_app.url != app.url
            || old_app.user_agent != app.user_agent
            || old_app.custom_css != app.custom_css
            || old_app.custom_js != app.custom_js
            || old_app.proxy != app.proxy
            || old_app.service_type != app.service_type;

        if needs_recreate {
            if let Some(existing) = app_handle.get_webview(&app.id) {
                let _ = existing.close();
                if let Some(app_manager) = app_handle.try_state::<crate::app_manager::state::AppManager>() {
                    let content_bounds = app_handle.state::<crate::app_manager::state::ContentBounds>();
                    let bounds = content_bounds.get();
                    let position = tauri::LogicalPosition::new(bounds.x, bounds.y);
                    let size = tauri::LogicalSize::new(bounds.width, bounds.height);

                    app_manager.set_state(
                        &app.id,
                        crate::app_manager::state::AppRuntimeState::Loading {
                            target_url: app.url.clone(),
                        },
                    );
                    app_manager.touch_interaction(&app.id);
                    let _ = app_handle.emit("app-state-changed", &app.id);

                    if let Err(e) = crate::app_manager::lifecycle::create_app_webview(&app_handle, &app, position, size) {
                        log::error!("Failed to recreate webview for {}: {}", app.id, e);
                    }
                }
            }
        } else {
            // Apply zoom changes live
            if old_app.zoom_level != app.zoom_level {
                if let Some(wv) = app_handle.get_webview(&app.id) {
                    let scale = app.zoom_level as f64 / 100.0;
                    let _ = wv.set_zoom(scale);
                }
            }
        }
    }

    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub fn remove_app(
    app_id: String,
    delete_data: bool,
    webview: tauri::Webview,
    app_handle: AppHandle,
    config_manager: State<'_, ConfigManager>,
) -> Result<Option<AppConfig>, String> {
    crate::commands::require_main_webview(&webview)?;
    let result = config_manager.remove_app(&app_id).map_err(|e| e.to_string())?;

    // Always close the webview if it exists
    if let Some(webview) = app_handle.get_webview(&app_id) {
        if delete_data {
            let _ = webview.clear_all_browsing_data();
        }
        let _ = webview.close();
    }

    if delete_data {
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
    webview: tauri::Webview,
    app_handle: AppHandle,
    config_manager: State<'_, ConfigManager>,
) -> Result<(), String> {
    crate::commands::require_main_webview(&webview)?;
    let mut config = config_manager.get_config();
    let old_manifest_url = config.general.recipe_manifest_url.clone();
    config.general = general;
    config_manager
        .save_config(config)
        .map_err(|e| e.to_string())?;
    if old_manifest_url != config_manager.get_config().general.recipe_manifest_url {
        if let Some(recipe_manager) = app_handle.try_state::<crate::recipes::RecipeManager>() {
            recipe_manager.set_manifest_url(config_manager.get_config().general.recipe_manifest_url.clone());
        }
    }
    let _ = app_handle.emit("config-updated", ());
    crate::tray::rebuild_tray_menu(&app_handle);
    Ok(())
}

#[tauri::command]
pub fn update_adblock_config(
    adblock: crate::config::models::AdblockConfig,
    webview: tauri::Webview,
    app_handle: AppHandle,
    config_manager: State<'_, ConfigManager>,
) -> Result<(), String> {
    crate::commands::require_main_webview(&webview)?;
    let mut config = config_manager.get_config();
    let old_enabled = config.adblock.enabled;
    config.adblock = adblock;
    let adblock_cfg = config.adblock.clone();
    config_manager
        .save_config(config)
        .map_err(|e| e.to_string())?;

    if let Some(state) = app_handle.try_state::<crate::adblock::engine::AdblockState>() {
        if adblock_cfg.enabled {
            if let Some(rules_text) = state.get_filter_rules_text() {
                state.load_rules(&rules_text, &adblock_cfg.custom_rules);
            }
        } else if old_enabled {
            state.load_rules("", &[]);
        }
    }
    if old_enabled != adblock_cfg.enabled {
        let _ = app_handle.emit("content-rules-updated", ());
    }
    Ok(())
}

#[tauri::command]
pub fn update_downloads_config(
    downloads: crate::config::models::DownloadGlobalConfig,
    webview: tauri::Webview,
    config_manager: State<'_, ConfigManager>,
) -> Result<(), String> {
    crate::commands::require_main_webview(&webview)?;
    let mut config = config_manager.get_config();
    config.downloads = downloads;
    config_manager
        .save_config(config)
        .map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
pub fn update_link_routing_config(
    link_routing: crate::config::models::LinkRoutingConfig,
    webview: tauri::Webview,
    config_manager: State<'_, ConfigManager>,
) -> Result<(), String> {
    crate::commands::require_main_webview(&webview)?;
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
    webview: tauri::Webview,
    app_handle: AppHandle,
    config_manager: State<'_, ConfigManager>,
) -> Result<(), String> {
    crate::commands::require_main_webview(&webview)?;
    let mut config = config_manager.get_config();
    config.shortcuts = shortcuts;
    config_manager.save_config(config).map_err(|e| e.to_string())?;
    let _ = app_handle.emit("shortcuts-updated", ());
    Ok(())
}

#[tauri::command]
pub fn update_workspaces_config(
    workspaces: crate::config::models::WorkspacesConfig,
    webview: tauri::Webview,
    config_manager: State<'_, ConfigManager>,
) -> Result<(), String> {
    crate::commands::require_main_webview(&webview)?;
    let mut config = config_manager.get_config();
    config.workspaces = workspaces;
    config_manager.save_config(config).map_err(|e| e.to_string())
}
