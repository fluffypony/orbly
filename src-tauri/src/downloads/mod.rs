pub mod manager;

pub use manager::{DownloadEntry, DownloadManager, DownloadStatus};

/// Resolve filename conflicts by appending a numeric suffix
pub fn resolve_filename_conflict(path: &std::path::Path) -> std::path::PathBuf {
    if !path.exists() {
        return path.to_path_buf();
    }

    let stem = path
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();
    let ext = path
        .extension()
        .map(|e| format!(".{}", e.to_string_lossy()))
        .unwrap_or_default();
    let parent = path.parent().unwrap_or(path);

    for i in 1..1000 {
        let new_name = format!("{} ({}){}", stem, i, ext);
        let new_path = parent.join(new_name);
        if !new_path.exists() {
            return new_path;
        }
    }

    path.to_path_buf()
}
