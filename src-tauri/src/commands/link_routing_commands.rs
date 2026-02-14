use tauri::{AppHandle, Emitter, Manager, State};

use crate::config::manager::ConfigManager;

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
    let opts = glob::MatchOptions {
        case_sensitive: false,
        require_literal_separator: false,
        require_literal_leading_dot: false,
    };

    for rule in &config.link_routing.rules {
        if glob::Pattern::new(&rule.pattern)
            .map(|p| p.matches_with(&url, opts))
            .unwrap_or(false)
        {
            if rule.target == "external" {
                let _ = open::that(&url);
                return Ok(());
            }
            // Check if target is an app id
            if config.apps.iter().any(|a| a.id == rule.target) {
                let _ = app_handle.emit("switch-to-app", rule.target.clone());
                return Ok(());
            }
        }
    }

    // Default: open in external browser
    let _ = open::that(&url);
    Ok(())
}
