use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::defaults::*;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct OrblyConfig {
    #[serde(default)]
    pub general: GeneralConfig,
    #[serde(default)]
    pub adblock: AdblockConfig,
    #[serde(default)]
    pub shortcuts: ShortcutConfig,
    #[serde(default)]
    pub link_routing: LinkRoutingConfig,
    #[serde(default)]
    pub workspaces: WorkspacesConfig,
    #[serde(default)]
    pub downloads: DownloadGlobalConfig,
    #[serde(default)]
    pub sync: SyncConfig,
    #[serde(default)]
    pub apps: Vec<AppConfig>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AppConfig {
    pub id: String,
    pub name: String,
    #[serde(default = "default_service_type")]
    pub service_type: String,
    pub url: String,
    #[serde(default)]
    pub icon: String,
    #[serde(default)]
    pub data_store_uuid: Uuid,
    #[serde(default = "default_true")]
    pub enabled: bool,
    #[serde(default)]
    pub hibernated: bool,
    #[serde(default)]
    pub audio_muted: bool,
    #[serde(default)]
    pub user_agent: String,
    #[serde(default)]
    pub custom_css: String,
    #[serde(default)]
    pub custom_js: String,
    #[serde(default)]
    pub proxy: String,
    #[serde(default = "default_dark_mode")]
    pub dark_mode: DarkModeType,
    #[serde(default = "default_100")]
    pub dark_mode_brightness: u32,
    #[serde(default = "default_90")]
    pub dark_mode_contrast: u32,
    #[serde(default = "default_10")]
    pub dark_mode_sepia: u32,
    #[serde(default)]
    pub dark_mode_bg_color: String,
    #[serde(default)]
    pub dark_mode_text_color: String,
    #[serde(default = "default_15")]
    pub hibernation_timeout_minutes: u32,
    #[serde(default = "default_download_dir")]
    pub download_directory: String,
    #[serde(default)]
    pub skip_download_dialog: bool,
    #[serde(default = "default_workspace")]
    pub workspace: String,
    #[serde(default)]
    pub sidebar_section: String,
    #[serde(default)]
    pub position: u32,
    #[serde(default = "default_notification_style")]
    pub notification_style: NotificationStyle,
    #[serde(default = "default_true")]
    pub adblock_enabled: bool,
    #[serde(default = "default_100")]
    pub zoom_level: u32,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum DarkModeType {
    Off,
    Dynamic,
    Filter,
    Static,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum NotificationStyle {
    Full,
    Private,
    Off,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ThemeMode {
    System,
    Light,
    Dark,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GeneralConfig {
    #[serde(default = "default_1")]
    pub config_version: u32,
    #[serde(default)]
    pub theme: ThemeMode,
    #[serde(default)]
    pub dnd_enabled: bool,
    #[serde(default)]
    pub dnd_schedule_enabled: bool,
    #[serde(default = "default_dnd_start")]
    pub dnd_schedule_start: String,
    #[serde(default = "default_dnd_end")]
    pub dnd_schedule_end: String,
    #[serde(default = "default_dnd_days")]
    pub dnd_schedule_days: Vec<String>,
    #[serde(default = "default_true")]
    pub tray_mode: bool,
    #[serde(default = "default_true")]
    pub show_badge_in_tray: bool,
    #[serde(default)]
    pub launch_at_login: bool,
    #[serde(default = "default_true")]
    pub check_for_updates: bool,
    #[serde(default)]
    pub developer_mode: bool,
    #[serde(default)]
    pub window_state: WindowState,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AdblockConfig {
    #[serde(default = "default_true")]
    pub enabled: bool,
    #[serde(default)]
    pub custom_rules: Vec<String>,
    #[serde(default = "default_filter_lists")]
    pub filter_lists: Vec<String>,
    #[serde(default)]
    pub last_updated: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ShortcutConfig {
    #[serde(default = "default_shortcut_quick_switcher")]
    pub quick_switcher: String,
    #[serde(default = "default_shortcut_toggle_dnd")]
    pub toggle_dnd: String,
    #[serde(default = "default_shortcut_toggle_sidebar")]
    pub toggle_sidebar: String,
    #[serde(default = "default_shortcut_next_app")]
    pub next_app: String,
    #[serde(default = "default_shortcut_prev_app")]
    pub prev_app: String,
    #[serde(default = "default_shortcut_global_mute")]
    pub global_mute: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct LinkRoutingConfig {
    #[serde(default = "default_link_routing_rules")]
    pub rules: Vec<LinkRoutingRule>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct LinkRoutingRule {
    pub pattern: String,
    pub target: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct WorkspacesConfig {
    #[serde(default = "default_workspace")]
    pub active: String,
    #[serde(default = "default_workspace_items")]
    pub items: Vec<Workspace>,
    #[serde(default)]
    pub auto_hibernate_on_workspace_switch: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Workspace {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub app_ids: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DownloadGlobalConfig {
    #[serde(default = "default_true")]
    pub unified_manager_enabled: bool,
    #[serde(default = "default_download_dir")]
    pub default_directory: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SyncConfig {
    #[serde(default)]
    pub enabled: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct WindowState {
    pub x: Option<f64>,
    pub y: Option<f64>,
    pub width: Option<f64>,
    pub height: Option<f64>,
    #[serde(default)]
    pub maximized: bool,
}
