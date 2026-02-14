use tauri::{AppHandle, Emitter, Manager, State};

use crate::app_manager::certificate::CertificateExceptions;
use crate::app_manager::lifecycle;
use crate::app_manager::session_state::SessionState;
use crate::app_manager::state::{AppManager, AppRuntimeState, ContentBounds};
use crate::config::manager::ConfigManager;

#[derive(serde::Serialize, Clone)]
pub struct AppStateInfo {
    pub id: String,
    pub name: String,
    pub state: String, // "active", "hibernated", "disabled"
    pub badge_count: Option<i32>,
    pub current_url: Option<String>,
    pub error_message: Option<String>,
}

#[tauri::command]
pub fn get_app_states(
    app_manager: State<'_, AppManager>,
    config_manager: State<'_, ConfigManager>,
) -> Vec<AppStateInfo> {
    let config = config_manager.get_config();
    let apps_lock = app_manager.apps.lock().expect("apps lock");

    config
        .apps
        .iter()
        .map(|app_config| {
            let (state_str, current_url, error_message) =
                if let Some(runtime) = apps_lock.get(&app_config.id) {
                    match &runtime.state {
                        AppRuntimeState::Loading { target_url } => {
                            ("loading".to_string(), Some(target_url.clone()), None)
                        }
                        AppRuntimeState::Active { current_url } => {
                            ("active".to_string(), Some(current_url.clone()), None)
                        }
                        AppRuntimeState::Hibernated { last_url } => {
                            ("hibernated".to_string(), Some(last_url.clone()), None)
                        }
                        AppRuntimeState::Disabled => ("disabled".to_string(), None, None),
                        AppRuntimeState::Error { message } => {
                            ("error".to_string(), None, Some(message.clone()))
                        }
                        AppRuntimeState::Crashed => ("crashed".to_string(), None, None),
                    }
                } else {
                    ("disabled".to_string(), None, None)
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
                error_message,
            }
        })
        .collect()
}

#[tauri::command(rename_all = "snake_case")]
pub async fn activate_app(
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

    // Determine the URL to load: preserve current URL if active, use last_url if hibernated
    let load_url = {
        let apps_lock = app_manager.apps.lock().expect("apps lock");
        if let Some(runtime) = apps_lock.get(&app_id) {
            match &runtime.state {
                AppRuntimeState::Active { current_url } => current_url.clone(),
                AppRuntimeState::Hibernated { last_url } => last_url.clone(),
                _ => app_config.url.clone(),
            }
        } else {
            app_config.url.clone()
        }
    };

    // If webview doesn't exist, create it with the appropriate URL
    let is_new_webview = app_handle.get_webview(&app_id).is_none();
    if is_new_webview {
        // Set Loading state before creating webview so UI shows spinner
        app_manager.set_state(
            &app_id,
            AppRuntimeState::Loading {
                target_url: load_url.clone(),
            },
        );
        let _ = app_handle.emit("app-state-changed", &app_id);

        let mut wake_config = app_config.clone();
        wake_config.url = load_url.clone();
        lifecycle::create_app_webview(&app_handle, &wake_config, position, size)?;
    }

    // Hide all other webviews
    let apps_lock = app_manager.apps.lock().expect("apps lock");
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

    // For new webviews, keep Loading state until on_url_changed fires.
    // For existing webviews, set Active immediately.
    if !is_new_webview {
        app_manager.set_state(
            &app_id,
            AppRuntimeState::Active {
                current_url: load_url.clone(),
            },
        );
    }
    app_manager.touch_interaction(&app_id);

    // Track active app for crash recovery
    if let Some(session_state) = app_handle.try_state::<SessionState>() {
        session_state.set_active(&app_id, &load_url);
    }

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

#[tauri::command(rename_all = "snake_case")]
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

    // Remove from session state for crash recovery
    if let Some(session_state) = app_handle.try_state::<SessionState>() {
        session_state.remove(&app_id);
    }

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

#[tauri::command(rename_all = "snake_case")]
pub fn disable_app(
    app_id: String,
    app_handle: AppHandle,
    app_manager: State<'_, AppManager>,
    config_manager: State<'_, ConfigManager>,
) -> Result<(), String> {
    let _ = lifecycle::destroy_app_webview(&app_handle, &app_id)?;

    app_manager.set_state(&app_id, AppRuntimeState::Disabled);

    // Remove from session state for crash recovery
    if let Some(session_state) = app_handle.try_state::<SessionState>() {
        session_state.remove(&app_id);
    }

    // Update persisted config
    let mut config = config_manager.get_config();
    if let Some(app) = config.apps.iter_mut().find(|a| a.id == app_id) {
        app.enabled = false;
    }
    config_manager
        .save_config(config)
        .map_err(|e| e.to_string())?;

    let _ = app_handle.emit("app-disabled", &app_id);
    crate::tray::rebuild_tray_menu(&app_handle);

    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub async fn enable_app(
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
    crate::tray::rebuild_tray_menu(&app_handle);

    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
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

#[tauri::command(rename_all = "snake_case")]
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

    let apps_lock = app_manager.apps.lock().expect("apps lock");
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

#[tauri::command(rename_all = "snake_case")]
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

#[tauri::command(rename_all = "snake_case")]
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

#[tauri::command(rename_all = "snake_case")]
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
pub async fn frontend_ready(
    app_handle: AppHandle,
    config_manager: State<'_, ConfigManager>,
    app_manager: State<'_, AppManager>,
    content_bounds: State<'_, ContentBounds>,
) -> Result<(), String> {
    let config = config_manager.get_config();

    // Check for previous session (crash recovery)
    let previous_session = if let Some(session_state) = app_handle.try_state::<SessionState>() {
        session_state.get_previous_session()
    } else {
        std::collections::HashMap::new()
    };

    let bounds = content_bounds.get();

    let position = tauri::LogicalPosition::new(bounds.x, bounds.y);
    let size = tauri::LogicalSize::new(bounds.width, bounds.height);

    let mut first_active_id: Option<String> = None;
    let mut created_ids: Vec<String> = Vec::new();

    // Create webviews for all enabled, non-hibernated apps
    for app_config in &config.apps {
        if app_config.enabled && !app_config.hibernated {
            if app_handle.get_webview(&app_config.id).is_none() {
                let mut wake_config = app_config.clone();
                if let Some(recovered_url) = previous_session.get(&app_config.id) {
                    if !recovered_url.is_empty() {
                        wake_config.url = recovered_url.clone();
                    }
                }
                if let Err(e) = lifecycle::create_app_webview(&app_handle, &wake_config, position, size) {
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

    // Clear session state after successful restore
    if let Some(session_state) = app_handle.try_state::<SessionState>() {
        session_state.clear();
    }

    // Emit session recovery notification
    if !previous_session.is_empty() {
        let _ = app_handle.emit("session-recovered", previous_session.len());
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
            let url = previous_session.get(first_id).cloned().unwrap_or_else(|| app_config.url.clone());
            app_manager.set_state(
                first_id,
                AppRuntimeState::Active {
                    current_url: url,
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
                let url = previous_session.get(id).cloned().unwrap_or_else(|| app_config.url.clone());
                app_manager.set_state(
                    id,
                    AppRuntimeState::Active {
                        current_url: url,
                    },
                );
            }
        }
    }

    // Aggregate badge counts on startup for tray badge
    {
        let apps_lock = app_manager.apps.lock().expect("apps lock");
        let total: u32 = apps_lock.values()
            .filter_map(|a| a.badge_count)
            .filter(|c| *c > 0)
            .map(|c| c as u32)
            .sum();
        drop(apps_lock);
        crate::tray::update_tray_badge(&app_handle, total);
    }

    Ok(())
}

#[tauri::command]
pub fn open_in_external_browser(url: String) -> Result<(), String> {
    let parsed = url::Url::parse(&url).map_err(|_| "Invalid URL".to_string())?;
    match parsed.scheme() {
        "http" | "https" | "mailto" => {}
        _ => return Err(format!("Scheme '{}' is not allowed", parsed.scheme())),
    }
    open::that(&url).map_err(|e| format!("Failed to open URL: {e}"))
}

#[tauri::command]
pub fn accept_certificate_exception(
    host: String,
    days: Option<i64>,
    cert_exceptions: State<'_, CertificateExceptions>,
) -> Result<(), String> {
    cert_exceptions.add_exception(&host, days.unwrap_or(30));
    Ok(())
}

#[tauri::command]
pub fn get_certificate_exceptions(
    cert_exceptions: State<'_, CertificateExceptions>,
) -> Vec<(String, String)> {
    cert_exceptions.get_all()
}

#[tauri::command(rename_all = "snake_case")]
pub fn on_url_changed(
    app_id: String,
    url: String,
    app_handle: AppHandle,
    app_manager: State<'_, AppManager>,
    adblock_state: State<'_, crate::adblock::engine::AdblockState>,
    config_manager: State<'_, crate::config::manager::ConfigManager>,
) -> Result<(), String> {
    app_manager.set_state(
        &app_id,
        AppRuntimeState::Active {
            current_url: url.clone(),
        },
    );
    let _ = app_handle.emit("url-changed", serde_json::json!({
        "appId": app_id,
        "url": url,
    }));

    // Update cosmetic filters for the new URL
    let config = config_manager.get_config();
    if let Some(app_config) = config.apps.iter().find(|a| a.id == app_id) {
        if app_config.adblock_enabled {
            let cosmetic_css = adblock_state.get_cosmetic_filters(&url);
            if let Some(webview) = app_handle.get_webview(&app_id) {
                let css_content = if !cosmetic_css.is_empty() {
                    let css_string = cosmetic_css.join("\n");
                    serde_json::to_string(&css_string).unwrap_or_default()
                } else {
                    "''".to_string()
                };
                let script = format!(
                    r#"(function() {{
                        var el = document.getElementById('__orbly_adblock_cosmetic__');
                        if (!el) {{
                            el = document.createElement('style');
                            el.id = '__orbly_adblock_cosmetic__';
                            (document.head || document.documentElement).appendChild(el);
                        }}
                        el.textContent = {};
                    }})();"#,
                    css_content
                );
                let _ = webview.eval(&script);
            }
        }
    }

    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub fn eval_in_app(
    app_id: String,
    script: String,
    app_handle: AppHandle,
) -> Result<(), String> {
    if let Some(webview) = app_handle.get_webview(&app_id) {
        webview
            .eval(&script)
            .map_err(|e| format!("Failed to eval script: {e}"))?;
        Ok(())
    } else {
        Err(format!("Webview '{}' not found", app_id))
    }
}

#[tauri::command(rename_all = "snake_case")]
pub fn check_unsaved_work(
    app_id: String,
    app_handle: AppHandle,
) -> Result<bool, String> {
    if let Some(app_manager) = app_handle.try_state::<crate::app_manager::state::AppManager>() {
        let apps = app_manager.apps.lock().expect("apps lock");
        if let Some(runtime) = apps.get(&app_id) {
            return Ok(runtime.has_unsaved_work);
        }
    }
    Ok(false)
}

#[tauri::command(rename_all = "snake_case")]
pub fn set_has_unsaved_work(
    app_id: String,
    has_unsaved: bool,
    app_manager: State<'_, crate::app_manager::state::AppManager>,
) -> Result<(), String> {
    let mut apps = app_manager.apps.lock().expect("apps lock");
    if let Some(runtime) = apps.get_mut(&app_id) {
        runtime.has_unsaved_work = has_unsaved;
    }
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub fn remove_certificate_exception(
    host: String,
    cert_exceptions: State<'_, CertificateExceptions>,
) -> Result<(), String> {
    cert_exceptions.remove_exception(&host);
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub fn on_page_load_error(
    app_id: String,
    message: String,
    app_handle: AppHandle,
    app_manager: State<'_, crate::app_manager::state::AppManager>,
) -> Result<(), String> {
    app_manager.set_state(
        &app_id,
        AppRuntimeState::Error {
            message: message.clone(),
        },
    );
    let _ = app_handle.emit(
        "app-error",
        serde_json::json!({ "appId": app_id, "message": message }),
    );
    Ok(())
}
