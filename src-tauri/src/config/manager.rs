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

        let mut config = Self::read_from_disk(&config_path)?;
        if config.sync.enabled {
            if let Some(cloud_json) = crate::config::icloud::load_from_icloud("orbly_config") {
                if let Ok(cloud_config) = serde_json::from_str::<OrblyConfig>(&cloud_json) {
                    config = cloud_config;
                }
            }
        }
        Self::migrate_config(&mut config);

        Ok(Self {
            config: Mutex::new(config),
            config_path,
        })
    }

    pub fn get_config(&self) -> OrblyConfig {
        self.config.lock().expect("config lock").clone()
    }

    pub fn save_config(&self, config: OrblyConfig) -> Result<(), Box<dyn std::error::Error>> {
        let mut guard = self.config.lock().expect("config lock");
        Self::write_to_disk(&self.config_path, &config)?;
        if config.sync.enabled {
            if let Ok(json) = serde_json::to_string(&config) {
                crate::config::icloud::save_to_icloud("orbly_config", &json);
            }
        }
        *guard = config;
        Ok(())
    }

    pub fn update_with<F>(&self, updater: F) -> Result<(), Box<dyn std::error::Error>>
    where
        F: FnOnce(&mut OrblyConfig),
    {
        let mut guard = self.config.lock().expect("config lock");
        updater(&mut guard);
        Self::write_to_disk(&self.config_path, &guard)?;
        Ok(())
    }

    pub fn get_app(&self, app_id: &str) -> Option<AppConfig> {
        self.config
            .lock()
            .expect("config lock")
            .apps
            .iter()
            .find(|a| a.id == app_id)
            .cloned()
    }

    pub fn add_app(&self, mut app: AppConfig) -> Result<(), Box<dyn std::error::Error>> {
        if app.data_store_uuid.is_nil() {
            app.data_store_uuid = Uuid::new_v4();
        }

        let mut config = self.config.lock().expect("config lock");
        config.apps.push(app);
        Self::write_to_disk(&self.config_path, &config)?;
        Ok(())
    }

    pub fn update_app(&self, app: AppConfig) -> Result<(), Box<dyn std::error::Error>> {
        let mut config = self.config.lock().expect("config lock");
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
        let mut config = self.config.lock().expect("config lock");
        let pos = config.apps.iter().position(|a| a.id == app_id);
        if let Some(idx) = pos {
            let removed = config.apps.remove(idx);
            Self::write_to_disk(&self.config_path, &config)?;
            Ok(Some(removed))
        } else {
            Ok(None)
        }
    }

    fn migrate_config(config: &mut OrblyConfig) {
        loop {
            match config.general.config_version {
                0 => {
                    // v0 → v1: initial migration
                    config.general.config_version = 1;
                }
                1 => break,
                v => {
                    log::warn!("Unknown config version {v}, skipping migration");
                    break;
                }
            }
        }
    }

    fn config_path(app_data_dir: &PathBuf) -> PathBuf {
        app_data_dir.join("config.toml")
    }

    fn read_from_disk(path: &PathBuf) -> Result<OrblyConfig, Box<dyn std::error::Error>> {
        let backup_path = path.with_extension("toml.bak");

        if !path.exists() {
            // Try to recover from backup
            if backup_path.exists() {
                log::info!("Config missing but backup found, restoring from backup");
                let _ = fs::rename(&backup_path, path);
                if path.exists() {
                    let contents = fs::read_to_string(path)?;
                    return Ok(toml::from_str(&contents)?);
                }
            }
            let config = OrblyConfig::default();
            Self::write_to_disk(path, &config)?;
            return Ok(config);
        }

        let contents = fs::read_to_string(path)?;
        match toml::from_str(&contents) {
            Ok(config) => Ok(config),
            Err(e) => {
                log::warn!("Config file is corrupt: {}. Attempting backup recovery.", e);
                if backup_path.exists() {
                    let backup_contents = fs::read_to_string(&backup_path)?;
                    let config: OrblyConfig = toml::from_str(&backup_contents)?;
                    // Restore the good backup as the main config
                    Self::write_to_disk(path, &config)?;
                    Ok(config)
                } else {
                    Err(Box::new(e))
                }
            }
        }
    }

    fn write_to_disk(
        path: &PathBuf,
        config: &OrblyConfig,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let toml_str = toml::to_string_pretty(config)?;

        let tmp_path = path.with_extension("toml.tmp");
        let backup_path = path.with_extension("toml.bak");

        fs::write(&tmp_path, &toml_str)?;

        // Rotate: current -> backup, then tmp -> current
        if path.exists() {
            // On Windows, rename fails if destination exists, so remove backup first
            if backup_path.exists() {
                let _ = fs::remove_file(&backup_path);
            }
            let _ = fs::rename(path, &backup_path);
        }

        if let Err(e) = fs::rename(&tmp_path, path) {
            // Attempt to restore from backup
            if backup_path.exists() {
                let _ = fs::rename(&backup_path, path);
            }
            return Err(Box::new(e));
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config_serialization_roundtrip() {
        let config = OrblyConfig::default();
        let toml_str = toml::to_string_pretty(&config).expect("serialize");
        let parsed: OrblyConfig = toml::from_str(&toml_str).expect("deserialize");
        assert_eq!(parsed.general.config_version, config.general.config_version);
        assert_eq!(parsed.apps.len(), 0);
    }

    #[test]
    fn test_missing_fields_use_defaults() {
        let toml_str = "[general]\nconfig_version = 1\n";
        let config: OrblyConfig = toml::from_str(toml_str).expect("deserialize");
        assert_eq!(config.general.config_version, 1);
        assert!(config.general.tray_mode); // default is true
        assert!(config.general.show_badge_in_tray); // default is true
        assert_eq!(config.apps.len(), 0);
    }

    #[test]
    fn test_migrate_v0_to_v1() {
        let mut config = OrblyConfig::default();
        config.general.config_version = 0;
        ConfigManager::migrate_config(&mut config);
        assert_eq!(config.general.config_version, 1);
    }

    #[test]
    fn test_migrate_unknown_version() {
        let mut config = OrblyConfig::default();
        config.general.config_version = 99;
        ConfigManager::migrate_config(&mut config);
        // Should not crash, version stays as-is
        assert_eq!(config.general.config_version, 99);
    }

    #[test]
    fn test_extra_fields_ignored() {
        let toml_str = "[general]\nconfig_version = 1\nunknown_field = \"value\"\n";
        let config: OrblyConfig = toml::from_str(toml_str).expect("deserialize");
        assert_eq!(config.general.config_version, 1);
    }
}
