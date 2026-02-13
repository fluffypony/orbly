use chrono::Timelike;
use tauri::{AppHandle, Emitter, State};
use tauri_plugin_notification::NotificationExt;

use crate::app_manager::state::AppManager;
use crate::config::manager::ConfigManager;
use crate::config::models::{NotificationStyle, OrblyConfig};

#[derive(serde::Deserialize)]
pub struct WebNotification {
    pub app_id: String,
    pub title: String,
    pub body: String,
    pub icon: String,
    pub tag: String,
    pub style: String,
}

#[derive(serde::Deserialize)]
pub struct BadgeUpdate {
    pub app_id: String,
    pub count: Option<i32>,
}

#[tauri::command]
pub fn on_web_notification(
    notification: WebNotification,
    app_handle: AppHandle,
    config_manager: State<'_, ConfigManager>,
) -> Result<(), String> {
    let config = config_manager.get_config();

    if config.general.dnd_enabled || is_in_dnd_schedule(&config) {
        return Ok(());
    }

    let app_config = match config.apps.iter().find(|a| a.id == notification.app_id) {
        Some(a) => a,
        None => return Ok(()),
    };

    match app_config.notification_style {
        NotificationStyle::Off => {}
        NotificationStyle::Private => {
            send_native_notification(&app_handle, &app_config.name, "New notification")?;
        }
        NotificationStyle::Full => {
            let title = if notification.title.is_empty() {
                app_config.name.clone()
            } else {
                format!("{}: {}", app_config.name, notification.title)
            };
            send_native_notification(&app_handle, &title, &notification.body)?;
        }
    }

    Ok(())
}

#[tauri::command]
pub fn on_badge_update(
    update: BadgeUpdate,
    app_manager: State<'_, AppManager>,
    app_handle: AppHandle,
) -> Result<(), String> {
    let count = match update.count {
        Some(c) if c > 0 => Some(c as u32),
        Some(c) if c == 0 => Some(0),
        Some(_) => Some(0), // -1 means "has unread" — represent as 0 (dot indicator)
        None => None,
    };

    app_manager.set_badge_count(&update.app_id, count);

    let _ = app_handle.emit(
        "badge-updated",
        serde_json::json!({
            "appId": update.app_id,
            "count": count,
        }),
    );

    update_aggregated_badge(&app_manager, &app_handle);

    Ok(())
}

fn send_native_notification(app_handle: &AppHandle, title: &str, body: &str) -> Result<(), String> {
    app_handle
        .notification()
        .builder()
        .title(title)
        .body(body)
        .show()
        .map_err(|e| e.to_string())?;
    Ok(())
}

fn is_in_dnd_schedule(config: &OrblyConfig) -> bool {
    if !config.general.dnd_schedule_enabled {
        return false;
    }

    let now = chrono::Local::now();

    // Check day of week
    let day = now.format("%a").to_string().to_lowercase();
    let day_short = &day[..3];
    if !config
        .general
        .dnd_schedule_days
        .iter()
        .any(|d| d == day_short)
    {
        return false;
    }

    // Parse schedule times
    let start = match parse_time(&config.general.dnd_schedule_start) {
        Some(t) => t,
        None => return false,
    };
    let end = match parse_time(&config.general.dnd_schedule_end) {
        Some(t) => t,
        None => return false,
    };

    let current_minutes = now.hour() as u32 * 60 + now.minute() as u32;

    if start <= end {
        // Same-day schedule (e.g., 09:00 - 18:00): DND is active WITHIN the window
        current_minutes >= start && current_minutes < end
    } else {
        // Overnight schedule (e.g., 18:00 - 09:00): DND is active OUTSIDE the inverse window
        current_minutes >= start || current_minutes < end
    }
}

fn parse_time(time_str: &str) -> Option<u32> {
    let parts: Vec<&str> = time_str.split(':').collect();
    if parts.len() != 2 {
        return None;
    }
    let hours: u32 = parts[0].parse().ok()?;
    let minutes: u32 = parts[1].parse().ok()?;
    Some(hours * 60 + minutes)
}

fn update_aggregated_badge(app_manager: &AppManager, app_handle: &AppHandle) {
    let apps = app_manager.apps.lock().unwrap();
    let total: u32 = apps.values().filter_map(|a| a.badge_count).sum();
    let _ = app_handle.emit("total-badge-updated", total);

    crate::tray::update_tray_badge(app_handle, total);
}
