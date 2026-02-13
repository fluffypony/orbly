use std::collections::HashMap;
use std::sync::Mutex;

/// Manages per-host certificate exception overrides.
/// When a user accepts a certificate warning, the host is stored here
/// with an expiry timestamp (default: 30 days).
pub struct CertificateExceptions {
    exceptions: Mutex<HashMap<String, chrono::DateTime<chrono::Utc>>>,
}

#[allow(dead_code)]
impl CertificateExceptions {
    pub fn new() -> Self {
        Self {
            exceptions: Mutex::new(HashMap::new()),
        }
    }

    pub fn add_exception(&self, host: &str, days: i64) {
        let expiry = chrono::Utc::now() + chrono::Duration::days(days);
        self.exceptions
            .lock()
            .unwrap()
            .insert(host.to_string(), expiry);
    }

    pub fn is_excepted(&self, host: &str) -> bool {
        let exceptions = self.exceptions.lock().unwrap();
        if let Some(expiry) = exceptions.get(host) {
            chrono::Utc::now() < *expiry
        } else {
            false
        }
    }

    pub fn remove_exception(&self, host: &str) {
        self.exceptions.lock().unwrap().remove(host);
    }

    pub fn get_all(&self) -> Vec<(String, String)> {
        self.exceptions
            .lock()
            .unwrap()
            .iter()
            .filter(|(_, expiry)| chrono::Utc::now() < **expiry)
            .map(|(host, expiry)| (host.clone(), expiry.to_rfc3339()))
            .collect()
    }
}
