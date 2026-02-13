use tauri::{AppHandle, Emitter, Manager, State};

use crate::app_manager::lifecycle;
use crate::app_manager::state::{AppManager, AppRuntimeState, ContentBounds};
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
    content_bounds: State<'_, ContentBounds>,
) -> Result<(), String> {
    let mut config = config_manager.get_config();
    let app_config = config
        .apps
        .iter()
        .find(|a| a.id == app_id)
        .ok_or_else(|| format!("App '{}' not found in config", app_id))?
        .clone();

    if !app_config.enabled {
        return Err(format!("App '{}' is disabled; enable it first", app_id));
    }

    let bounds = content_bounds.get();
    let position = tauri::LogicalPosition::new(bounds.x, bounds.y);
    let size = tauri::LogicalSize::new(bounds.width, bounds.height);

    // Determine the URL to load: use last_url from hibernated state if available
    let load_url = {
        let apps_lock = app_manager.apps.lock().unwrap();
        if let Some(runtime) = apps_lock.get(&app_id) {
            match &runtime.state {
                AppRuntimeState::Hibernated { last_url } => last_url.clone(),
                _ => app_config.url.clone(),
            }
        } else {
            app_config.url.clone()
        }
    };

    // If webview doesn't exist, create it with the appropriate URL
    if app_handle.get_webview(&app_id).is_none() {
        let mut wake_config = app_config.clone();
        wake_config.url = load_url.clone();
        lifecycle::create_app_webview(&app_handle, &wake_config, position, size)?;
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
            current_url: load_url,
        },
    );
    app_manager.touch_interaction(&app_id);

    // Clear persisted hibernated flag
    if app_config.hibernated {
        if let Some(app) = config.apps.iter_mut().find(|a| a.id == app_id) {
            app.hibernated = false;
        }
        let _ = config_manager.save_config(config);
    }

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
    content_bounds: State<'_, ContentBounds>,
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

    // Only create webview if it doesn't already exist
    if app_handle.get_webview(&app_id).is_none() {
        let bounds = content_bounds.get();
        let position = tauri::LogicalPosition::new(bounds.x, bounds.y);
        let size = tauri::LogicalSize::new(bounds.width, bounds.height);
        lifecycle::create_app_webview(&app_handle, &app_config, position, size)?;
    }

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

#[tauri::command]
pub fn set_content_area_bounds(
    x: f64,
    y: f64,
    width: f64,
    height: f64,
    app_handle: AppHandle,
    content_bounds: State<'_, ContentBounds>,
    app_manager: State<'_, AppManager>,
) -> Result<(), String> {
    content_bounds.set(x, y, width, height);

    // Reposition all existing webviews (active ones) without changing visibility
    let position = tauri::LogicalPosition::new(x, y);
    let size = tauri::LogicalSize::new(width, height);

    let apps_lock = app_manager.apps.lock().unwrap();
    for (app_id, runtime) in apps_lock.iter() {
        if let AppRuntimeState::Active { .. } = &runtime.state {
            if let Some(webview) = app_handle.get_webview(app_id) {
                let _ = webview.set_position(tauri::LogicalPosition::from(position));
                let _ = webview.set_size(tauri::LogicalSize::from(size));
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub fn navigate_back(app_id: String, app_handle: AppHandle) -> Result<(), String> {
    if let Some(webview) = app_handle.get_webview(&app_id) {
        webview
            .eval("history.back()")
            .map_err(|e| format!("Failed to navigate back: {e}"))?;
        Ok(())
    } else {
        Err(format!("Webview '{}' not found", app_id))
    }
}

#[tauri::command]
pub fn navigate_forward(app_id: String, app_handle: AppHandle) -> Result<(), String> {
    if let Some(webview) = app_handle.get_webview(&app_id) {
        webview
            .eval("history.forward()")
            .map_err(|e| format!("Failed to navigate forward: {e}"))?;
        Ok(())
    } else {
        Err(format!("Webview '{}' not found", app_id))
    }
}

#[tauri::command]
pub fn get_current_url(app_id: String, app_handle: AppHandle) -> Result<String, String> {
    if let Some(webview) = app_handle.get_webview(&app_id) {
        webview
            .url()
            .map(|u| u.to_string())
            .map_err(|e| format!("Failed to get URL: {e}"))
    } else {
        Err(format!("Webview '{}' not found", app_id))
    }
}

#[tauri::command]
pub fn frontend_ready(
    app_handle: AppHandle,
    config_manager: State<'_, ConfigManager>,
    app_manager: State<'_, AppManager>,
    content_bounds: State<'_, ContentBounds>,
) -> Result<(), String> {
    let config = config_manager.get_config();
    let bounds = content_bounds.get();

    let position = tauri::LogicalPosition::new(bounds.x, bounds.y);
    let size = tauri::LogicalSize::new(bounds.width, bounds.height);

    let mut first_active_id: Option<String> = None;
    let mut created_ids: Vec<String> = Vec::new();

    // Create webviews for all enabled, non-hibernated apps
    for app_config in &config.apps {
        if app_config.enabled && !app_config.hibernated {
            if app_handle.get_webview(&app_config.id).is_none() {
                if let Err(e) = lifecycle::create_app_webview(&app_handle, app_config, position, size) {
                    log::error!("Failed to create webview for {}: {}", app_config.id, e);
                    continue;
                }
            }
            created_ids.push(app_config.id.clone());

            if first_active_id.is_none() {
                first_active_id = Some(app_config.id.clone());
            }
        }
    }

    // Hide all webviews initially
    for id in &created_ids {
        let _ = lifecycle::set_webview_visible(&app_handle, id, false, None, None);
    }

    // Show only the first active app
    if let Some(ref first_id) = first_active_id {
        let _ = lifecycle::set_webview_visible(&app_handle, first_id, true, Some(position), Some(size));

        // Update runtime state
        if let Some(app_config) = config.apps.iter().find(|a| a.id == *first_id) {
            app_manager.set_state(
                first_id,
                AppRuntimeState::Active {
                    current_url: app_config.url.clone(),
                },
            );
            app_manager.touch_interaction(first_id);
        }

        let _ = app_handle.emit("app-activated", first_id.as_str());
    }

    // Update state for other created apps
    for id in &created_ids {
        if Some(id) != first_active_id.as_ref() {
            if let Some(app_config) = config.apps.iter().find(|a| a.id == *id) {
                app_manager.set_state(
                    id,
                    AppRuntimeState::Active {
                        current_url: app_config.url.clone(),
                    },
                );
            }
        }
    }

    Ok(())
}
