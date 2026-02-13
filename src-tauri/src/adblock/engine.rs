use adblock::lists::{FilterSet, ParseOptions};
use adblock::request::Request;
use adblock::Engine;
use std::collections::HashMap;
use std::sync::Mutex;

/// Wrapper around adblock-rust's Engine.
///
/// Because Engine is `!Send + !Sync` by default (with `single-thread` feature),
/// we disable `single-thread` (via `default-features = false`) to get `Send + Sync`
/// on FilterSet, which we then use to build the Engine on a single thread.
///
/// The Engine itself is `!Send + !Sync`, so we keep it on the main thread
/// and use a Mutex<Option<Engine>> pattern — all operations go through the
/// thread that created it. For Tauri commands (which run on the main thread),
/// this is fine.
///
/// However, since Engine is !Send, we wrap the data we CAN share (blocked counts,
/// cosmetic cache) separately, and perform engine operations via a dedicated approach.
pub struct AdblockState {
    /// Pre-computed cosmetic CSS per URL origin, cached after engine queries.
    cosmetic_cache: Mutex<HashMap<String, Vec<String>>>,
    /// Per-app blocked request counts.
    blocked_counts: Mutex<HashMap<String, u32>>,
    /// Serialized engine data for content-blocking rule generation.
    /// Stored as the raw filter rules text so we can rebuild as needed.
    filter_rules_text: Mutex<Option<String>>,
    /// Custom user rules.
    custom_rules: Mutex<Vec<String>>,
    /// Pre-computed content-blocking JSON (for macOS WKContentRuleList).
    #[cfg(target_os = "macos")]
    content_blocking_json: Mutex<Option<String>>,
}

impl AdblockState {
    pub fn new() -> Self {
        Self {
            cosmetic_cache: Mutex::new(HashMap::new()),
            blocked_counts: Mutex::new(HashMap::new()),
            filter_rules_text: Mutex::new(None),
            custom_rules: Mutex::new(Vec::new()),
            #[cfg(target_os = "macos")]
            content_blocking_json: Mutex::new(None),
        }
    }

    /// Load filter rules and pre-compute cosmetic filters and content-blocking JSON.
    /// This must be called from a context where we can create an Engine (main thread).
    pub fn load_rules(&self, rules_text: &str, custom_rules: &[String]) {
        // Store the raw text for later re-use
        *self.filter_rules_text.lock().unwrap() = Some(rules_text.to_string());
        *self.custom_rules.lock().unwrap() = custom_rules.to_vec();

        // Clear cosmetic cache so it's rebuilt on next query
        self.cosmetic_cache.lock().unwrap().clear();

        // Build content-blocking JSON on macOS
        #[cfg(target_os = "macos")]
        {
            match self.build_content_blocking_json(rules_text, custom_rules) {
                Ok(json) => {
                    *self.content_blocking_json.lock().unwrap() = Some(json);
                    log::info!("Content-blocking JSON generated for macOS");
                }
                Err(e) => {
                    log::warn!("Failed to generate content-blocking JSON: {}", e);
                }
            }
        }

        log::info!("Adblock rules loaded successfully");
    }

    /// Get cosmetic filter CSS rules for a given URL.
    /// Creates a temporary Engine to query cosmetic resources.
    pub fn get_cosmetic_filters(&self, url: &str) -> Vec<String> {
        // Check cache first
        {
            let cache = self.cosmetic_cache.lock().unwrap();
            if let Some(cached) = cache.get(url) {
                return cached.clone();
            }
        }

        let rules_text = self.filter_rules_text.lock().unwrap();
        let custom = self.custom_rules.lock().unwrap();

        let Some(ref rules) = *rules_text else {
            return Vec::new();
        };

        // Build a temporary engine for cosmetic queries
        let mut filter_set = FilterSet::new(false);
        filter_set.add_filter_list(rules, ParseOptions::default());
        for rule in custom.iter() {
            let _ = filter_set.add_filter(rule, ParseOptions::default());
        }

        let engine = Engine::from_filter_set(filter_set, true);
        let cosmetic = engine.url_cosmetic_resources(url);

        let mut css_rules = Vec::new();
        for selector in &cosmetic.hide_selectors {
            css_rules.push(format!("{} {{ display: none !important; }}", selector));
        }

        // Cache the result
        {
            let mut cache = self.cosmetic_cache.lock().unwrap();
            cache.insert(url.to_string(), css_rules.clone());
        }

        css_rules
    }

    /// Check if a URL should be blocked.
    /// Creates a temporary engine for the check.
    pub fn should_block(&self, url: &str, source_url: &str, request_type: &str) -> bool {
        let rules_text = self.filter_rules_text.lock().unwrap();
        let custom = self.custom_rules.lock().unwrap();

        let Some(ref rules) = *rules_text else {
            return false;
        };

        let mut filter_set = FilterSet::new(false);
        filter_set.add_filter_list(rules, ParseOptions::default());
        for rule in custom.iter() {
            let _ = filter_set.add_filter(rule, ParseOptions::default());
        }

        let engine = Engine::from_filter_set(filter_set, true);

        match Request::new(url, source_url, request_type) {
            Ok(request) => engine.check_network_request(&request).matched,
            Err(_) => false,
        }
    }

    /// Generate WKContentRuleList JSON (macOS only).
    #[cfg(target_os = "macos")]
    pub fn get_content_blocking_json(&self) -> Option<String> {
        self.content_blocking_json.lock().unwrap().clone()
    }

    #[cfg(target_os = "macos")]
    fn build_content_blocking_json(
        &self,
        rules_text: &str,
        custom_rules: &[String],
    ) -> Result<String, String> {
        // content-blocking feature requires debug=true on FilterSet
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
        let mut counts = self.blocked_counts.lock().unwrap();
        *counts.entry(app_id.to_string()).or_insert(0) += 1;
    }

    pub fn get_blocked_count(&self, app_id: &str) -> u32 {
        let counts = self.blocked_counts.lock().unwrap();
        counts.get(app_id).copied().unwrap_or(0)
    }

    pub fn reset_blocked_count(&self, app_id: &str) {
        let mut counts = self.blocked_counts.lock().unwrap();
        counts.remove(app_id);
    }

    /// Get the stored filter rules text (for reloading with updated custom rules).
    pub fn get_filter_rules_text(&self) -> Option<String> {
        self.filter_rules_text.lock().unwrap().clone()
    }
}
