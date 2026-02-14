use tauri::{AppHandle, Manager, State};

use crate::config::manager::ConfigManager;
use crate::config::models::DarkModeType;
use crate::darkmode::DarkModeManager;

#[tauri::command(rename_all = "snake_case")]
pub fn toggle_dark_mode(
    app_id: String,
    webview: tauri::Webview,
    app_handle: AppHandle,
    config_manager: State<'_, ConfigManager>,
    dark_mode_manager: State<'_, DarkModeManager>,
) -> Result<String, String> {
    crate::commands::require_main_webview(&webview)?;
    let mut config = config_manager.get_config();
    let app = config
        .apps
        .iter_mut()
        .find(|a| a.id == app_id)
        .ok_or("App not found")?;

    // Cycle: off -> dynamic -> filter -> static -> off
    let new_mode = match app.dark_mode {
        DarkModeType::Off => DarkModeType::Dynamic,
        DarkModeType::Dynamic => DarkModeType::Filter,
        DarkModeType::Filter => DarkModeType::Static,
        DarkModeType::Static => DarkModeType::Off,
    };
    app.dark_mode = new_mode.clone();

    let mode_str = match &new_mode {
        DarkModeType::Off => "off",
        DarkModeType::Dynamic => "dynamic",
        DarkModeType::Filter => "filter",
        DarkModeType::Static => "static",
    };

    let brightness = app.dark_mode_brightness;
    let contrast = app.dark_mode_contrast;
    let sepia = app.dark_mode_sepia;
    let bg_color = app.dark_mode_bg_color.clone();
    let text_color = app.dark_mode_text_color.clone();

    config_manager
        .save_config(config)
        .map_err(|e| e.to_string())?;

    // Apply to running webview via eval
    if let Some(webview) = app_handle.get_webview(&app_id) {
        let script = dark_mode_manager.get_apply_script(
            mode_str,
            brightness,
            contrast,
            sepia,
            &bg_color,
            &text_color,
            "",
        );
        let _ = webview.eval(&script);
    }

    Ok(mode_str.to_string())
}

#[tauri::command(rename_all = "snake_case")]
pub fn update_dark_mode_settings(
    app_id: String,
    mode: String,
    brightness: u32,
    contrast: u32,
    sepia: u32,
    bg_color: String,
    text_color: String,
    webview: tauri::Webview,
    app_handle: AppHandle,
    config_manager: State<'_, ConfigManager>,
    dark_mode_manager: State<'_, DarkModeManager>,
) -> Result<(), String> {
    crate::commands::require_main_webview(&webview)?;
    let mut config = config_manager.get_config();
    let app = config
        .apps
        .iter_mut()
        .find(|a| a.id == app_id)
        .ok_or("App not found")?;

    app.dark_mode = match mode.as_str() {
        "dynamic" => DarkModeType::Dynamic,
        "filter" => DarkModeType::Filter,
        "static" => DarkModeType::Static,
        _ => DarkModeType::Off,
    };
    app.dark_mode_brightness = brightness;
    app.dark_mode_contrast = contrast;
    app.dark_mode_sepia = sepia;
    app.dark_mode_bg_color = bg_color.clone();
    app.dark_mode_text_color = text_color.clone();

    config_manager
        .save_config(config)
        .map_err(|e| e.to_string())?;

    // Apply to running webview
    if let Some(webview) = app_handle.get_webview(&app_id) {
        let script = dark_mode_manager.get_apply_script(
            &mode,
            brightness,
            contrast,
            sepia,
            &bg_color,
            &text_color,
            "",
        );
        let _ = webview.eval(&script);
    }

    Ok(())
}
