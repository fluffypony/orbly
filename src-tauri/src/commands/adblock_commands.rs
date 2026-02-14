use tauri::{AppHandle, Emitter, Manager, State};

use crate::adblock::engine::AdblockState;
use crate::adblock::filter_lists::FilterListManager;
use crate::config::manager::ConfigManager;

#[tauri::command(rename_all = "snake_case")]
pub fn toggle_adblock(
    app_id: String,
    config_manager: State<'_, ConfigManager>,
) -> Result<bool, String> {
    let mut config = config_manager.get_config();
    let app = config
        .apps
        .iter_mut()
        .find(|a| a.id == app_id)
        .ok_or_else(|| format!("App '{}' not found", app_id))?;

    app.adblock_enabled = !app.adblock_enabled;
    let new_state = app.adblock_enabled;

    config_manager
        .save_config(config)
        .map_err(|e| e.to_string())?;

    Ok(new_state)
}

#[tauri::command(rename_all = "snake_case")]
pub fn get_blocked_count(app_id: String, adblock_state: State<'_, AdblockState>) -> u32 {
    adblock_state.get_blocked_count(&app_id)
}

#[tauri::command]
pub fn update_filter_lists(webview: tauri::Webview, app_handle: AppHandle) -> Result<(), String> {
    crate::commands::require_main_webview(&webview)?;
    let config_manager = app_handle.state::<ConfigManager>();
    let config = config_manager.get_config();

    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    let filter_lists = config.adblock.filter_lists.clone();
    let custom_rules = config.adblock.custom_rules.clone();

    tauri::async_runtime::spawn(async move {
        let manager = FilterListManager::new(app_data_dir);
        match manager.get_filter_rules(&filter_lists, true).await {
            Ok(rules_text) => {
                let adblock_state = app_handle.state::<AdblockState>();
                adblock_state.load_rules(&rules_text, &custom_rules);

                // Update last_updated timestamp
                let config_manager = app_handle.state::<ConfigManager>();
                let mut config = config_manager.get_config();
                config.adblock.last_updated = chrono::Utc::now().to_rfc3339();
                let _ = config_manager.save_config(config);

                log::info!("Filter lists updated successfully");
                let _ = app_handle.emit("filter-lists-updated", ());
                let _ = app_handle.emit("content-rules-updated", ());
            }
            Err(e) => {
                log::error!("Failed to update filter lists: {}", e);
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub fn add_custom_adblock_rule(
    rule: String,
    webview: tauri::Webview,
    config_manager: State<'_, ConfigManager>,
    adblock_state: State<'_, AdblockState>,
) -> Result<(), String> {
    crate::commands::require_main_webview(&webview)?;
    let mut config = config_manager.get_config();
    config.adblock.custom_rules.push(rule);

    config_manager
        .save_config(config.clone())
        .map_err(|e| e.to_string())?;

    // Reload engine with updated custom rules
    let rules_text = adblock_state
        .get_filter_rules_text()
        .unwrap_or_default();
    adblock_state.load_rules(&rules_text, &config.adblock.custom_rules);

    Ok(())
}
