use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;

/// Tracks active app URLs for crash recovery.
/// Written to a JSON file separate from the main config to avoid data loss
/// if the config write fails during a crash.
pub struct SessionState {
    path: PathBuf,
    inner: Mutex<SessionData>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct SessionData {
    /// Map of app_id -> last known URL
    pub active_apps: HashMap<String, String>,
}

impl SessionState {
    pub fn new(app_data_dir: PathBuf) -> Self {
        let path = app_data_dir.join("session_state.json");
        let data = Self::load_from_disk(&path);
        Self {
            path,
            inner: Mutex::new(data),
        }
    }

    fn load_from_disk(path: &PathBuf) -> SessionData {
        match std::fs::read_to_string(path) {
            Ok(contents) => serde_json::from_str(&contents).unwrap_or_default(),
            Err(_) => SessionData::default(),
        }
    }

    /// Record that an app is active at the given URL.
    pub fn set_active(&self, app_id: &str, url: &str) {
        let mut data = self.inner.lock().unwrap();
        data.active_apps.insert(app_id.to_string(), url.to_string());
        self.persist(&data);
    }

    /// Record that an app is no longer active (hibernated/disabled/killed).
    pub fn remove(&self, app_id: &str) {
        let mut data = self.inner.lock().unwrap();
        data.active_apps.remove(app_id);
        self.persist(&data);
    }

    /// Get the last known active apps from the previous session.
    /// This is used on startup for crash recovery.
    pub fn get_previous_session(&self) -> HashMap<String, String> {
        self.inner.lock().unwrap().active_apps.clone()
    }

    /// Clear the session state (called after successful restore).
    pub fn clear(&self) {
        let mut data = self.inner.lock().unwrap();
        data.active_apps.clear();
        self.persist(&data);
    }

    fn persist(&self, data: &SessionData) {
        if let Ok(json) = serde_json::to_string_pretty(data) {
            let _ = std::fs::write(&self.path, json);
        }
    }
}
