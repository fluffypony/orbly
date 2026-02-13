use tauri::State;

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
