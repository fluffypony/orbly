pub mod certificate;
pub mod lifecycle;
pub mod session_state;
pub mod state;

use tauri::{Emitter, Manager};

use crate::config::manager::ConfigManager;

/// Spawns a background task that monitors heartbeats from visible webviews
/// and transitions apps to Crashed state if heartbeat is missing for too long.
pub fn start_crash_detection_task(app_handle: tauri::AppHandle) {
    const HEARTBEAT_TIMEOUT_SECS: u64 = 90;

    tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(30));
        loop {
            interval.tick().await;

            let app_manager = app_handle.state::<state::AppManager>();
            let apps = app_manager.apps.lock().expect("apps lock").clone();

            for (app_id, runtime) in &apps {
                // Only check visible, active apps that have sent at least one heartbeat
                if !runtime.is_visible {
                    continue;
                }
                if let state::AppRuntimeState::Active { .. } = &runtime.state {
                    if let Some(last_hb) = runtime.last_heartbeat {
                        if last_hb.elapsed().as_secs() > HEARTBEAT_TIMEOUT_SECS {
                            log::warn!(
                                "App '{}' heartbeat timeout ({}s), marking as crashed",
                                app_id,
                                last_hb.elapsed().as_secs()
                            );
                            app_manager.set_state(app_id, state::AppRuntimeState::Crashed);
                            let _ = app_handle.emit("app-crashed", app_id.clone());
                        }
                    }
                }
                // Check for apps stuck in Loading state
                if let state::AppRuntimeState::Loading { .. } = &runtime.state {
                    if let Some(last_interaction) = runtime.last_interaction {
                        if last_interaction.elapsed().as_secs() > 30 {
                            log::warn!(
                                "App '{}' stuck in Loading state for over 30s, marking as error",
                                app_id,
                            );
                            app_manager.set_state(
                                app_id,
                                state::AppRuntimeState::Error {
                                    message: "Page took too long to load".to_string(),
                                },
                            );
                            let _ = app_handle.emit("app-state-changed", app_id.clone());
                        }
                    }
                }
            }
        }
    });
}

/// Spawns a background task that periodically checks for apps that should be auto-hibernated
/// based on their configured inactivity timeout.
pub fn start_auto_hibernate_task(app_handle: tauri::AppHandle) {
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(60));
        loop {
            interval.tick().await;

            let app_manager = app_handle.state::<state::AppManager>();
            let config_manager = app_handle.state::<ConfigManager>();

            let config = config_manager.get_config();
            let apps = app_manager.apps.lock().expect("apps lock").clone();

            for (app_id, runtime) in &apps {
                if let state::AppRuntimeState::Active { .. } | state::AppRuntimeState::Loading { .. } = &runtime.state {
                    if let Some(app_config) = config.apps.iter().find(|a| a.id == *app_id) {
                        if app_config.hibernation_timeout_minutes == 0 {
                            continue;
                        }

                        // Skip if app is playing media
                        if runtime.is_playing_media {
                            continue;
                        }

                        if let Some(last) = runtime.last_interaction {
                            // Never hibernate if interacted within last 60 seconds
                            if last.elapsed().as_secs() < 60 {
                                continue;
                            }
                            let elapsed_minutes = last.elapsed().as_secs() / 60;
                            if elapsed_minutes >= app_config.hibernation_timeout_minutes as u64 {
                                // Re-check current state under lock before destroying
                                let should_hibernate = {
                                    let apps_lock = app_manager.apps.lock().expect("apps lock");
                                    if let Some(current_runtime) = apps_lock.get(app_id) {
                                        if let state::AppRuntimeState::Active { .. } = &current_runtime.state {
                                            current_runtime.last_interaction
                                                .map(|last| last.elapsed().as_secs() / 60 >= app_config.hibernation_timeout_minutes as u64)
                                                .unwrap_or(false)
                                        } else {
                                            false
                                        }
                                    } else {
                                        false
                                    }
                                };

                                if should_hibernate {
                                    if let Ok(last_url) =
                                        lifecycle::destroy_app_webview(&app_handle, app_id)
                                    {
                                        let url = last_url.unwrap_or_else(|| app_config.url.clone());
                                        let mut apps_lock = app_manager.apps.lock().expect("apps lock");
                                        if let Some(rt) = apps_lock.get_mut(app_id) {
                                            rt.state =
                                                state::AppRuntimeState::Hibernated { last_url: url };
                                        }
                                    }
                                    // Update persisted config
                                    let mut cfg = config_manager.get_config();
                                    if let Some(a) =
                                        cfg.apps.iter_mut().find(|a| a.id == *app_id)
                                    {
                                        a.hibernated = true;
                                    }
                                    let _ = config_manager.save_config(cfg);

                                    let _ = app_handle.emit("app-auto-hibernated", app_id.clone());
                                }
                            }
                        }
                    }
                }
            }
        }
    });
}
