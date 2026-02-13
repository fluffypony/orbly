pub mod poller;

use std::collections::HashMap;
use std::sync::Mutex;

use serde::Serialize;
use sysinfo::System;

#[derive(Serialize, Clone, Debug)]
pub struct AppResourceUsage {
    pub app_id: String,
    pub app_name: String,
    pub status: String,
    pub cpu_percent: Option<f64>,
    pub memory_mb: Option<f64>,
}

pub struct ResourceMonitor {
    usage: Mutex<HashMap<String, AppResourceUsage>>,
    alerted: Mutex<HashMap<String, std::time::Instant>>,
    pub(crate) sys: Mutex<System>,
}

#[allow(dead_code)]
impl ResourceMonitor {
    pub fn new() -> Self {
        Self {
            usage: Mutex::new(HashMap::new()),
            alerted: Mutex::new(HashMap::new()),
            sys: Mutex::new(System::new()),
        }
    }

    pub fn update(&self, app_id: &str, usage: AppResourceUsage) {
        self.usage.lock().expect("resource usage lock").insert(app_id.to_string(), usage);
    }

    pub fn get_all(&self) -> Vec<AppResourceUsage> {
        self.usage.lock().expect("resource usage lock").values().cloned().collect()
    }

    pub fn get_usage(&self, app_id: &str) -> Option<AppResourceUsage> {
        self.usage.lock().expect("resource usage lock").get(app_id).cloned()
    }
}
