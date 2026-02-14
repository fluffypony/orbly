mod adblock;
mod app_manager;
mod commands;
mod config;
mod darkmode;
mod downloads;
mod notifications;
mod recipes;
mod resource_monitor;
mod tray;
mod utils;

use std::sync::Mutex;
use std::time::Instant;

use tauri::{Emitter, Manager};
use tauri_plugin_updater::UpdaterExt;

use adblock::engine::AdblockState;
use adblock::filter_lists::FilterListManager;
use app_manager::certificate::CertificateExceptions;
use app_manager::session_state::SessionState;
use app_manager::state::{AppManager, AppRuntimeState, ContentBounds};
use config::manager::ConfigManager;
use darkmode::DarkModeManager;
use downloads::DownloadManager;
use recipes::RecipeManager;
use resource_monitor::ResourceMonitor;

/// Tracks the last time we persisted window state, for debouncing.
struct WindowStateSaveTimer {
    last_save: Mutex<Option<Instant>>,
}

impl WindowStateSaveTimer {
    fn new() -> Self {
        Self {
            last_save: Mutex::new(None),
        }
    }

    /// Returns true if at least `min_interval_ms` have elapsed since the last save.
    fn should_save(&self, min_interval_ms: u64) -> bool {
        let mut last = self.last_save.lock().expect("save timer lock");
        match *last {
            None => {
                *last = Some(Instant::now());
                true
            }
            Some(prev) => {
                let elapsed = prev.elapsed().as_millis() as u64;
                if elapsed >= min_interval_ms {
                    *last = Some(Instant::now());
                    true
                } else {
                    false
                }
            }
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--flag1"]),
        ))
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to resolve app data directory");
            let config_manager = ConfigManager::new(app_data_dir.clone())
                .expect("Failed to initialize config manager");

            let app_mgr = AppManager::new();
            app_mgr.init_from_config(&config_manager.get_config().apps);

            let resource_dir = app
                .path()
                .resource_dir()
                .expect("Failed to resolve resource directory");
            let dark_mode_manager = DarkModeManager::new(resource_dir)
                .expect("Failed to initialize dark mode manager");

            let adblock_state = AdblockState::new();

            let session_state = SessionState::new(app_data_dir.clone());

            let recipe_manager = RecipeManager::new(app_data_dir.clone(), None);

            app.manage(config_manager);
            app.manage(app_mgr);
            app.manage(ContentBounds::new());
            app.manage(dark_mode_manager);
            app.manage(adblock_state);
            app.manage(DownloadManager::new());
            app.manage(ResourceMonitor::new());
            app.manage(WindowStateSaveTimer::new());
            app.manage(CertificateExceptions::new());
            app.manage(session_state);
            app.manage(recipe_manager);
            app.manage(crate::commands::audio_commands::GlobalMuteState::new());

            // Load adblock filter lists in the background
            let adblock_handle = app.handle().clone();
            let adblock_data_dir = app_data_dir.clone();
            let adblock_config = app
                .state::<ConfigManager>()
                .get_config()
                .adblock
                .clone();
            tauri::async_runtime::spawn(async move {
                if !adblock_config.enabled {
                    log::info!("Adblock is disabled globally, skipping filter list load");
                    return;
                }
                let manager = FilterListManager::new(adblock_data_dir);
                match manager
                    .get_filter_rules(&adblock_config.filter_lists, false)
                    .await
                {
                    Ok(rules_text) => {
                        let state = adblock_handle.state::<AdblockState>();
                        state.load_rules(&rules_text, &adblock_config.custom_rules);
                        log::info!("Adblock engine loaded with filter rules");
                    }
                    Err(e) => {
                        log::error!("Failed to load adblock filter lists: {}", e);
                    }
                }
            });

            // Schedule periodic filter list updates (every 24 hours)
            let periodic_handle = app.handle().clone();
            let periodic_data_dir = app_data_dir.clone();
            tauri::async_runtime::spawn(async move {
                let mut interval = tokio::time::interval(std::time::Duration::from_secs(86400));
                interval.tick().await; // Skip the initial immediate tick
                loop {
                    interval.tick().await;
                    let config_manager = periodic_handle.state::<ConfigManager>();
                    let config = config_manager.get_config();
                    if !config.adblock.enabled {
                        continue;
                    }
                    let manager = FilterListManager::new(periodic_data_dir.clone());
                    match manager.get_filter_rules(&config.adblock.filter_lists, true).await {
                        Ok(rules_text) => {
                            let state = periodic_handle.state::<AdblockState>();
                            state.load_rules(&rules_text, &config.adblock.custom_rules);
                            let mut cfg = config_manager.get_config();
                            cfg.adblock.last_updated = chrono::Utc::now().to_rfc3339();
                            let _ = config_manager.save_config(cfg);
                            let _ = periodic_handle.emit("filter-lists-updated", ());
                            let _ = periodic_handle.emit("content-rules-updated", ());
                            log::info!("Periodic filter list update completed");
                        }
                        Err(e) => {
                            log::error!("Periodic filter list update failed: {}", e);
                        }
                    }
                }
            });

            // Fetch recipes on startup (background), unless local_scripts_only is set
            if !app.state::<ConfigManager>().get_config().general.local_scripts_only {
                let recipe_handle = app.handle().clone();
                let recipe_ttl = app.state::<ConfigManager>().get_config().general.recipe_cache_ttl_hours;
                tauri::async_runtime::spawn(async move {
                    let rm = recipe_handle.state::<RecipeManager>();
                    if rm.is_cache_fresh(recipe_ttl) {
                        log::info!("Recipe cache is fresh, skipping update");
                        return;
                    }
                    if let Err(e) = rm.update().await {
                        log::info!("Recipe update on startup failed (may be offline): {}", e);
                        rm.set_error(e.to_string());
                    }
                });
            }

            // Auto-update check on startup
            if app.state::<ConfigManager>().get_config().general.check_for_updates {
                let update_handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    tokio::time::sleep(std::time::Duration::from_secs(10)).await;
                    if let Ok(updater) = update_handle.updater() {
                        match updater.check().await {
                            Ok(Some(update)) => {
                                let _ = update_handle.emit("update-available", &update.version);
                            }
                            Ok(None) => {
                                log::info!("No updates available");
                            }
                            Err(e) => {
                                log::info!("Update check failed: {}", e);
                            }
                        }
                    }
                });
            }

            // DND schedule automation task
            let dnd_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let mut interval = tokio::time::interval(std::time::Duration::from_secs(60));
                loop {
                    interval.tick().await;
                    let config_manager = dnd_handle.state::<ConfigManager>();
                    let mut config = config_manager.get_config();
                    if !config.general.dnd_schedule_enabled {
                        continue;
                    }
                    let should_be_dnd = crate::notifications::handler::is_in_dnd_schedule(&config);
                    if should_be_dnd != config.general.dnd_enabled {
                        config.general.dnd_enabled = should_be_dnd;
                        let _ = config_manager.save_config(config);
                        let _ = dnd_handle.emit("dnd-toggled", ());
                    }
                }
            });

            app_manager::start_auto_hibernate_task(app.handle().clone());
            app_manager::start_crash_detection_task(app.handle().clone());
            resource_monitor::poller::start_resource_polling(app.handle().clone());

            // Restore window state from config
            let ws = app.state::<ConfigManager>().get_config().general.window_state;
            if let Some(window) = app.get_webview_window("main") {
                if let (Some(w), Some(h)) = (ws.width, ws.height) {
                    if w >= 800.0 && h >= 600.0 {
                        let size = tauri::LogicalSize::new(w, h);
                        let _ = window.set_size(tauri::Size::Logical(size));
                    }
                }
                if let (Some(x), Some(y)) = (ws.x, ws.y) {
                    let pos = tauri::LogicalPosition::new(x, y);
                    let _ = window.set_position(tauri::Position::Logical(pos));
                }
                if ws.maximized {
                    let _ = window.maximize();
                }
            }

            // Set up system tray
            tray::setup_tray(app)?;

            log::info!("Orbly v{} starting up", env!("CARGO_PKG_VERSION"));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::config_commands::get_config,
            commands::config_commands::get_apps,
            commands::config_commands::get_app,
            commands::config_commands::add_app,
            commands::config_commands::update_app,
            commands::config_commands::remove_app,
            commands::config_commands::update_general_config,
            commands::config_commands::update_adblock_config,
            commands::config_commands::update_downloads_config,
            commands::config_commands::update_link_routing_config,
            commands::config_commands::test_link_route,
            commands::config_commands::export_config_json,
            commands::config_commands::import_config_json,
            commands::config_commands::update_shortcuts_config,
            commands::app_lifecycle_commands::get_app_states,
            commands::app_lifecycle_commands::activate_app,
            commands::app_lifecycle_commands::hibernate_app,
            commands::app_lifecycle_commands::disable_app,
            commands::app_lifecycle_commands::enable_app,
            commands::app_lifecycle_commands::reload_app,
            commands::app_lifecycle_commands::notify_app_interaction,
            commands::app_lifecycle_commands::set_content_area_bounds,
            commands::app_lifecycle_commands::navigate_back,
            commands::app_lifecycle_commands::navigate_forward,
            commands::app_lifecycle_commands::get_current_url,
            commands::app_lifecycle_commands::frontend_ready,
            notifications::handler::on_web_notification,
            notifications::handler::on_badge_update,
            commands::darkmode_commands::toggle_dark_mode,
            commands::darkmode_commands::update_dark_mode_settings,
            commands::adblock_commands::toggle_adblock,
            commands::adblock_commands::get_blocked_count,
            commands::adblock_commands::update_filter_lists,
            commands::adblock_commands::add_custom_adblock_rule,
            commands::download_commands::get_downloads,
            commands::download_commands::get_active_download_count,
            commands::download_commands::cancel_download,
            commands::download_commands::clear_completed_downloads,
            commands::download_commands::remove_download,
            commands::download_commands::retry_download,
            commands::download_commands::open_download_file,
            commands::download_commands::open_download_folder,
            commands::workspace_commands::get_workspaces,
            commands::workspace_commands::get_active_workspace,
            commands::workspace_commands::switch_workspace,
            commands::workspace_commands::create_workspace,
            commands::workspace_commands::update_workspace,
            commands::workspace_commands::delete_workspace,
            commands::audio_commands::set_audio_muted,
            commands::audio_commands::toggle_global_mute,
            commands::audio_commands::get_global_mute_state,
            commands::audio_commands::set_media_playing,
            commands::zoom_commands::set_zoom_level,
            commands::zoom_commands::zoom_in,
            commands::zoom_commands::zoom_out,
            commands::zoom_commands::zoom_reset,
            commands::find_commands::find_in_page,
            commands::find_commands::get_find_count,
            commands::find_commands::on_find_count,
            commands::find_commands::clear_find_in_page,
            commands::tray_commands::set_launch_at_login,
            commands::tray_commands::get_launch_at_login,
            commands::resource_commands::get_resource_usage,
            commands::resource_commands::kill_app,
            commands::useragent_commands::get_ua_presets,
            commands::useragent_commands::set_user_agent,
            commands::app_lifecycle_commands::open_in_external_browser,
            commands::app_lifecycle_commands::accept_certificate_exception,
            commands::app_lifecycle_commands::get_certificate_exceptions,
            commands::app_lifecycle_commands::remove_certificate_exception,
            commands::recipe_commands::update_recipes,
            commands::recipe_commands::get_recipe_status,
            commands::app_lifecycle_commands::on_url_changed,
            commands::app_lifecycle_commands::on_page_load_error,
            commands::app_lifecycle_commands::eval_in_app,
            commands::app_lifecycle_commands::check_unsaved_work,
            commands::app_lifecycle_commands::set_has_unsaved_work,
            commands::app_lifecycle_commands::heartbeat,
            commands::link_routing_commands::route_link,
            commands::favicon_commands::fetch_favicon,
        ])
        .on_window_event(|window, event| {
            match event {
                tauri::WindowEvent::CloseRequested { api, .. } => {
                    let config_manager =
                        window.app_handle().state::<ConfigManager>();
                    let config = config_manager.get_config();

                    if config.general.tray_mode {
                        api.prevent_close();
                        let _ = window.hide();
                    } else {
                        // Persist session state for crash recovery before closing
                        let session_state = window.app_handle().state::<SessionState>();
                        let app_manager = window.app_handle().state::<AppManager>();
                        let apps = app_manager.apps.lock().expect("apps lock");
                        for (app_id, runtime) in apps.iter() {
                            match &runtime.state {
                                AppRuntimeState::Active { current_url } => {
                                    session_state.set_active(app_id, current_url);
                                }
                                AppRuntimeState::Loading { target_url } => {
                                    session_state.set_active(app_id, target_url);
                                }
                                _ => {}
                            }
                        }
                    }
                }
                tauri::WindowEvent::Moved(pos) => {
                    let timer = window.app_handle().state::<WindowStateSaveTimer>();
                    if timer.should_save(500) {
                        let sf = window.scale_factor().unwrap_or(1.0);
                        let logical = pos.to_logical::<f64>(sf);
                        let cm = window.app_handle().state::<ConfigManager>();
                        let mut config = cm.get_config();
                        config.general.window_state.x = Some(logical.x);
                        config.general.window_state.y = Some(logical.y);
                        let _ = cm.save_config(config);
                    }
                }
                tauri::WindowEvent::Resized(size) => {
                    let timer = window.app_handle().state::<WindowStateSaveTimer>();
                    if timer.should_save(500) {
                        let cm = window.app_handle().state::<ConfigManager>();
                        let mut config = cm.get_config();
                        let maximized = window.is_maximized().unwrap_or(false);
                        config.general.window_state.maximized = maximized;
                        if !maximized {
                            let sf = window.scale_factor().unwrap_or(1.0);
                            let logical = size.to_logical::<f64>(sf);
                            config.general.window_state.width = Some(logical.width);
                            config.general.window_state.height = Some(logical.height);
                        }
                        let _ = cm.save_config(config);
                    }
                }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Orbly");
}
