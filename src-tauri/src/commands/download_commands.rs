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

#[tauri::command]
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

#[tauri::command]
pub fn remove_download(
    download_id: String,
    download_manager: State<'_, DownloadManager>,
) -> Result<(), String> {
    download_manager.remove(&download_id);
    Ok(())
}

#[tauri::command]
pub fn open_download_file(path: String) -> Result<(), String> {
    open::that(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn open_download_folder(path: String) -> Result<(), String> {
    let parent = std::path::Path::new(&path)
        .parent()
        .ok_or("No parent directory")?;
    open::that(parent).map_err(|e| e.to_string())
}
