import { invoke } from "@tauri-apps/api/core";
import type { OrblyConfig, AppConfig, GeneralConfig } from "../types/config";
import type { AppStateInfo } from "../types/appState";

// Config commands
export const getConfig = () => invoke<OrblyConfig>("get_config");
export const getApps = () => invoke<AppConfig[]>("get_apps");
export const getApp = (appId: string) => invoke<AppConfig | null>("get_app", { app_id: appId });
export const addApp = (app: AppConfig) => invoke<void>("add_app", { app });
export const updateApp = (app: AppConfig) => invoke<void>("update_app", { app });
export const removeApp = (appId: string) => invoke<AppConfig | null>("remove_app", { app_id: appId });
export const updateGeneralConfig = (general: GeneralConfig) => invoke<void>("update_general_config", { general });

// App lifecycle commands
export const getAppStates = () => invoke<AppStateInfo[]>("get_app_states");
export const activateApp = (appId: string) => invoke<void>("activate_app", { app_id: appId });
export const hibernateApp = (appId: string) => invoke<void>("hibernate_app", { app_id: appId });
export const disableApp = (appId: string) => invoke<void>("disable_app", { app_id: appId });
export const enableApp = (appId: string) => invoke<void>("enable_app", { app_id: appId });
export const reloadApp = (appId: string) => invoke<void>("reload_app", { app_id: appId });
export const notifyAppInteraction = (appId: string) => invoke<void>("notify_app_interaction", { app_id: appId });

// Navigation commands
export const navigateBack = (appId: string) => invoke<void>("navigate_back", { app_id: appId });
export const navigateForward = (appId: string) => invoke<void>("navigate_forward", { app_id: appId });
export const getCurrentUrl = (appId: string) => invoke<string>("get_current_url", { app_id: appId });

// Content area bounds
export const setContentAreaBounds = (x: number, y: number, width: number, height: number) =>
  invoke<void>("set_content_area_bounds", { x, y, width, height });

// Dark mode commands
export const toggleDarkMode = (appId: string) => invoke<string>("toggle_dark_mode", { app_id: appId });
export const updateDarkModeSettings = (
  appId: string,
  mode: string,
  brightness: number,
  contrast: number,
  sepia: number,
  bgColor: string,
  textColor: string,
) => invoke<void>("update_dark_mode_settings", { app_id: appId, mode, brightness, contrast, sepia, bg_color: bgColor, text_color: textColor });

// Adblock commands
export const toggleAdblock = (appId: string) => invoke<boolean>("toggle_adblock", { app_id: appId });
export const getBlockedCount = (appId: string) => invoke<number>("get_blocked_count", { app_id: appId });
export const updateFilterLists = () => invoke<void>("update_filter_lists");
export const addCustomAdblockRule = (rule: string) => invoke<void>("add_custom_adblock_rule", { rule });

// Startup
export const frontendReady = () => invoke<void>("frontend_ready");
