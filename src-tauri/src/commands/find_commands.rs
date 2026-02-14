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
pub fn get_find_count(
    app_id: String,
    query: String,
    app_handle: AppHandle,
) -> Result<(), String> {
    if let Some(webview) = app_handle.get_webview(&app_id) {
        let query_js = serde_json::to_string(&query).map_err(|e| e.to_string())?;
        // Count matches using case-insensitive indexOf and emit result via invoke
        let script = format!(
            r#"(function() {{
                var q = {};
                if (!q) {{ if (window.__TAURI_INTERNALS__) window.__TAURI_INTERNALS__.invoke('on_find_count', {{ app_id: '{}', count: 0 }}); return; }}
                var text = document.body.innerText || '';
                var lower = text.toLowerCase();
                var search = q.toLowerCase();
                var count = 0;
                var pos = 0;
                while ((pos = lower.indexOf(search, pos)) !== -1) {{ count++; pos += search.length; }}
                if (window.__TAURI_INTERNALS__) window.__TAURI_INTERNALS__.invoke('on_find_count', {{ app_id: '{}', count: count }});
            }})()"#,
            query_js, app_id, app_id
        );
        webview
            .eval(&script)
            .map_err(|e| format!("Failed to count matches: {e}"))?;
        Ok(())
    } else {
        Err(format!("Webview '{}' not found", app_id))
    }
}

#[tauri::command(rename_all = "snake_case")]
pub fn on_find_count(
    app_id: String,
    count: u32,
    app_handle: AppHandle,
) -> Result<(), String> {
    use tauri::Emitter;
    let _ = app_handle.emit("find-count-updated", serde_json::json!({
        "appId": app_id,
        "count": count,
    }));
    Ok(())
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
