#[tauri::command]
pub fn open_share_sheet_placeholder() -> Result<(), String> {
    // Share Sheet integration requires a separate macOS Share Extension target in Swift.
    Err("Share Sheet integration is planned for v1.5 and requires native Swift extension targets".into())
}

#[tauri::command]
pub fn run_shortcut_intent_placeholder() -> Result<(), String> {
    // Shortcuts/Automator integration requires Apple's App Intents framework via Swift bridging.
    Err("Shortcuts integration is planned for v1.5 and requires App Intents in Swift".into())
}

#[tauri::command]
pub fn apply_focus_filter_placeholder() -> Result<(), String> {
    // Focus Filters require SetFocusFilterIntent with native Swift/App Intents integration.
    Err("Focus Filters are planned for v1.5 and require Swift SetFocusFilterIntent bridging".into())
}
