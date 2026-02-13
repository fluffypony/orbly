use tauri::{AppHandle, Emitter, Manager, State};

use crate::app_manager::lifecycle;
use crate::app_manager::state::{AppManager, AppRuntimeState};
use crate::config::manager::ConfigManager;

#[derive(serde::Serialize, Clone)]
pub struct AppStateInfo {
    pub id: String,
    pub name: String,
    pub state: String, // "active", "hibernated", "disabled"
    pub badge_count: Option<u32>,
    pub current_url: Option<String>,
}

#[tauri::command]
pub fn get_app_states(
    app_manager: State<'_, AppManager>,
    config_manager: State<'_, ConfigManager>,
) -> Vec<AppStateInfo> {
    let config = config_manager.get_config();
    let apps_lock = app_manager.apps.lock().unwrap();

    config
        .apps
        .iter()
        .map(|app_config| {
            let (state_str, current_url) =
                if let Some(runtime) = apps_lock.get(&app_config.id) {
                    match &runtime.state {
                        AppRuntimeState::Active { current_url } => {
                            ("active".to_string(), Some(current_url.clone()))
                        }
                        AppRuntimeState::Hibernated { last_url } => {
                            ("hibernated".to_string(), Some(last_url.clone()))
                        }
                        AppRuntimeState::Disabled => ("disabled".to_string(), None),
                    }
                } else {
                    ("disabled".to_string(), None)
                };

            let badge_count = apps_lock
                .get(&app_config.id)
                .and_then(|r| r.badge_count);

            AppStateInfo {
                id: app_config.id.clone(),
                name: app_config.name.clone(),
                state: state_str,
                badge_count,
                current_url,
            }
        })
        .collect()
}

#[tauri::command]
pub fn activate_app(
    app_id: String,
    app_handle: AppHandle,
    app_manager: State<'_, AppManager>,
    config_manager: State<'_, ConfigManager>,
) -> Result<(), String> {
    let config = config_manager.get_config();
    let app_config = config
        .apps
        .iter()
        .find(|a| a.id == app_id)
        .ok_or_else(|| format!("App '{}' not found in config", app_id))?
        .clone();

    // Default content area position/size — will be refined by frontend in later phases
    let position = tauri::LogicalPosition::new(56.0, 40.0);
    let size = tauri::LogicalSize::new(1024.0, 680.0);

    // If webview doesn't exist, create it
    if app_handle.get_webview(&app_id).is_none() {
        lifecycle::create_app_webview(&app_handle, &app_config, position, size)?;
    }

    // Hide all other webviews
    let apps_lock = app_manager.apps.lock().unwrap();
    let other_ids: Vec<String> = apps_lock
        .keys()
        .filter(|id| *id != &app_id)
        .cloned()
        .collect();
    drop(apps_lock);

    for other_id in &other_ids {
        let _ = lifecycle::set_webview_visible(&app_handle, other_id, false, None, None);
    }

    // Show this webview
    lifecycle::set_webview_visible(&app_handle, &app_id, true, Some(position), Some(size))?;

    // Update runtime state to Active
    app_manager.set_state(
        &app_id,
        AppRuntimeState::Active {
            current_url: app_config.url.clone(),
        },
    );
    app_manager.touch_interaction(&app_id);

    let _ = app_handle.emit("app-activated", &app_id);

    Ok(())
}

#[tauri::command]
pub fn hibernate_app(
    app_id: String,
    app_handle: AppHandle,
    app_manager: State<'_, AppManager>,
    config_manager: State<'_, ConfigManager>,
) -> Result<(), String> {
    let last_url = lifecycle::destroy_app_webview(&app_handle, &app_id)?;

    let config = config_manager.get_config();
    let fallback_url = config
        .apps
        .iter()
        .find(|a| a.id == app_id)
        .map(|a| a.url.clone())
        .unwrap_or_default();

    let url = last_url.unwrap_or(fallback_url);

    app_manager.set_state(
        &app_id,
        AppRuntimeState::Hibernated {
            last_url: url,
        },
    );

    // Update persisted config
    let mut config = config_manager.get_config();
    if let Some(app) = config.apps.iter_mut().find(|a| a.id == app_id) {
        app.hibernated = true;
    }
    config_manager
        .save_config(config)
        .map_err(|e| e.to_string())?;

    let _ = app_handle.emit("app-hibernated", &app_id);

    Ok(())
}

#[tauri::command]
pub fn disable_app(
    app_id: String,
    app_handle: AppHandle,
    app_manager: State<'_, AppManager>,
    config_manager: State<'_, ConfigManager>,
) -> Result<(), String> {
    let _ = lifecycle::destroy_app_webview(&app_handle, &app_id)?;

    app_manager.set_state(&app_id, AppRuntimeState::Disabled);

    // Update persisted config
    let mut config = config_manager.get_config();
    if let Some(app) = config.apps.iter_mut().find(|a| a.id == app_id) {
        app.enabled = false;
    }
    config_manager
        .save_config(config)
        .map_err(|e| e.to_string())?;

    let _ = app_handle.emit("app-disabled", &app_id);

    Ok(())
}

#[tauri::command]
pub fn enable_app(
    app_id: String,
    app_handle: AppHandle,
    app_manager: State<'_, AppManager>,
    config_manager: State<'_, ConfigManager>,
) -> Result<(), String> {
    // Update persisted config
    let mut config = config_manager.get_config();
    if let Some(app) = config.apps.iter_mut().find(|a| a.id == app_id) {
        app.enabled = true;
        app.hibernated = false;
    }
    config_manager
        .save_config(config.clone())
        .map_err(|e| e.to_string())?;

    let app_config = config
        .apps
        .iter()
        .find(|a| a.id == app_id)
        .ok_or_else(|| format!("App '{}' not found in config", app_id))?
        .clone();

    let position = tauri::LogicalPosition::new(56.0, 40.0);
    let size = tauri::LogicalSize::new(1024.0, 680.0);

    lifecycle::create_app_webview(&app_handle, &app_config, position, size)?;

    app_manager.set_state(
        &app_id,
        AppRuntimeState::Active {
            current_url: app_config.url.clone(),
        },
    );
    app_manager.touch_interaction(&app_id);

    let _ = app_handle.emit("app-enabled", &app_id);

    Ok(())
}

#[tauri::command]
pub fn reload_app(app_id: String, app_handle: AppHandle) -> Result<(), String> {
    if let Some(webview) = app_handle.get_webview(&app_id) {
        webview
            .eval("location.reload()")
            .map_err(|e| format!("Failed to reload webview: {e}"))?;
        Ok(())
    } else {
        Err(format!("Webview '{}' not found", app_id))
    }
}

#[tauri::command]
pub fn notify_app_interaction(
    app_id: String,
    app_manager: State<'_, AppManager>,
) -> Result<(), String> {
    app_manager.touch_interaction(&app_id);
    Ok(())
}
