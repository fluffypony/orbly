use tauri::{AppHandle, Manager};

#[tauri::command(rename_all = "snake_case")]
pub fn find_in_page(
    app_id: String,
    query: String,
    forward: bool,
    app_handle: AppHandle,
) -> Result<(), String> {
    if let Some(webview) = app_handle.get_webview(&app_id) {
        let query_js = serde_json::to_string(&query).map_err(|e| e.to_string())?;
        let backwards = if forward { "false" } else { "true" };
        let script = format!(
            "window.find({}, false, {}, true, false, true, false)",
            query_js, backwards
        );
        webview
            .eval(&script)
            .map_err(|e| format!("Failed to find in page: {e}"))?;
        Ok(())
    } else {
        Err(format!("Webview '{}' not found", app_id))
    }
}

#[tauri::command(rename_all = "snake_case")]
pub fn clear_find_in_page(app_id: String, app_handle: AppHandle) -> Result<(), String> {
    if let Some(webview) = app_handle.get_webview(&app_id) {
        webview
            .eval("window.getSelection().removeAllRanges()")
            .map_err(|e| format!("Failed to clear find selection: {e}"))?;
        Ok(())
    } else {
        Err(format!("Webview '{}' not found", app_id))
    }
}
