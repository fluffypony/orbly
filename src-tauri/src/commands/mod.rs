pub mod adblock_commands;
pub mod app_lifecycle_commands;
pub mod audio_commands;
pub mod config_commands;
pub mod darkmode_commands;
pub mod download_commands;
pub mod find_commands;
pub mod recipe_commands;
pub mod resource_commands;
pub mod tray_commands;
pub mod useragent_commands;
pub mod workspace_commands;
pub mod zoom_commands;

/// Check that a command is being invoked from the main UI webview.
/// Returns Err if the caller is an untrusted child webview.
pub fn require_main_webview(webview: &tauri::Webview) -> Result<(), String> {
    if webview.label() != "main" {
        Err("Access denied: this command can only be called from the main UI".to_string())
    } else {
        Ok(())
    }
}
