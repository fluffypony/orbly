use adblock::lists::{FilterSet, ParseOptions};
use adblock::request::Request;
use adblock::Engine;
use std::collections::HashMap;
use std::sync::Mutex;

/// Thread-safe wrapper around adblock-rust's Engine.
///
/// With `default-features = false` (which disables `single-thread`), Engine is
/// Send + Sync, so we can safely store it in a Mutex and share across threads.
#[allow(dead_code)]
pub struct AdblockState {
    /// The cached adblock engine, rebuilt when rules change.
    engine: Mutex<Option<Engine>>,
    /// Per-app blocked request counts.
    blocked_counts: Mutex<HashMap<String, u32>>,
    /// Raw filter rules text, stored for reload with updated custom rules.
    filter_rules_text: Mutex<Option<String>>,
    /// Custom user rules.
    custom_rules: Mutex<Vec<String>>,
    /// Pre-computed content-blocking JSON (for macOS WKContentRuleList).
    #[cfg(target_os = "macos")]
    content_blocking_json: Mutex<Option<String>>,
}

#[allow(dead_code)]
impl AdblockState {
    pub fn new() -> Self {
        Self {
            engine: Mutex::new(None),
            blocked_counts: Mutex::new(HashMap::new()),
            filter_rules_text: Mutex::new(None),
            custom_rules: Mutex::new(Vec::new()),
            #[cfg(target_os = "macos")]
            content_blocking_json: Mutex::new(None),
        }
    }

    /// Load filter rules into the engine. Rebuilds the cached Engine.
    pub fn load_rules(&self, rules_text: &str, custom_rules: &[String]) {
        *self.filter_rules_text.lock().expect("filter rules lock") = Some(rules_text.to_string());
        *self.custom_rules.lock().expect("custom rules lock") = custom_rules.to_vec();

        // Build and cache the engine
        let mut filter_set = FilterSet::new(false);
        filter_set.add_filter_list(rules_text, ParseOptions::default());
        for rule in custom_rules {
            let _ = filter_set.add_filter(rule, ParseOptions::default());
        }
        let new_engine = Engine::from_filter_set(filter_set, true);
        *self.engine.lock().expect("adblock engine lock") = Some(new_engine);

        // Build content-blocking JSON on macOS
        #[cfg(target_os = "macos")]
        {
            match self.build_content_blocking_json(rules_text, custom_rules) {
                Ok(json) => {
                    *self.content_blocking_json.lock().expect("content blocking lock") = Some(json);
                    log::info!("Content-blocking JSON generated for macOS");
                }
                Err(e) => {
                    log::warn!("Failed to generate content-blocking JSON: {}", e);
                }
            }
        }

        log::info!("Adblock engine loaded and cached");
    }

    /// Check if a URL should be blocked.
    pub fn should_block(&self, url: &str, source_url: &str, request_type: &str) -> bool {
        let engine_guard = self.engine.lock().expect("adblock engine lock");
        let Some(ref engine) = *engine_guard else {
            return false;
        };

        match Request::new(url, source_url, request_type) {
            Ok(request) => engine.check_network_request(&request).matched,
            Err(_) => false,
        }
    }

    /// Get cosmetic filter CSS rules for a given URL.
    pub fn get_cosmetic_filters(&self, url: &str) -> Vec<String> {
        let engine_guard = self.engine.lock().expect("adblock engine lock");
        let Some(ref engine) = *engine_guard else {
            return Vec::new();
        };

        let cosmetic = engine.url_cosmetic_resources(url);
        cosmetic
            .hide_selectors
            .iter()
            .map(|sel| format!("{} {{ display: none !important; }}", sel))
            .collect()
    }

    /// Generate WKContentRuleList JSON (macOS only).
    #[cfg(target_os = "macos")]
    pub fn get_content_blocking_json(&self) -> Option<String> {
        self.content_blocking_json.lock().expect("content blocking lock").clone()
    }

    #[cfg(target_os = "macos")]
    fn build_content_blocking_json(
        &self,
        rules_text: &str,
        custom_rules: &[String],
    ) -> Result<String, String> {
        // content-blocking requires debug=true on FilterSet
        let mut filter_set = FilterSet::new(true);
        filter_set.add_filter_list(rules_text, ParseOptions::default());
        for rule in custom_rules {
            let _ = filter_set.add_filter(rule, ParseOptions::default());
        }

        let (cb_rules, _unused_rules) = filter_set
            .into_content_blocking()
            .map_err(|_| "Failed to convert to content-blocking format".to_string())?;

        serde_json::to_string(&cb_rules)
            .map_err(|e| format!("Failed to serialize content-blocking JSON: {}", e))
    }

    pub fn increment_blocked(&self, app_id: &str) {
        let mut counts = self.blocked_counts.lock().expect("blocked counts lock");
        *counts.entry(app_id.to_string()).or_insert(0) += 1;
    }

    pub fn get_blocked_count(&self, app_id: &str) -> u32 {
        let counts = self.blocked_counts.lock().expect("blocked counts lock");
        counts.get(app_id).copied().unwrap_or(0)
    }

    pub fn reset_blocked_count(&self, app_id: &str) {
        let mut counts = self.blocked_counts.lock().expect("blocked counts lock");
        counts.remove(app_id);
    }

    /// Get the stored filter rules text (for reloading with updated custom rules).
    pub fn get_filter_rules_text(&self) -> Option<String> {
        self.filter_rules_text.lock().expect("filter rules lock").clone()
    }
}
