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
    let mut mode_str: Option<String> = None;
    let mut brightness = 100;
    let mut contrast = 100;
    let mut sepia = 0;
    let mut bg_color = String::new();
    let mut text_color = String::new();
    let mut custom_css = String::new();
    config_manager
        .update_with(|config| {
            if let Some(app) = config.apps.iter_mut().find(|a| a.id == app_id) {
                // Cycle: off -> dynamic -> filter -> static -> off
                app.dark_mode = match app.dark_mode {
                    DarkModeType::Off => DarkModeType::Dynamic,
                    DarkModeType::Dynamic => DarkModeType::Filter,
                    DarkModeType::Filter => DarkModeType::Static,
                    DarkModeType::Static => DarkModeType::Off,
                };
                mode_str = Some(match app.dark_mode {
                    DarkModeType::Off => "off".to_string(),
                    DarkModeType::Dynamic => "dynamic".to_string(),
                    DarkModeType::Filter => "filter".to_string(),
                    DarkModeType::Static => "static".to_string(),
                });
                brightness = app.dark_mode_brightness;
                contrast = app.dark_mode_contrast;
                sepia = app.dark_mode_sepia;
                bg_color = app.dark_mode_bg_color.clone();
                text_color = app.dark_mode_text_color.clone();
                custom_css = app.dark_mode_custom_css.clone();
            }
        })
        .map_err(|e| e.to_string())?;
    let mode_str = mode_str.ok_or("App not found")?;

    // Apply to running webview via eval
    if let Some(webview) = app_handle.get_webview(&app_id) {
        let script = dark_mode_manager.get_apply_script(
            &mode_str,
            brightness,
            contrast,
            sepia,
            &bg_color,
            &text_color,
            &custom_css,
        );
        let _ = webview.eval(&script);
    }

    Ok(mode_str)
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
    let mut found = false;
    config_manager
        .update_with(|config| {
            if let Some(app) = config.apps.iter_mut().find(|a| a.id == app_id) {
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
                found = true;
            }
        })
        .map_err(|e| e.to_string())?;
    if !found {
        return Err("App not found".to_string());
    }

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
