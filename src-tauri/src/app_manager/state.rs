use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Instant;

#[derive(Debug, Clone)]
pub enum AppRuntimeState {
    /// Webview is being created, waiting for first navigation
    Loading { target_url: String },
    /// Webview is alive and loaded
    Active { current_url: String },
    /// Webview destroyed, state preserved for quick wake
    Hibernated { last_url: String },
    /// Webview destroyed, user explicitly disabled
    Disabled,
    /// Page load failed
    Error { message: String },
    /// Webview process crashed
    Crashed,
}

#[derive(Debug, Clone)]
pub struct AppRuntime {
    pub state: AppRuntimeState,
    pub badge_count: Option<i32>,
    pub last_interaction: Option<Instant>,
    pub last_heartbeat: Option<Instant>,
    pub is_playing_media: bool,
    pub is_visible: bool,
    pub has_unsaved_work: bool,
}

pub struct AppManager {
    /// Map of app_id -> runtime state
    pub apps: Mutex<HashMap<String, AppRuntime>>,
    /// URLs queued for navigation after an app is activated (e.g., from link routing to hibernated apps)
    pub pending_navigations: Mutex<HashMap<String, String>>,
}

#[allow(dead_code)]
impl AppManager {
    pub fn new() -> Self {
        Self {
            apps: Mutex::new(HashMap::new()),
            pending_navigations: Mutex::new(HashMap::new()),
        }
    }

    /// Initialize runtime state from persisted config on startup
    pub fn init_from_config(&self, apps: &[crate::config::models::AppConfig]) {
        let mut map = self.apps.lock().expect("apps lock");
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
                    last_heartbeat: None,
                    is_playing_media: false,
                    is_visible: false,
                    has_unsaved_work: false,
                },
            );
        }
    }

    pub fn get_state(&self, app_id: &str) -> Option<AppRuntime> {
        self.apps.lock().expect("apps lock").get(app_id).cloned()
    }

    pub fn set_state(&self, app_id: &str, state: AppRuntimeState) {
        if let Some(runtime) = self.apps.lock().expect("apps lock").get_mut(app_id) {
            runtime.state = state;
        }
    }

    pub fn set_badge_count(&self, app_id: &str, count: Option<i32>) {
        if let Some(runtime) = self.apps.lock().expect("apps lock").get_mut(app_id) {
            runtime.badge_count = count;
        }
    }

    pub fn touch_interaction(&self, app_id: &str) {
        if let Some(runtime) = self.apps.lock().expect("apps lock").get_mut(app_id) {
            runtime.last_interaction = Some(Instant::now());
        }
    }

    pub fn touch_heartbeat(&self, app_id: &str) {
        if let Some(runtime) = self.apps.lock().expect("apps lock").get_mut(app_id) {
            runtime.last_heartbeat = Some(Instant::now());
        }
    }

    pub fn set_visible(&self, app_id: &str, visible: bool) {
        if let Some(runtime) = self.apps.lock().expect("apps lock").get_mut(app_id) {
            runtime.is_visible = visible;
        }
    }

    pub fn remove(&self, app_id: &str) {
        self.apps.lock().expect("apps lock").remove(app_id);
    }

    pub fn set_pending_navigation(&self, app_id: &str, url: String) {
        self.pending_navigations
            .lock()
            .expect("pending_navigations lock")
            .insert(app_id.to_string(), url);
    }

    pub fn take_pending_navigation(&self, app_id: &str) -> Option<String> {
        self.pending_navigations
            .lock()
            .expect("pending_navigations lock")
            .remove(app_id)
    }
}

pub struct ContentBounds {
    inner: Mutex<ContentBoundsInner>,
}

#[derive(Debug, Clone, Copy)]
pub struct ContentBoundsInner {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

impl ContentBounds {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(ContentBoundsInner {
                x: 56.0,
                y: 40.0,
                width: 1024.0,
                height: 680.0,
            }),
        }
    }

    pub fn set(&self, x: f64, y: f64, width: f64, height: f64) {
        let mut bounds = self.inner.lock().expect("content bounds lock");
        bounds.x = x;
        bounds.y = y;
        bounds.width = width;
        bounds.height = height;
    }

    pub fn get(&self) -> ContentBoundsInner {
        *self.inner.lock().expect("content bounds lock")
    }
}
