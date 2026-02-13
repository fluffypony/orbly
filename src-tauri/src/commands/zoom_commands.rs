use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};

use crate::config::manager::ConfigManager;

#[derive(Serialize, Clone)]
struct ZoomChangedPayload {
    #[serde(rename = "appId")]
    app_id: String,
    zoom: u32,
}

fn apply_zoom_to_webview(app_handle: &AppHandle, app_id: &str, zoom: u32) -> Result<(), String> {
    if let Some(webview) = app_handle.get_webview(app_id) {
        let scale = zoom as f64 / 100.0;
        let script = format!("document.body.style.zoom = '{scale}'");
        let _ = webview.eval(&script);
    }
    Ok(())
}

fn set_zoom_inner(
    app_id: &str,
    zoom: u32,
    app_handle: &AppHandle,
    config_manager: &ConfigManager,
) -> Result<(), String> {
    let zoom = zoom.clamp(50, 200);

    let mut config = config_manager.get_config();
    let app = config
        .apps
        .iter_mut()
        .find(|a| a.id == app_id)
        .ok_or("App not found")?;

    app.zoom_level = zoom;

    config_manager
        .save_config(config)
        .map_err(|e| e.to_string())?;

    apply_zoom_to_webview(app_handle, app_id, zoom)?;

    let _ = app_handle.emit(
        "zoom-changed",
        ZoomChangedPayload {
            app_id: app_id.to_string(),
            zoom,
        },
    );

    Ok(())
}

#[tauri::command]
pub fn set_zoom_level(
    app_id: String,
    zoom: u32,
    app_handle: AppHandle,
    config_manager: State<'_, ConfigManager>,
) -> Result<(), String> {
    set_zoom_inner(&app_id, zoom, &app_handle, config_manager.inner())
}

#[tauri::command]
pub fn zoom_in(
    app_id: String,
    app_handle: AppHandle,
    config_manager: State<'_, ConfigManager>,
) -> Result<u32, String> {
    let config = config_manager.get_config();
    let app = config
        .apps
        .iter()
        .find(|a| a.id == app_id)
        .ok_or("App not found")?;

    let new_zoom = (app.zoom_level + 10).min(200);
    set_zoom_inner(&app_id, new_zoom, &app_handle, config_manager.inner())?;
    Ok(new_zoom)
}

#[tauri::command]
pub fn zoom_out(
    app_id: String,
    app_handle: AppHandle,
    config_manager: State<'_, ConfigManager>,
) -> Result<u32, String> {
    let config = config_manager.get_config();
    let app = config
        .apps
        .iter()
        .find(|a| a.id == app_id)
        .ok_or("App not found")?;

    let new_zoom = app.zoom_level.saturating_sub(10).max(50);
    set_zoom_inner(&app_id, new_zoom, &app_handle, config_manager.inner())?;
    Ok(new_zoom)
}

#[tauri::command]
pub fn zoom_reset(
    app_id: String,
    app_handle: AppHandle,
    config_manager: State<'_, ConfigManager>,
) -> Result<(), String> {
    set_zoom_inner(&app_id, 100, &app_handle, config_manager.inner())
}
