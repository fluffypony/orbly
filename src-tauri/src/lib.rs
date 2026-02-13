mod commands;
mod config;

use tauri::Manager;

use config::manager::ConfigManager;

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
            let config_manager = ConfigManager::new(app_data_dir)
                .expect("Failed to initialize config manager");
            app.manage(config_manager);
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running Orbly");
}
