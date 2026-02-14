use tauri::{
    AppHandle, Emitter, Manager,
    menu::{CheckMenuItemBuilder, MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};

use crate::config::manager::ConfigManager;

pub fn setup_tray(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let show_hide = MenuItemBuilder::with_id("show_hide", "Show/Hide Orbly").build(app)?;

    let config_manager = app.state::<ConfigManager>();
    let config = config_manager.get_config();

    let mut menu_builder = MenuBuilder::new(app).item(&show_hide).separator();

    for app_config in &config.apps {
        if app_config.enabled {
            let item = MenuItemBuilder::with_id(
                &format!("app_{}", app_config.id),
                &app_config.name,
            )
            .build(app)?;
            menu_builder = menu_builder.item(&item);
        }
    }

    let dnd_toggle = CheckMenuItemBuilder::with_id("toggle_dnd", "Do Not Disturb")
        .checked(config.general.dnd_enabled)
        .build(app)?;

    let quit = MenuItemBuilder::with_id("quit", "Quit Orbly").build(app)?;

    let menu = menu_builder
        .separator()
        .item(&dnd_toggle)
        .separator()
        .item(&quit)
        .build()?;

    let mut tray_builder = TrayIconBuilder::with_id("main");

    if let Some(icon) = app.default_window_icon() {
        tray_builder = tray_builder.icon(icon.clone()).icon_as_template(true);
    }

    let _tray = tray_builder
        .menu(&menu)
        .show_menu_on_left_click(false)
        .tooltip("Orbly")
        .on_menu_event(move |app_handle, event| {
            match event.id().as_ref() {
                "show_hide" => {
                    if let Some(window) = app_handle.get_webview_window("main") {
                        if window.is_visible().unwrap_or(false) {
                            let _ = window.hide();
                        } else {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                }
                "toggle_dnd" => {
                    let cm = app_handle.state::<ConfigManager>();
                    let mut config = cm.get_config();
                    config.general.dnd_enabled = !config.general.dnd_enabled;
                    let _ = cm.save_config(config);
                    rebuild_tray_menu(app_handle);
                    let _ = app_handle.emit("dnd-toggled", ());
                }
                "quit" => {
                    app_handle.exit(0);
                }
                id if id.starts_with("app_") => {
                    let app_id = id.strip_prefix("app_").unwrap();
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                    let _ = app_handle.emit("switch-to-app", app_id.to_string());
                }
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app_handle = tray.app_handle();
                if let Some(window) = app_handle.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}

pub fn rebuild_tray_menu(app_handle: &AppHandle) {
    let Some(tray) = app_handle.tray_by_id("main") else {
        return;
    };

    let config_manager = app_handle.state::<ConfigManager>();
    let config = config_manager.get_config();

    let Ok(show_hide) = MenuItemBuilder::with_id("show_hide", "Show/Hide Orbly").build(app_handle) else { return };
    let mut menu_builder = MenuBuilder::new(app_handle).item(&show_hide).separator();

    for app_config in &config.apps {
        if app_config.enabled {
            if let Ok(item) = MenuItemBuilder::with_id(
                &format!("app_{}", app_config.id),
                &app_config.name,
            ).build(app_handle) {
                menu_builder = menu_builder.item(&item);
            }
        }
    }

    let Ok(dnd_toggle) = CheckMenuItemBuilder::with_id("toggle_dnd", "Do Not Disturb")
        .checked(config.general.dnd_enabled)
        .build(app_handle) else { return };
    let Ok(quit) = MenuItemBuilder::with_id("quit", "Quit Orbly").build(app_handle) else { return };

    if let Ok(menu) = menu_builder
        .separator()
        .item(&dnd_toggle)
        .separator()
        .item(&quit)
        .build() {
        let _ = tray.set_menu(Some(menu));
    }
}

pub fn update_tray_badge(app_handle: &AppHandle, total_count: u32) {
    let show_badge = app_handle
        .try_state::<crate::config::manager::ConfigManager>()
        .map(|cm| cm.get_config().general.show_badge_in_tray)
        .unwrap_or(true);

    if !show_badge {
        if let Some(tray) = app_handle.tray_by_id("main") {
            let _ = tray.set_tooltip(Some("Orbly"));
        }
        if let Some(window) = app_handle.get_webview_window("main") {
            let _ = window.set_badge_count(None);
        }
        return;
    }

    if let Some(tray) = app_handle.tray_by_id("main") {
        if total_count > 0 {
            let _ = tray.set_tooltip(Some(&format!("Orbly — {} unread", total_count)));
        } else {
            let _ = tray.set_tooltip(Some("Orbly"));
        }
    }

    // Set dock badge on macOS / taskbar badge on Linux
    if let Some(window) = app_handle.get_webview_window("main") {
        if total_count > 0 {
            let _ = window.set_badge_count(Some(total_count as i64));
        } else {
            let _ = window.set_badge_count(None);
        }
    }
}
