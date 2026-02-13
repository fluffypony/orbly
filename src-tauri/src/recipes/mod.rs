use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;

use sha2::Digest;

const DEFAULT_MANIFEST_URL: &str = "https://recipes.getorb.ly/manifest.json";

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RecipeManifest {
    pub version: u32,
    pub services: HashMap<String, ServiceRecipe>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ServiceRecipe {
    pub name: String,
    pub badge_script: Option<String>,
    pub injection_css: Option<String>,
    pub injection_js: Option<String>,
    pub recommended_user_agent: Option<String>,
    pub sha256: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RecipeStatus {
    pub status: String,
    pub last_updated: String,
    pub manifest_version: Option<u32>,
    pub service_count: usize,
}

pub struct RecipeManager {
    cache_dir: PathBuf,
    manifest_url: String,
    manifest: Mutex<Option<RecipeManifest>>,
    last_updated: Mutex<Option<chrono::DateTime<chrono::Utc>>>,
    last_error: Mutex<Option<String>>,
}

impl RecipeManager {
    pub fn new(app_data_dir: PathBuf, manifest_url: Option<String>) -> Self {
        let cache_dir = app_data_dir.join("recipes");
        std::fs::create_dir_all(&cache_dir).ok();

        // Try loading cached manifest on construction
        let manifest = Self::load_cached_manifest(&cache_dir);
        let last_updated = if manifest.is_some() {
            // Check manifest file modification time
            let manifest_path = cache_dir.join("manifest.json");
            manifest_path
                .metadata()
                .ok()
                .and_then(|m| m.modified().ok())
                .map(|t| chrono::DateTime::<chrono::Utc>::from(t))
        } else {
            None
        };

        Self {
            cache_dir,
            manifest_url: manifest_url.unwrap_or_else(|| DEFAULT_MANIFEST_URL.to_string()),
            manifest: Mutex::new(manifest),
            last_updated: Mutex::new(last_updated),
            last_error: Mutex::new(None),
        }
    }

    fn load_cached_manifest(cache_dir: &PathBuf) -> Option<RecipeManifest> {
        let manifest_path = cache_dir.join("manifest.json");
        if manifest_path.exists() {
            let contents = std::fs::read_to_string(&manifest_path).ok()?;
            serde_json::from_str(&contents).ok()
        } else {
            None
        }
    }

    /// Fetch manifest from remote and cache scripts locally
    pub async fn update(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()?;
        let response = client.get(&self.manifest_url).send().await?;
        let manifest: RecipeManifest = response.json().await?;

        // Build a verified manifest — only include services that pass hash verification
        let mut verified_services = HashMap::new();

        for (service_id, recipe) in &manifest.services {
            // Validate service_id to prevent path traversal
            if service_id.contains("..") || service_id.contains('/') || service_id.contains('\\') {
                log::warn!("Invalid service ID '{}', skipping", service_id);
                continue;
            }

            // Verify SHA-256 hash
            let mut hasher = sha2::Sha256::new();
            if let Some(ref s) = recipe.badge_script {
                hasher.update(s.as_bytes());
            }
            hasher.update(b"\0");
            if let Some(ref s) = recipe.injection_css {
                hasher.update(s.as_bytes());
            }
            hasher.update(b"\0");
            if let Some(ref s) = recipe.injection_js {
                hasher.update(s.as_bytes());
            }
            let hash = hex::encode(hasher.finalize());

            if !hash.eq_ignore_ascii_case(&recipe.sha256) {
                log::warn!("Recipe hash mismatch for service '{}', skipping", service_id);
                continue;
            }

            // Cache scripts to disk
            let service_dir = self.cache_dir.join(service_id);
            std::fs::create_dir_all(&service_dir).ok();
            if let Some(ref s) = recipe.badge_script {
                std::fs::write(service_dir.join("badge.js"), s)?;
            }
            if let Some(ref s) = recipe.injection_css {
                std::fs::write(service_dir.join("inject.css"), s)?;
            }
            if let Some(ref s) = recipe.injection_js {
                std::fs::write(service_dir.join("inject.js"), s)?;
            }

            verified_services.insert(service_id.clone(), recipe.clone());
        }

        let verified_manifest = RecipeManifest {
            version: manifest.version,
            services: verified_services,
        };

        // Write verified manifest to disk
        let manifest_path = self.cache_dir.join("manifest.json");
        std::fs::write(&manifest_path, serde_json::to_string_pretty(&verified_manifest)?)?;

        // Update in-memory state with verified manifest only
        let now = chrono::Utc::now();
        *self.manifest.lock().unwrap() = Some(verified_manifest);
        *self.last_updated.lock().unwrap() = Some(now);
        *self.last_error.lock().unwrap() = None;

        log::info!("Recipe manifest updated successfully");
        Ok(())
    }

    /// Get recipe for a service by its service_type. Falls back to cached files if not in memory.
    pub fn get_recipe(&self, service_id: &str) -> Option<ServiceRecipe> {
        // 1. Check in-memory manifest
        if let Some(ref manifest) = *self.manifest.lock().unwrap() {
            if let Some(recipe) = manifest.services.get(service_id) {
                return Some(recipe.clone());
            }
        }

        // 2. Check cached files on disk
        let service_dir = self.cache_dir.join(service_id);
        if service_dir.exists() {
            let badge = std::fs::read_to_string(service_dir.join("badge.js")).ok();
            let css = std::fs::read_to_string(service_dir.join("inject.css")).ok();
            let js = std::fs::read_to_string(service_dir.join("inject.js")).ok();
            if badge.is_some() || css.is_some() || js.is_some() {
                return Some(ServiceRecipe {
                    name: service_id.to_string(),
                    badge_script: badge,
                    injection_css: css,
                    injection_js: js,
                    recommended_user_agent: None,
                    sha256: String::new(),
                });
            }
        }

        // 3. No recipe available
        None
    }

    /// Get current status for displaying in the Settings UI
    pub fn get_status(&self) -> RecipeStatus {
        let manifest = self.manifest.lock().unwrap();
        let last_updated = self.last_updated.lock().unwrap();
        let last_error = self.last_error.lock().unwrap();

        let status = if last_error.is_some() {
            "fetch-failed".to_string()
        } else if manifest.is_some() {
            "up-to-date".to_string()
        } else {
            "no-data".to_string()
        };

        RecipeStatus {
            status,
            last_updated: last_updated
                .map(|t| t.to_rfc3339())
                .unwrap_or_default(),
            manifest_version: manifest.as_ref().map(|m| m.version),
            service_count: manifest.as_ref().map(|m| m.services.len()).unwrap_or(0),
        }
    }

    /// Record a fetch error
    pub fn set_error(&self, error: String) {
        *self.last_error.lock().unwrap() = Some(error);
    }
}
