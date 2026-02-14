use tauri::{Manager, State};

use crate::downloads::{DownloadEntry, DownloadManager};

#[tauri::command]
pub fn get_downloads(download_manager: State<'_, DownloadManager>) -> Vec<DownloadEntry> {
    download_manager.get_all()
}

#[tauri::command]
pub fn get_active_download_count(download_manager: State<'_, DownloadManager>) -> usize {
    download_manager.get_active_count()
}

#[tauri::command(rename_all = "snake_case")]
pub fn cancel_download(
    download_id: String,
    download_manager: State<'_, DownloadManager>,
) -> Result<(), String> {
    download_manager.cancel_download(&download_id);
    Ok(())
}

#[tauri::command]
pub fn clear_completed_downloads(
    download_manager: State<'_, DownloadManager>,
) -> Result<(), String> {
    download_manager.clear_completed();
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub fn remove_download(
    download_id: String,
    download_manager: State<'_, DownloadManager>,
) -> Result<(), String> {
    download_manager.remove(&download_id);
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub fn open_download_file(
    download_id: String,
    webview: tauri::Webview,
    download_manager: State<'_, DownloadManager>,
) -> Result<(), String> {
    crate::commands::require_main_webview(&webview)?;
    let downloads = download_manager.get_all();
    let entry = downloads.iter().find(|d| d.id == download_id)
        .ok_or_else(|| "Download not found".to_string())?;

    if !std::path::Path::new(&entry.save_path).exists() {
        return Err("File does not exist".to_string());
    }

    open::that(&entry.save_path).map_err(|e| e.to_string())
}

#[tauri::command(rename_all = "snake_case")]
pub fn open_download_folder(
    download_id: String,
    webview: tauri::Webview,
    download_manager: State<'_, DownloadManager>,
) -> Result<(), String> {
    crate::commands::require_main_webview(&webview)?;
    let downloads = download_manager.get_all();
    let entry = downloads.iter().find(|d| d.id == download_id)
        .ok_or_else(|| "Download not found".to_string())?;

    let parent = std::path::Path::new(&entry.save_path)
        .parent()
        .ok_or("Invalid path")?;
    open::that(parent).map_err(|e| e.to_string())
}

#[derive(serde::Serialize, Clone)]
pub struct RetryInfo {
    pub url: String,
    pub source_app_id: String,
}

#[tauri::command(rename_all = "snake_case")]
pub fn retry_download(
    download_id: String,
    app_handle: tauri::AppHandle,
    download_manager: State<'_, DownloadManager>,
) -> Result<RetryInfo, String> {
    let downloads = download_manager.get_all();
    let entry = downloads.iter().find(|d| d.id == download_id)
        .ok_or_else(|| "Download not found".to_string())?;

    if !matches!(entry.status, crate::downloads::DownloadStatus::Failed { .. }) {
        return Err("Download is not in failed state".to_string());
    }

    let info = RetryInfo {
        url: entry.url.clone(),
        source_app_id: entry.source_app_id.clone(),
    };

    let Some(webview) = app_handle.get_webview(&info.source_app_id) else {
        return Err("Source app webview is not available (hibernated or closed)".to_string());
    };

    if let Some(app_manager) = app_handle.try_state::<crate::app_manager::state::AppManager>() {
        let apps = app_manager.apps.lock().expect("apps lock");
        if let Some(runtime) = apps.get(&info.source_app_id) {
            if !matches!(runtime.state, crate::app_manager::state::AppRuntimeState::Active { .. }) {
                return Err("Source app is not active; wake it before retrying download".to_string());
            }
        }
    }

    // Remove the failed entry
    download_manager.remove(&download_id);

    // Navigate the source app's webview to the download URL to re-trigger
    let js = format!(
        r#"(function() {{
            var a = document.createElement('a');
            a.href = {};
            a.download = '';
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }})();"#,
        serde_json::to_string(&info.url).unwrap_or_default()
    );
    let _ = webview.eval(&js);

    Ok(info)
}
