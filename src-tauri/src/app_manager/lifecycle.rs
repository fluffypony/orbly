use std::path::PathBuf;

use tauri::{AppHandle, Emitter, Manager, WebviewUrl};

use crate::adblock::engine::AdblockState;
use crate::config::models::{AppConfig, DarkModeType};
use crate::darkmode::DarkModeManager;
use crate::downloads::{self, DownloadEntry, DownloadManager, DownloadStatus};
use crate::recipes::RecipeManager;

/// Create a new webview for an app with isolated data store
pub fn create_app_webview(
    app_handle: &AppHandle,
    app_config: &AppConfig,
    position: tauri::LogicalPosition<f64>,
    size: tauri::LogicalSize<f64>,
) -> Result<(), String> {
    let main_window = app_handle
        .get_window("main")
        .ok_or("Main window not found")?;

    let url = WebviewUrl::External(
        app_config
            .url
            .parse()
            .map_err(|e| format!("Invalid URL: {e}"))?,
    );

    let mut builder =
        tauri::webview::WebviewBuilder::new(&app_config.id, url)
            .data_store_identifier(app_config.data_store_uuid.into_bytes())
            .auto_resize();

    if !app_config.user_agent.is_empty() {
        builder = builder.user_agent(&app_config.user_agent);
    }

    // Per-app proxy support
    // Note: On macOS, requires the "macos-proxy" feature and macOS 14+.
    if !app_config.proxy.is_empty() {
        let proxy = url::Url::parse(&app_config.proxy)
            .map_err(|e| format!("Invalid proxy URL: {e}"))?;
        builder = builder.proxy_url(proxy);
    }

    // Network-level ad blocking via navigation handler
    if app_config.adblock_enabled {
        let adblock_app_id = app_config.id.clone();
        let adblock_source_url = app_config.url.clone();
        let nav_handle = app_handle.clone();
        builder = builder.on_navigation(move |url| {
            let url_str = url.as_str();
            if let Some(adblock_state) = nav_handle.try_state::<AdblockState>() {
                if adblock_state.should_block(url_str, &adblock_source_url, "document") {
                    adblock_state.increment_blocked(&adblock_app_id);
                    return false;
                }
            }
            true
        });
    }

    // TODO: For full sub-resource ad blocking on macOS, integrate WKContentRuleList
    // via webview.with_webview(). The content-blocking JSON is pre-computed in
    // AdblockState::get_content_blocking_json(). On other platforms, sub-resource
    // blocking would require Wry to expose on_web_resource_request().

    let init_js = build_initialization_script(app_handle, app_config);
    if !init_js.is_empty() {
        builder = builder.initialization_script(&init_js);
    }

    // Download handler
    let download_dir = if !app_config.download_directory.is_empty() {
        PathBuf::from(
            shellexpand::tilde(&app_config.download_directory).to_string(),
        )
    } else {
        // Fall back to global downloads config, then system default
        let global_dir = app_handle
            .try_state::<crate::config::manager::ConfigManager>()
            .map(|cm| cm.get_config().downloads.default_directory)
            .unwrap_or_default();
        if !global_dir.is_empty() && global_dir != "~/Downloads" {
            PathBuf::from(shellexpand::tilde(&global_dir).to_string())
        } else {
            dirs::download_dir().unwrap_or_else(|| PathBuf::from("Downloads"))
        }
    };
    if let Err(e) = std::fs::create_dir_all(&download_dir) {
        log::warn!("Failed to create download directory {:?}: {}", download_dir, e);
    }

    let skip_dialog = app_config.skip_download_dialog;
    let app_id_clone = app_config.id.clone();
    let app_name_clone = app_config.name.clone();
    let handle_clone = app_handle.clone();

    builder = builder.on_download(move |_webview, event| {
        match event {
            tauri::webview::DownloadEvent::Requested { url, destination } => {
                let filename = std::path::Path::new(url.path())
                    .file_name()
                    .map(|f| f.to_string_lossy().to_string())
                    .unwrap_or_else(|| "download".to_string());

                let filename = if filename.is_empty()
                    || filename == "."
                    || filename == ".."
                    || filename.contains('/')
                    || filename.contains('\\')
                {
                    "download".to_string()
                } else {
                    filename
                };

                let save_path = downloads::resolve_filename_conflict(&download_dir.join(&filename));
                if skip_dialog {
                    *destination = save_path.clone();
                }

                if let Some(dm) = handle_clone.try_state::<DownloadManager>() {
                    let entry = DownloadEntry {
                        id: uuid::Uuid::new_v4().to_string(),
                        filename: filename.clone(),
                        source_app_id: app_id_clone.clone(),
                        source_app_name: app_name_clone.clone(),
                        url: url.to_string(),
                        save_path: save_path.to_string_lossy().to_string(),
                        size_bytes: None,
                        status: DownloadStatus::Downloading { progress: 0.0 },
                        created_at: chrono::Utc::now().to_rfc3339(),
                    };
                    dm.add_download(entry);
                }

                let _ = handle_clone.emit("download-started", &filename);
            }
            tauri::webview::DownloadEvent::Finished { url, path: _, success } => {
                if let Some(dm) = handle_clone.try_state::<DownloadManager>() {
                    if let Some(id) = dm.find_by_url(&url.to_string()) {
                        if success {
                            dm.complete_download(&id);
                        } else {
                            dm.fail_download(&id, "Download failed".to_string());
                        }
                    }
                }
                let _ = handle_clone.emit("download-finished", url.to_string());
            }
            _ => {}
        }
        true
    });

    // TODO: Wire certificate challenge handling when Tauri/Wry exposes certificate
    // challenge callbacks. CertificateExceptions backend is ready for use.
    // See: app_manager/certificate.rs for the exception storage.

    // Note: Media permissions (camera/microphone) rely on platform defaults.
    // macOS Info.plist keys (NSCameraUsageDescription, NSMicrophoneUsageDescription)
    // are set via tauri.conf.json bundle configuration.
    // Tauri/Wry does not currently expose on_permission_request() for WebView2/WKWebView.

    main_window
        .add_child(
            builder,
            tauri::LogicalPosition::from(position),
            tauri::LogicalSize::from(size),
        )
        .map_err(|e| format!("Failed to create webview: {e}"))?;

    // Apply zoom level natively after webview creation
    if app_config.zoom_level != 100 {
        if let Some(webview) = app_handle.get_webview(&app_config.id) {
            let scale = app_config.zoom_level as f64 / 100.0;
            if let Err(e) = webview.set_zoom(scale) {
                log::warn!("Failed to set zoom for {}: {}", app_config.id, e);
            }
        }
    }

    Ok(())
}

/// Destroy an app's webview (used for hibernate and disable).
/// Returns the current URL before destruction if the webview existed.
pub fn destroy_app_webview(
    app_handle: &AppHandle,
    app_id: &str,
) -> Result<Option<String>, String> {
    let current_url = if let Some(webview) = app_handle.get_webview(app_id) {
        let url = webview.url().map(|u| u.to_string()).unwrap_or_default();
        webview
            .close()
            .map_err(|e| format!("Failed to close webview: {e}"))?;
        Some(url)
    } else {
        None
    };
    Ok(current_url)
}

/// Build the initialization script for an app webview.
fn build_initialization_script(app_handle: &AppHandle, app_config: &AppConfig) -> String {
    let mut scripts = Vec::new();

    // Notification interception
    let notification_style = format!("{:?}", app_config.notification_style).to_lowercase();
    scripts.push(crate::notifications::scripts::notification_intercept_script(
        &app_config.id,
        &notification_style,
    ));

    // Badge scraping — use recipe-specific script if available, otherwise generic
    let recipe = app_handle
        .try_state::<RecipeManager>()
        .and_then(|rm| rm.get_recipe(&app_config.service_type));

    if let Some(ref r) = recipe {
        if let Some(ref badge_js) = r.badge_script {
            scripts.push(badge_js.clone());
        } else {
            scripts.push(crate::notifications::badge_scripts::badge_scrape_script(
                &app_config.id,
            ));
        }
    } else {
        scripts.push(crate::notifications::badge_scripts::badge_scrape_script(
            &app_config.id,
        ));
    }

    // Dark mode injection — always inject the IIFE so runtime toggles work
    if let Some(dm_manager) = app_handle.try_state::<DarkModeManager>() {
        let mode_str = match &app_config.dark_mode {
            DarkModeType::Off => "off",
            DarkModeType::Dynamic => "dynamic",
            DarkModeType::Filter => "filter",
            DarkModeType::Static => "static",
        };
        let dm_script = dm_manager.get_injection_script(
            mode_str,
            app_config.dark_mode_brightness,
            app_config.dark_mode_contrast,
            app_config.dark_mode_sepia,
            &app_config.dark_mode_bg_color,
            &app_config.dark_mode_text_color,
            "",
        );
        if !dm_script.is_empty() {
            scripts.push(dm_script);
        }
    }

    // Audio mute initialization
    let audio_init = crate::commands::audio_commands::get_audio_mute_init_script(app_config.audio_muted);
    if !audio_init.is_empty() {
        scripts.push(audio_init);
    }

    // Media playing detection for auto-hibernate safety
    scripts.push(format!(
        r#"
(function() {{
    'use strict';
    var ORBLY_APP_ID = '{}';
    var lastPlaying = false;

    function checkMediaPlaying() {{
        var playing = false;
        var elements = document.querySelectorAll('audio, video');
        for (var i = 0; i < elements.length; i++) {{
            if (!elements[i].paused && !elements[i].ended) {{
                playing = true;
                break;
            }}
        }}
        if (playing !== lastPlaying) {{
            lastPlaying = playing;
            if (window.__TAURI_INTERNALS__) {{
                window.__TAURI_INTERNALS__.invoke('set_media_playing', {{
                    app_id: ORBLY_APP_ID,
                    playing: playing
                }}).catch(function() {{}});
            }}
        }}
    }}

    setInterval(checkMediaPlaying, 3000);
}})();
"#,
        app_config.id
    ));

    // Report user interaction for auto-hibernate tracking
    scripts.push(format!(
        r#"
(function() {{
    'use strict';
    var ORBLY_APP_ID = '{}';
    var lastReport = 0;

    function reportInteraction() {{
        var now = Date.now();
        if (now - lastReport < 30000) return;
        lastReport = now;
        if (window.__TAURI_INTERNALS__) {{
            window.__TAURI_INTERNALS__.invoke('notify_app_interaction', {{
                app_id: ORBLY_APP_ID
            }}).catch(function() {{}});
        }}
    }}

    document.addEventListener('mousemove', reportInteraction, true);
    document.addEventListener('mousedown', reportInteraction, true);
    document.addEventListener('keydown', reportInteraction, true);
    document.addEventListener('scroll', reportInteraction, true);
    document.addEventListener('touchstart', reportInteraction, true);
}})();
"#,
        app_config.id
    ));

    // Recipe CSS/JS injection (before user custom CSS/JS so user overrides take priority)
    if let Some(ref r) = recipe {
        if let Some(ref css) = r.injection_css {
            scripts.push(format!(
                r#"(function() {{
                    const style = document.createElement('style');
                    style.id = '__orbly_recipe_css__';
                    style.textContent = {};
                    document.head.appendChild(style);
                }})();"#,
                serde_json::to_string(css).unwrap_or_default()
            ));
        }
        if let Some(ref js) = r.injection_js {
            scripts.push(format!(r#"(function() {{ {} }})();"#, js));
        }
    }

    // Custom CSS injection
    if !app_config.custom_css.is_empty() {
        scripts.push(format!(
            r#"(function() {{
                const style = document.createElement('style');
                style.textContent = {};
                document.head.appendChild(style);
            }})();"#,
            serde_json::to_string(&app_config.custom_css).unwrap_or_default()
        ));
    }

    // Custom JS injection — runs in the page's main world.
    // Has full access to the page DOM and session data.
    if !app_config.custom_js.is_empty() {
        scripts.push(format!(
            r#"(function() {{ {} }})();"#,
            app_config.custom_js
        ));
    }

    // Cosmetic filter CSS injection (ad blocking)
    if app_config.adblock_enabled {
        if let Some(adblock_state) = app_handle.try_state::<AdblockState>() {
            let cosmetic_css = adblock_state.get_cosmetic_filters(&app_config.url);
            if !cosmetic_css.is_empty() {
                let css_string = cosmetic_css.join("\n");
                scripts.push(format!(
                    r#"(function() {{
                        const style = document.createElement('style');
                        style.id = '__orbly_adblock_cosmetic__';
                        style.textContent = {};
                        document.head.appendChild(style);
                    }})();"#,
                    serde_json::to_string(&css_string).unwrap_or_default()
                ));
            }
        }
    }

    // URL tracking during in-page navigation
    scripts.push(format!(
        r#"
(function() {{
    'use strict';
    var ORBLY_APP_ID = '{}';
    var lastUrl = location.href;

    function reportUrlChange() {{
        var currentUrl = location.href;
        if (currentUrl !== lastUrl) {{
            lastUrl = currentUrl;
            if (window.__TAURI_INTERNALS__) {{
                window.__TAURI_INTERNALS__.invoke('on_url_changed', {{
                    app_id: ORBLY_APP_ID,
                    url: currentUrl
                }}).catch(function() {{}});
            }}
        }}
    }}

    window.addEventListener('popstate', reportUrlChange);
    window.addEventListener('hashchange', reportUrlChange);
    setInterval(reportUrlChange, 2000);
}})();
"#,
        app_config.id
    ));

    // OAuth detection: open known OAuth URLs in system browser
    scripts.push(format!(
        r#"
(function() {{
    'use strict';
    var oauthPatterns = [
        'accounts.google.com/o/oauth',
        'accounts.google.com/signin/oauth',
        'login.microsoftonline.com',
        'github.com/login/oauth',
        'appleid.apple.com/auth',
        'www.facebook.com/v',
        'api.twitter.com/oauth',
        'discord.com/oauth2',
        'slack.com/oauth',
        'login.live.com/oauth'
    ];

    var origAssign = Object.getOwnPropertyDescriptor(Location.prototype, 'href');
    var observer = new MutationObserver(function() {{
        var url = location.href;
        for (var i = 0; i < oauthPatterns.length; i++) {{
            if (url.indexOf(oauthPatterns[i]) !== -1) {{
                if (window.__TAURI_INTERNALS__) {{
                    window.__TAURI_INTERNALS__.invoke('open_in_external_browser', {{ url: url }}).catch(function() {{}});
                    history.back();
                }}
                break;
            }}
        }}
    }});

    observer.observe(document.documentElement, {{ childList: true, subtree: true }});

    window.addEventListener('load', function() {{
        var url = location.href;
        for (var i = 0; i < oauthPatterns.length; i++) {{
            if (url.indexOf(oauthPatterns[i]) !== -1) {{
                if (window.__TAURI_INTERNALS__) {{
                    window.__TAURI_INTERNALS__.invoke('open_in_external_browser', {{ url: url }}).catch(function() {{}});
                    history.back();
                }}
                break;
            }}
        }}
    }});
}})();
"#
    ));

    // Link interception for link routing
    scripts.push(format!(
        r#"
(function() {{
    'use strict';
    var ORBLY_APP_ID = '{}';
    var pageOrigin = location.origin;

    // Intercept link clicks
    document.addEventListener('click', function(e) {{
        var link = e.target.closest('a[href]');
        if (!link) return;
        var href = link.href;
        if (!href) return;
        try {{
            var url = new URL(href, location.href);
            if (url.origin !== pageOrigin && (url.protocol === 'http:' || url.protocol === 'https:')) {{
                e.preventDefault();
                e.stopPropagation();
                if (window.__TAURI_INTERNALS__) {{
                    window.__TAURI_INTERNALS__.invoke('route_link', {{
                        url: url.href,
                        source_app_id: ORBLY_APP_ID
                    }}).catch(function() {{
                        window.open(url.href, '_self');
                    }});
                }}
            }}
        }} catch(ex) {{}}
    }}, true);

    // Override window.open for cross-origin
    var _origOpen = window.open;
    window.open = function(url, target, features) {{
        if (!url) return _origOpen.call(window, url, target, features);
        try {{
            var parsed = new URL(url, location.href);
            if (parsed.origin !== pageOrigin && (parsed.protocol === 'http:' || parsed.protocol === 'https:')) {{
                if (window.__TAURI_INTERNALS__) {{
                    window.__TAURI_INTERNALS__.invoke('route_link', {{
                        url: parsed.href,
                        source_app_id: ORBLY_APP_ID
                    }}).catch(function() {{}});
                }}
                return null;
            }}
        }} catch(ex) {{}}
        return _origOpen.call(window, url, target, features);
    }};
}})();
"#,
        app_config.id
    ));

    scripts.join("\n")
}

/// Show/hide a webview (used for switching active app)
pub fn set_webview_visible(
    app_handle: &AppHandle,
    app_id: &str,
    visible: bool,
    position: Option<tauri::LogicalPosition<f64>>,
    size: Option<tauri::LogicalSize<f64>>,
) -> Result<(), String> {
    if let Some(webview) = app_handle.get_webview(app_id) {
        if visible {
            if let (Some(pos), Some(sz)) = (position, size) {
                webview
                    .set_position(tauri::LogicalPosition::from(pos))
                    .map_err(|e| e.to_string())?;
                webview
                    .set_size(tauri::LogicalSize::from(sz))
                    .map_err(|e| e.to_string())?;
            }
            webview.show().map_err(|e| e.to_string())?;
        } else {
            webview.hide().map_err(|e| e.to_string())?;
        }
        Ok(())
    } else {
        Err(format!("Webview '{}' not found", app_id))
    }
}
