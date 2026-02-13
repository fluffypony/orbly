mod adblock;
mod app_manager;
mod commands;
mod config;
mod darkmode;
mod downloads;
mod notifications;

use tauri::Manager;

use adblock::engine::AdblockState;
use adblock::filter_lists::FilterListManager;
use app_manager::state::{AppManager, ContentBounds};
use config::manager::ConfigManager;
use darkmode::DarkModeManager;
use downloads::DownloadManager;

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

            app.manage(config_manager);
            app.manage(app_mgr);
            app.manage(ContentBounds::new());
            app.manage(dark_mode_manager);
            app.manage(adblock_state);
            app.manage(DownloadManager::new());

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

            app_manager::start_auto_hibernate_task(app.handle().clone());

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
            commands::download_commands::open_download_file,
            commands::download_commands::open_download_folder,
            commands::workspace_commands::get_workspaces,
            commands::workspace_commands::get_active_workspace,
            commands::workspace_commands::switch_workspace,
            commands::workspace_commands::create_workspace,
            commands::workspace_commands::update_workspace,
            commands::workspace_commands::delete_workspace,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Orbly");
}
