use std::collections::HashMap;
use std::sync::Mutex;

use tauri::{AppHandle, Emitter, Manager, State};

use crate::config::manager::ConfigManager;

/// Stores per-app mute states before global mute was applied,
/// so they can be restored when globally unmuting.
pub struct GlobalMuteState {
    /// Map from app_id to their mute state before global mute.
    prior_states: Mutex<HashMap<String, bool>>,
    /// Whether global mute is currently active.
    pub is_globally_muted: Mutex<bool>,
}

impl GlobalMuteState {
    pub fn new() -> Self {
        Self {
            prior_states: Mutex::new(HashMap::new()),
            is_globally_muted: Mutex::new(false),
        }
    }
}

#[derive(serde::Serialize, Clone)]
struct AudioMutedChanged {
    app_id: String,
    muted: bool,
}

fn get_mute_script(muted: bool) -> String {
    if muted {
        r#"
            (function() {
                document.querySelectorAll('audio, video').forEach(el => { el.muted = true; });
                if (!HTMLMediaElement.prototype._orblyOriginalPlay) {
                    HTMLMediaElement.prototype._orblyOriginalPlay = HTMLMediaElement.prototype.play;
                }
                HTMLMediaElement.prototype.play = function() {
                    this.muted = true;
                    return HTMLMediaElement.prototype._orblyOriginalPlay.call(this);
                };
            })();
        "#
        .to_string()
    } else {
        r#"
            (function() {
                document.querySelectorAll('audio, video').forEach(el => { el.muted = false; });
                if (HTMLMediaElement.prototype._orblyOriginalPlay) {
                    HTMLMediaElement.prototype.play = HTMLMediaElement.prototype._orblyOriginalPlay;
                    delete HTMLMediaElement.prototype._orblyOriginalPlay;
                }
            })();
        "#
        .to_string()
    }
}

pub fn apply_audio_mute_to_webview(
    app_handle: &AppHandle,
    app_id: &str,
    muted: bool,
) -> Result<(), String> {
    if let Some(webview) = app_handle.get_webview(app_id) {
        let script = get_mute_script(muted);
        webview.eval(&script).map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn get_audio_mute_init_script(muted: bool) -> String {
    if muted {
        get_mute_script(true)
    } else {
        String::new()
    }
}

#[tauri::command(rename_all = "snake_case")]
pub fn set_audio_muted(
    app_id: String,
    muted: bool,
    app_handle: AppHandle,
    config_manager: State<'_, ConfigManager>,
) -> Result<(), String> {
    let mut config = config_manager.get_config();
    let app = config
        .apps
        .iter_mut()
        .find(|a| a.id == app_id)
        .ok_or("App not found")?;

    app.audio_muted = muted;

    config_manager
        .save_config(config)
        .map_err(|e| e.to_string())?;

    apply_audio_mute_to_webview(&app_handle, &app_id, muted)?;

    let _ = app_handle.emit(
        "audio-muted-changed",
        AudioMutedChanged {
            app_id,
            muted,
        },
    );

    Ok(())
}

#[tauri::command]
pub fn toggle_global_mute(
    webview: tauri::Webview,
    app_handle: AppHandle,
    config_manager: State<'_, ConfigManager>,
    global_mute_state: State<'_, GlobalMuteState>,
) -> Result<bool, String> {
    crate::commands::require_main_webview(&webview)?;
    let mut config = config_manager.get_config();
    let is_muted = *global_mute_state.is_globally_muted.lock().expect("global mute lock");

    if is_muted {
        // Unmuting: restore each app's prior mute state
        let prior = global_mute_state.prior_states.lock().expect("prior states lock");
        for app in config.apps.iter_mut() {
            if app.enabled {
                let restore_muted = prior.get(&app.id).copied().unwrap_or(false);
                app.audio_muted = restore_muted;
            }
        }
        drop(prior);

        let app_states: Vec<(String, bool)> = config
            .apps
            .iter()
            .filter(|a| a.enabled)
            .map(|a| (a.id.clone(), a.audio_muted))
            .collect();

        config_manager
            .save_config(config)
            .map_err(|e| e.to_string())?;

        for (app_id, muted) in &app_states {
            let _ = apply_audio_mute_to_webview(&app_handle, app_id, *muted);
            let _ = app_handle.emit(
                "audio-muted-changed",
                AudioMutedChanged {
                    app_id: app_id.clone(),
                    muted: *muted,
                },
            );
        }

        *global_mute_state.is_globally_muted.lock().expect("global mute lock") = false;
        Ok(false)
    } else {
        // Muting: save prior states, then mute all
        let mut prior = global_mute_state.prior_states.lock().expect("prior states lock");
        prior.clear();
        for app in config.apps.iter() {
            if app.enabled {
                prior.insert(app.id.clone(), app.audio_muted);
            }
        }
        drop(prior);

        for app in config.apps.iter_mut() {
            if app.enabled {
                app.audio_muted = true;
            }
        }

        let app_ids: Vec<String> = config
            .apps
            .iter()
            .filter(|a| a.enabled)
            .map(|a| a.id.clone())
            .collect();

        config_manager
            .save_config(config)
            .map_err(|e| e.to_string())?;

        for app_id in &app_ids {
            let _ = apply_audio_mute_to_webview(&app_handle, app_id, true);
            let _ = app_handle.emit(
                "audio-muted-changed",
                AudioMutedChanged {
                    app_id: app_id.clone(),
                    muted: true,
                },
            );
        }

        *global_mute_state.is_globally_muted.lock().expect("global mute lock") = true;
        Ok(true)
    }
}

#[tauri::command]
pub fn get_global_mute_state(
    global_mute_state: State<'_, GlobalMuteState>,
) -> bool {
    *global_mute_state.is_globally_muted.lock().expect("global mute lock")
}

#[tauri::command(rename_all = "snake_case")]
pub fn set_media_playing(
    app_id: String,
    playing: bool,
    app_manager: State<'_, crate::app_manager::state::AppManager>,
) -> Result<(), String> {
    let mut apps = app_manager.apps.lock().expect("apps lock");
    if let Some(runtime) = apps.get_mut(&app_id) {
        runtime.is_playing_media = playing;
    }
    Ok(())
}
