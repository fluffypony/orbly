use serde::{Deserialize, Serialize};
use std::sync::Mutex;

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(tag = "type", content = "data")]
pub enum DownloadStatus {
    Downloading { progress: f64 },
    Complete,
    Failed { error: String },
    Cancelled,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DownloadEntry {
    pub id: String,
    pub filename: String,
    pub source_app_id: String,
    pub source_app_name: String,
    pub url: String,
    pub save_path: String,
    pub size_bytes: Option<u64>,
    pub status: DownloadStatus,
    pub created_at: String,
}

pub struct DownloadManager {
    downloads: Mutex<Vec<DownloadEntry>>,
}

#[allow(dead_code)]
impl DownloadManager {
    pub fn new() -> Self {
        Self {
            downloads: Mutex::new(Vec::new()),
        }
    }

    pub fn add_download(&self, entry: DownloadEntry) -> String {
        let id = entry.id.clone();
        self.downloads.lock().expect("downloads lock").push(entry);
        id
    }

    pub fn update_progress(&self, id: &str, progress: f64) {
        let mut downloads = self.downloads.lock().expect("downloads lock");
        if let Some(entry) = downloads.iter_mut().find(|d| d.id == id) {
            entry.status = DownloadStatus::Downloading {
                progress: progress.clamp(0.0, 1.0),
            };
        }
    }

    pub fn complete_download(&self, id: &str) {
        let mut downloads = self.downloads.lock().expect("downloads lock");
        if let Some(entry) = downloads.iter_mut().find(|d| d.id == id) {
            entry.status = DownloadStatus::Complete;
        }
    }

    pub fn fail_download(&self, id: &str, error: String) {
        let mut downloads = self.downloads.lock().expect("downloads lock");
        if let Some(entry) = downloads.iter_mut().find(|d| d.id == id) {
            entry.status = DownloadStatus::Failed { error };
        }
    }

    pub fn cancel_download(&self, id: &str) {
        let mut downloads = self.downloads.lock().expect("downloads lock");
        if let Some(entry) = downloads.iter_mut().find(|d| d.id == id) {
            entry.status = DownloadStatus::Cancelled;
        }
    }

    pub fn get_all(&self) -> Vec<DownloadEntry> {
        self.downloads.lock().expect("downloads lock").clone()
    }

    pub fn get_active_count(&self) -> usize {
        self.downloads
            .lock()
            .expect("downloads lock")
            .iter()
            .filter(|d| matches!(d.status, DownloadStatus::Downloading { .. }))
            .count()
    }

    pub fn clear_completed(&self) {
        let mut downloads = self.downloads.lock().expect("downloads lock");
        downloads.retain(|d| !matches!(d.status, DownloadStatus::Complete));
    }

    pub fn remove(&self, id: &str) {
        let mut downloads = self.downloads.lock().expect("downloads lock");
        downloads.retain(|d| d.id != id);
    }

    /// Find a download entry by URL (used to locate the entry when a download finishes)
    pub fn find_by_url(&self, url: &str) -> Option<String> {
        self.downloads
            .lock()
            .expect("downloads lock")
            .iter()
            .find(|d| d.url == url && matches!(d.status, DownloadStatus::Downloading { .. }))
            .map(|d| d.id.clone())
    }
}
