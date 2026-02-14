use tauri::State;

use crate::config::manager::ConfigManager;

/// Returns a list of user agent presets as (label, ua_string) pairs.
/// An empty ua_string means "use system default".
/// The frontend adds its own "Custom" option for free-form input.
#[tauri::command]
pub fn get_ua_presets() -> Vec<(String, String)> {
    vec![
        ("Default".to_string(), String::new()),
        ("Chrome".to_string(), "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36".to_string()),
        ("Firefox".to_string(), "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:138.0) Gecko/20100101 Firefox/138.0".to_string()),
        ("Safari".to_string(), "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Safari/605.1.15".to_string()),
        ("Mobile Safari".to_string(), "Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Mobile/15E148 Safari/604.1".to_string()),
    ]
}

#[tauri::command(rename_all = "snake_case")]
pub fn set_user_agent(
    app_id: String,
    user_agent: String,
    config_manager: State<'_, ConfigManager>,
) -> Result<(), String> {
    let mut config = config_manager.get_config();
    if let Some(app) = config.apps.iter_mut().find(|a| a.id == app_id) {
        app.user_agent = user_agent;
    } else {
        return Err(format!("App '{}' not found", app_id));
    }
    config_manager
        .save_config(config)
        .map_err(|e| e.to_string())
}
