use std::path::PathBuf;

pub struct DarkModeManager {
    /// The bundled DarkReader injection script, loaded once at startup
    inject_script: String,
}

impl DarkModeManager {
    pub fn new(resource_dir: PathBuf) -> Result<Self, Box<dyn std::error::Error>> {
        let script_path = resource_dir.join("darkmode-inject.js");
        let inject_script = if script_path.exists() {
            std::fs::read_to_string(&script_path)?
        } else {
            log::warn!("DarkReader injection script not found at {:?}", script_path);
            String::new()
        };

        Ok(Self { inject_script })
    }

    /// Returns the full initialization script for an app's dark mode.
    /// If mode is "off" or the script is not loaded, returns an empty string.
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
        if mode == "off" || self.inject_script.is_empty() {
            return String::new();
        }

        format!(
            r#"
{}

if (window.__ORBLY_DARK_MODE__) {{
    window.__ORBLY_DARK_MODE__.apply({{
        mode: '{}',
        brightness: {},
        contrast: {},
        sepia: {},
        bgColor: '{}',
        textColor: '{}',
        customCss: {}
    }});
}}
"#,
            self.inject_script,
            mode,
            brightness,
            contrast,
            sepia,
            bg_color,
            text_color,
            serde_json::to_string(custom_css).unwrap_or_else(|_| "\"\"".to_string())
        )
    }

    /// Returns a JS snippet to apply dark mode on an already-loaded webview
    /// (where the injection script is already present).
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
        if mode == "off" {
            return "if (window.__ORBLY_DARK_MODE__) window.__ORBLY_DARK_MODE__.disable();".to_string();
        }

        format!(
            "if (window.__ORBLY_DARK_MODE__) window.__ORBLY_DARK_MODE__.apply({{ mode: '{}', brightness: {}, contrast: {}, sepia: {}, bgColor: '{}', textColor: '{}', customCss: {} }});",
            mode,
            brightness,
            contrast,
            sepia,
            bg_color,
            text_color,
            serde_json::to_string(custom_css).unwrap_or_else(|_| "\"\"".to_string())
        )
    }
}
