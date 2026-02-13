use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Instant;

#[derive(Debug, Clone)]
pub enum AppRuntimeState {
    /// Webview is alive and loaded
    Active { current_url: String },
    /// Webview destroyed, state preserved for quick wake
    Hibernated { last_url: String },
    /// Webview destroyed, user explicitly disabled
    Disabled,
}

#[derive(Debug, Clone)]
pub struct AppRuntime {
    pub state: AppRuntimeState,
    pub badge_count: Option<u32>,
    pub last_interaction: Option<Instant>,
}

pub struct AppManager {
    /// Map of app_id -> runtime state
    pub apps: Mutex<HashMap<String, AppRuntime>>,
}

impl AppManager {
    pub fn new() -> Self {
        Self {
            apps: Mutex::new(HashMap::new()),
        }
    }

    /// Initialize runtime state from persisted config on startup
    pub fn init_from_config(&self, apps: &[crate::config::models::AppConfig]) {
        let mut map = self.apps.lock().unwrap();
        for app in apps {
            let state = if !app.enabled {
                AppRuntimeState::Disabled
            } else if app.hibernated {
                AppRuntimeState::Hibernated {
                    last_url: app.url.clone(),
                }
            } else {
                // Will be set to Active once webview is created
                AppRuntimeState::Hibernated {
                    last_url: app.url.clone(),
                }
            };
            map.insert(
                app.id.clone(),
                AppRuntime {
                    state,
                    badge_count: None,
                    last_interaction: None,
                },
            );
        }
    }

    pub fn get_state(&self, app_id: &str) -> Option<AppRuntime> {
        self.apps.lock().unwrap().get(app_id).cloned()
    }

    pub fn set_state(&self, app_id: &str, state: AppRuntimeState) {
        if let Some(runtime) = self.apps.lock().unwrap().get_mut(app_id) {
            runtime.state = state;
        }
    }

    pub fn set_badge_count(&self, app_id: &str, count: Option<u32>) {
        if let Some(runtime) = self.apps.lock().unwrap().get_mut(app_id) {
            runtime.badge_count = count;
        }
    }

    pub fn touch_interaction(&self, app_id: &str) {
        if let Some(runtime) = self.apps.lock().unwrap().get_mut(app_id) {
            runtime.last_interaction = Some(Instant::now());
        }
    }

    pub fn remove(&self, app_id: &str) {
        self.apps.lock().unwrap().remove(app_id);
    }
}
