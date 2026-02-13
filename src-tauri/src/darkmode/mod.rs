use std::path::PathBuf;

pub struct DarkModeManager {
    /// The bundled DarkReader injection script, loaded once at startup
    inject_script: String,
}

impl DarkModeManager {
    pub fn new(resource_dir: PathBuf) -> Result<Self, Box<dyn std::error::Error>> {
        let script_path = resource_dir.join("darkmode-inject.js");
        let inject_script = if script_path.exists() {
            log::info!("Loaded DarkReader injection script from {:?}", script_path);
            std::fs::read_to_string(&script_path)?
        } else {
            log::warn!("DarkReader injection script not found at {:?}", script_path);
            String::new()
        };

        Ok(Self { inject_script })
    }

    /// Returns the full initialization script for an app's dark mode.
    /// Always includes the IIFE so that runtime toggles work even if mode starts as "off".
    /// Returns empty string only if the bundled script is not loaded.
    pub fn get_injection_script(
        &self,
        mode: &str,
        brightness: u32,
        contrast: u32,
        sepia: u32,
        bg_color: &str,
        text_color: &str,
        custom_css: &str,
    ) -> String {
        if self.inject_script.is_empty() {
            return String::new();
        }

        let mode_json = serde_json::to_string(mode).unwrap_or_else(|_| "\"off\"".to_string());
        let bg_json = serde_json::to_string(bg_color).unwrap_or_else(|_| "\"\"".to_string());
        let text_json = serde_json::to_string(text_color).unwrap_or_else(|_| "\"\"".to_string());
        let css_json = serde_json::to_string(custom_css).unwrap_or_else(|_| "\"\"".to_string());

        format!(
            r#"
{}

if (window.__ORBLY_DARK_MODE__) {{
    window.__ORBLY_DARK_MODE__.apply({{
        mode: {},
        brightness: {},
        contrast: {},
        sepia: {},
        bgColor: {},
        textColor: {},
        customCss: {}
    }});
}}
"#,
            self.inject_script,
            mode_json,
            brightness,
            contrast,
            sepia,
            bg_json,
            text_json,
            css_json
        )
    }

    /// Returns a JS snippet to apply dark mode on an already-loaded webview
    /// (where the injection script is already present from initialization).
    pub fn get_apply_script(
        &self,
        mode: &str,
        brightness: u32,
        contrast: u32,
        sepia: u32,
        bg_color: &str,
        text_color: &str,
        custom_css: &str,
    ) -> String {
        let mode_json = serde_json::to_string(mode).unwrap_or_else(|_| "\"off\"".to_string());

        if mode == "off" {
            return "if (window.__ORBLY_DARK_MODE__) window.__ORBLY_DARK_MODE__.disable();".to_string();
        }

        let bg_json = serde_json::to_string(bg_color).unwrap_or_else(|_| "\"\"".to_string());
        let text_json = serde_json::to_string(text_color).unwrap_or_else(|_| "\"\"".to_string());
        let css_json = serde_json::to_string(custom_css).unwrap_or_else(|_| "\"\"".to_string());

        format!(
            "if (window.__ORBLY_DARK_MODE__) window.__ORBLY_DARK_MODE__.apply({{ mode: {}, brightness: {}, contrast: {}, sepia: {}, bgColor: {}, textColor: {}, customCss: {} }});",
            mode_json, brightness, contrast, sepia, bg_json, text_json, css_json
        )
    }
}
