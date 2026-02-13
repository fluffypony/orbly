use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

use uuid::Uuid;

use super::models::{AppConfig, OrblyConfig};

pub struct ConfigManager {
    config: Mutex<OrblyConfig>,
    config_path: PathBuf,
}

impl ConfigManager {
    pub fn new(app_data_dir: PathBuf) -> Result<Self, Box<dyn std::error::Error>> {
        let config_path = Self::config_path(&app_data_dir);

        if let Some(parent) = config_path.parent() {
            fs::create_dir_all(parent)?;
        }

        let config = Self::read_from_disk(&config_path)?;

        Ok(Self {
            config: Mutex::new(config),
            config_path,
        })
    }

    pub fn get_config(&self) -> OrblyConfig {
        self.config.lock().unwrap().clone()
    }

    pub fn save_config(&self, config: OrblyConfig) -> Result<(), Box<dyn std::error::Error>> {
        let mut guard = self.config.lock().unwrap();
        Self::write_to_disk(&self.config_path, &config)?;
        *guard = config;
        Ok(())
    }

    pub fn get_app(&self, app_id: &str) -> Option<AppConfig> {
        self.config
            .lock()
            .unwrap()
            .apps
            .iter()
            .find(|a| a.id == app_id)
            .cloned()
    }

    pub fn add_app(&self, mut app: AppConfig) -> Result<(), Box<dyn std::error::Error>> {
        if app.data_store_uuid.is_nil() {
            app.data_store_uuid = Uuid::new_v4();
        }

        let mut config = self.config.lock().unwrap();
        config.apps.push(app);
        Self::write_to_disk(&self.config_path, &config)?;
        Ok(())
    }

    pub fn update_app(&self, app: AppConfig) -> Result<(), Box<dyn std::error::Error>> {
        let mut config = self.config.lock().unwrap();
        if let Some(existing) = config.apps.iter_mut().find(|a| a.id == app.id) {
            *existing = app;
            Self::write_to_disk(&self.config_path, &config)?;
            Ok(())
        } else {
            Err(format!("App '{}' not found", app.id).into())
        }
    }

    pub fn remove_app(
        &self,
        app_id: &str,
    ) -> Result<Option<AppConfig>, Box<dyn std::error::Error>> {
        let mut config = self.config.lock().unwrap();
        let pos = config.apps.iter().position(|a| a.id == app_id);
        if let Some(idx) = pos {
            let removed = config.apps.remove(idx);
            Self::write_to_disk(&self.config_path, &config)?;
            Ok(Some(removed))
        } else {
            Ok(None)
        }
    }

    fn config_path(app_data_dir: &PathBuf) -> PathBuf {
        app_data_dir.join("config.toml")
    }

    fn read_from_disk(path: &PathBuf) -> Result<OrblyConfig, Box<dyn std::error::Error>> {
        if !path.exists() {
            let config = OrblyConfig::default();
            Self::write_to_disk(path, &config)?;
            return Ok(config);
        }

        let contents = fs::read_to_string(path)?;
        let config: OrblyConfig = toml::from_str(&contents)?;
        Ok(config)
    }

    fn write_to_disk(
        path: &PathBuf,
        config: &OrblyConfig,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let toml_str = toml::to_string_pretty(config)?;

        let tmp_path = path.with_extension("toml.tmp");
        fs::write(&tmp_path, &toml_str)?;

        // On Windows, rename fails if the destination exists; remove first.
        #[cfg(target_os = "windows")]
        {
            if path.exists() {
                fs::remove_file(path)?;
            }
        }

        fs::rename(&tmp_path, path)?;

        Ok(())
    }
}
