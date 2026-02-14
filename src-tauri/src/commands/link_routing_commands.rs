use tauri::{AppHandle, Emitter, Manager, State};

use crate::app_manager::state::AppManager;
use crate::config::manager::ConfigManager;
use crate::utils::wildcard_match;

#[tauri::command(rename_all = "snake_case")]
pub fn route_link(
    url: String,
    source_app_id: String,
    app_handle: AppHandle,
    config_manager: State<'_, ConfigManager>,
) -> Result<(), String> {
    let parsed = match url::Url::parse(&url) {
        Ok(u) => u,
        Err(_) => return Err("Invalid URL".to_string()),
    };

    // Only allow http/https
    match parsed.scheme() {
        "http" | "https" => {}
        _ => return Err(format!("Scheme '{}' is not allowed", parsed.scheme())),
    }

    let config = config_manager.get_config();

    for rule in &config.link_routing.rules {
        if wildcard_match(&rule.pattern, &url)
        {
            if rule.target == "external" {
                let _ = open::that(&url);
                return Ok(());
            }
            // Check if target is an app id
            if config.apps.iter().any(|a| a.id == rule.target) {
                // If target is a different app, activate it
                if rule.target != source_app_id {
                    // Check if the app has a webview; if not, it may be hibernated
                    if app_handle.get_webview(&rule.target).is_none() {
                        // Queue the URL for navigation after the app wakes
                        if let Some(am) = app_handle.try_state::<AppManager>() {
                            am.set_pending_navigation(&rule.target, url.clone());
                        }
                        let _ = app_handle.emit("switch-to-app", rule.target.clone());
                        log::info!("Target app {} is not active; queued URL for post-activation nav", rule.target);
                        return Ok(());
                    }
                }
                // Navigate the target app's webview to this URL
                if let Some(webview) = app_handle.get_webview(&rule.target) {
                    let nav_js = format!(
                        "window.location.href = {};",
                        serde_json::to_string(&url).unwrap_or_default()
                    );
                    let _ = webview.eval(&nav_js);
                }
                if rule.target != source_app_id {
                    let _ = app_handle.emit("switch-to-app", rule.target.clone());
                }
                return Ok(());
            }
        }
    }

    // Default: open in external browser
    let _ = open::that(&url);
    Ok(())
}
