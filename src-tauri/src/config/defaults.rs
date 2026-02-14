use super::models::*;

pub fn default_true() -> bool {
    true
}

pub fn default_1() -> u32 {
    1
}

pub fn default_10() -> u32 {
    10
}

pub fn default_15() -> u32 {
    15
}

pub fn default_90() -> u32 {
    90
}

pub fn default_100() -> u32 {
    100
}

pub fn default_service_type() -> String {
    "custom".to_string()
}

pub fn default_dark_mode() -> DarkModeType {
    DarkModeType::Off
}

pub fn default_notification_style() -> NotificationStyle {
    NotificationStyle::Full
}

pub fn default_download_dir() -> String {
    "~/Downloads".to_string()
}

pub fn default_workspace() -> String {
    "default".to_string()
}

pub fn default_dnd_start() -> String {
    "18:00".to_string()
}

pub fn default_dnd_end() -> String {
    "09:00".to_string()
}

pub fn default_dnd_days() -> Vec<String> {
    vec![
        "mon".to_string(),
        "tue".to_string(),
        "wed".to_string(),
        "thu".to_string(),
        "fri".to_string(),
    ]
}

pub fn default_filter_lists() -> Vec<String> {
    vec![
        "https://easylist.to/easylist/easylist.txt".to_string(),
        "https://easylist.to/easylist/easyprivacy.txt".to_string(),
    ]
}

pub fn default_shortcut_quick_switcher() -> String {
    "CmdOrCtrl+K".to_string()
}

pub fn default_shortcut_toggle_dnd() -> String {
    "CmdOrCtrl+Shift+D".to_string()
}

pub fn default_shortcut_toggle_sidebar() -> String {
    "CmdOrCtrl+\\".to_string()
}

pub fn default_shortcut_next_app() -> String {
    "CmdOrCtrl+Tab".to_string()
}

pub fn default_shortcut_prev_app() -> String {
    "CmdOrCtrl+Shift+Tab".to_string()
}

pub fn default_shortcut_global_mute() -> String {
    "CmdOrCtrl+Shift+M".to_string()
}

pub fn default_link_routing_rules() -> Vec<LinkRoutingRule> {
    vec![LinkRoutingRule {
        pattern: "*".to_string(),
        target: "external".to_string(),
    }]
}

pub fn default_workspace_items() -> Vec<Workspace> {
    vec![Workspace {
        id: "default".to_string(),
        name: "All Apps".to_string(),
        app_ids: vec![],
    }]
}

impl Default for ThemeMode {
    fn default() -> Self {
        ThemeMode::System
    }
}

impl Default for OrblyConfig {
    fn default() -> Self {
        Self {
            general: GeneralConfig::default(),
            adblock: AdblockConfig::default(),
            shortcuts: ShortcutConfig::default(),
            link_routing: LinkRoutingConfig::default(),
            workspaces: WorkspacesConfig::default(),
            downloads: DownloadGlobalConfig::default(),
            sync: SyncConfig::default(),
            apps: vec![],
        }
    }
}

impl Default for GeneralConfig {
    fn default() -> Self {
        Self {
            config_version: 1,
            theme: ThemeMode::System,
            dnd_enabled: false,
            dnd_schedule_enabled: false,
            dnd_schedule_start: default_dnd_start(),
            dnd_schedule_end: default_dnd_end(),
            dnd_schedule_days: default_dnd_days(),
            tray_mode: true,
            show_badge_in_tray: true,
            launch_at_login: false,
            check_for_updates: true,
            window_state: WindowState::default(),
        }
    }
}

impl Default for AdblockConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            custom_rules: vec![],
            filter_lists: default_filter_lists(),
            last_updated: String::new(),
        }
    }
}

impl Default for ShortcutConfig {
    fn default() -> Self {
        Self {
            quick_switcher: default_shortcut_quick_switcher(),
            toggle_dnd: default_shortcut_toggle_dnd(),
            toggle_sidebar: default_shortcut_toggle_sidebar(),
            next_app: default_shortcut_next_app(),
            prev_app: default_shortcut_prev_app(),
            global_mute: default_shortcut_global_mute(),
        }
    }
}

impl Default for LinkRoutingConfig {
    fn default() -> Self {
        Self {
            rules: vec![LinkRoutingRule {
                pattern: "*".to_string(),
                target: "external".to_string(),
            }],
        }
    }
}

impl Default for WorkspacesConfig {
    fn default() -> Self {
        Self {
            active: default_workspace(),
            items: default_workspace_items(),
        }
    }
}

impl Default for DownloadGlobalConfig {
    fn default() -> Self {
        Self {
            unified_manager_enabled: true,
            default_directory: default_download_dir(),
        }
    }
}

impl Default for SyncConfig {
    fn default() -> Self {
        Self { enabled: false }
    }
}
