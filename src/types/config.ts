export type DarkModeType = 'off' | 'dynamic' | 'filter' | 'static';

export type NotificationStyle = 'full' | 'private' | 'off';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface AppConfig {
  id: string;
  name: string;
  service_type: string;
  url: string;
  icon: string;
  data_store_uuid: string;
  enabled: boolean;
  hibernated: boolean;
  audio_muted: boolean;
  user_agent: string;
  custom_css: string;
  custom_js: string;
  proxy: string;
  dark_mode: DarkModeType;
  dark_mode_brightness: number;
  dark_mode_contrast: number;
  dark_mode_sepia: number;
  dark_mode_bg_color: string;
  dark_mode_text_color: string;
  dark_mode_custom_css: string;
  hibernation_timeout_minutes: number;
  download_directory: string;
  skip_download_dialog: boolean | null;
  workspace: string;
  sidebar_section: string;
  position: number;
  notification_style: NotificationStyle;
  adblock_enabled: boolean;
  zoom_level: number;
  suppress_high_usage_alert: boolean;
  suppress_hibernate_confirm: boolean;
}

export interface WindowState {
  x?: number | null;
  y?: number | null;
  width?: number | null;
  height?: number | null;
  maximized: boolean;
}

export interface GeneralConfig {
  config_version: number;
  theme: ThemeMode;
  dnd_enabled: boolean;
  dnd_schedule_enabled: boolean;
  dnd_schedule_start: string;
  dnd_schedule_end: string;
  dnd_schedule_days: string[];
  tray_mode: boolean;
  show_badge_in_tray: boolean;
  launch_at_login: boolean;
  check_for_updates: boolean;
  developer_mode: boolean;
  scrollbar_color?: string | null;
  selection_color?: string | null;
  recipe_cache_ttl_hours: number;
  window_state: WindowState;
  local_scripts_only: boolean;
  cpu_alert_threshold: number;
  sidebar_hover_expand: boolean;
}

export interface AdblockConfig {
  enabled: boolean;
  custom_rules: string[];
  filter_lists: string[];
  last_updated: string;
}

export interface ShortcutConfig {
  quick_switcher: string;
  toggle_dnd: string;
  toggle_sidebar: string;
  next_app: string;
  prev_app: string;
  global_mute: string;
  global_flags: Record<string, boolean>;
  enabled_flags: Record<string, boolean>;
}

export interface LinkRoutingRule {
  pattern: string;
  target: string;
}

export interface LinkRoutingConfig {
  rules: LinkRoutingRule[];
}

export interface Workspace {
  id: string;
  name: string;
  app_ids: string[];
  tiling_layout: string;
  tile_assignments: string[];
}

export interface WorkspacesConfig {
  active: string;
  items: Workspace[];
  auto_hibernate_on_workspace_switch: boolean;
}

export interface DownloadGlobalConfig {
  unified_manager_enabled: boolean;
  default_directory: string;
  skip_download_dialog_default: boolean;
}

export interface SyncConfig {
  enabled: boolean;
}

export interface OrblyConfig {
  general: GeneralConfig;
  adblock: AdblockConfig;
  shortcuts: ShortcutConfig;
  link_routing: LinkRoutingConfig;
  workspaces: WorkspacesConfig;
  downloads: DownloadGlobalConfig;
  sync: SyncConfig;
  apps: AppConfig[];
}
