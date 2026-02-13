use tauri::{AppHandle, Manager, WebviewUrl};

use crate::config::models::{AppConfig, DarkModeType};
use crate::darkmode::DarkModeManager;

/// Create a new webview for an app with isolated data store
pub fn create_app_webview(
    app_handle: &AppHandle,
    app_config: &AppConfig,
    position: tauri::LogicalPosition<f64>,
    size: tauri::LogicalSize<f64>,
) -> Result<(), String> {
    let main_window = app_handle
        .get_window("main")
        .ok_or("Main window not found")?;

    let url = WebviewUrl::External(
        app_config
            .url
            .parse()
            .map_err(|e| format!("Invalid URL: {e}"))?,
    );

    let mut builder =
        tauri::webview::WebviewBuilder::new(&app_config.id, url)
            .data_store_identifier(app_config.data_store_uuid.into_bytes())
            .auto_resize();

    if !app_config.user_agent.is_empty() {
        builder = builder.user_agent(&app_config.user_agent);
    }

    let init_js = build_initialization_script(app_handle, app_config);
    if !init_js.is_empty() {
        builder = builder.initialization_script(&init_js);
    }

    main_window
        .add_child(
            builder,
            tauri::LogicalPosition::from(position),
            tauri::LogicalSize::from(size),
        )
        .map_err(|e| format!("Failed to create webview: {e}"))?;

    Ok(())
}

/// Destroy an app's webview (used for hibernate and disable).
/// Returns the current URL before destruction if the webview existed.
pub fn destroy_app_webview(
    app_handle: &AppHandle,
    app_id: &str,
) -> Result<Option<String>, String> {
    let current_url = if let Some(webview) = app_handle.get_webview(app_id) {
        let url = webview.url().map(|u| u.to_string()).unwrap_or_default();
        webview
            .close()
            .map_err(|e| format!("Failed to close webview: {e}"))?;
        Some(url)
    } else {
        None
    };
    Ok(current_url)
}

/// Build the initialization script for an app webview.
fn build_initialization_script(app_handle: &AppHandle, app_config: &AppConfig) -> String {
    let mut scripts = Vec::new();

    // Notification interception
    let notification_style = format!("{:?}", app_config.notification_style).to_lowercase();
    scripts.push(crate::notifications::scripts::notification_intercept_script(
        &app_config.id,
        &notification_style,
    ));

    // Badge scraping
    scripts.push(crate::notifications::badge_scripts::badge_scrape_script(
        &app_config.id,
    ));

    // Dark mode injection — always inject the IIFE so runtime toggles work
    if let Some(dm_manager) = app_handle.try_state::<DarkModeManager>() {
        let mode_str = match &app_config.dark_mode {
            DarkModeType::Off => "off",
            DarkModeType::Dynamic => "dynamic",
            DarkModeType::Filter => "filter",
            DarkModeType::Static => "static",
        };
        let dm_script = dm_manager.get_injection_script(
            mode_str,
            app_config.dark_mode_brightness,
            app_config.dark_mode_contrast,
            app_config.dark_mode_sepia,
            &app_config.dark_mode_bg_color,
            &app_config.dark_mode_text_color,
            "",
        );
        if !dm_script.is_empty() {
            scripts.push(dm_script);
        }
    }

    // Custom CSS injection
    if !app_config.custom_css.is_empty() {
        scripts.push(format!(
            r#"(function() {{
                const style = document.createElement('style');
                style.textContent = {};
                document.head.appendChild(style);
            }})();"#,
            serde_json::to_string(&app_config.custom_css).unwrap_or_default()
        ));
    }

    // Custom JS injection (sandboxed — no access to window.__TAURI__)
    if !app_config.custom_js.is_empty() {
        scripts.push(format!(
            r#"(function() {{ {} }})();"#,
            app_config.custom_js
        ));
    }

    scripts.join("\n")
}

/// Show/hide a webview (used for switching active app)
pub fn set_webview_visible(
    app_handle: &AppHandle,
    app_id: &str,
    visible: bool,
    position: Option<tauri::LogicalPosition<f64>>,
    size: Option<tauri::LogicalSize<f64>>,
) -> Result<(), String> {
    if let Some(webview) = app_handle.get_webview(app_id) {
        if visible {
            if let (Some(pos), Some(sz)) = (position, size) {
                webview
                    .set_position(tauri::LogicalPosition::from(pos))
                    .map_err(|e| e.to_string())?;
                webview
                    .set_size(tauri::LogicalSize::from(sz))
                    .map_err(|e| e.to_string())?;
            }
            webview.show().map_err(|e| e.to_string())?;
        } else {
            webview.hide().map_err(|e| e.to_string())?;
        }
        Ok(())
    } else {
        Err(format!("Webview '{}' not found", app_id))
    }
}
