use tauri::{AppHandle, Emitter, Manager, State};

use crate::config::manager::ConfigManager;

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
    app_handle: AppHandle,
    config_manager: State<'_, ConfigManager>,
) -> Result<bool, String> {
    let mut config = config_manager.get_config();

    let any_unmuted = config
        .apps
        .iter()
        .any(|a| a.enabled && !a.audio_muted);

    let new_muted = any_unmuted;

    for app in config.apps.iter_mut() {
        if app.enabled {
            app.audio_muted = new_muted;
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
        let _ = apply_audio_mute_to_webview(&app_handle, app_id, new_muted);
        let _ = app_handle.emit(
            "audio-muted-changed",
            AudioMutedChanged {
                app_id: app_id.clone(),
                muted: new_muted,
            },
        );
    }

    Ok(new_muted)
}
