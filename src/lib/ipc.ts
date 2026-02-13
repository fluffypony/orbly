import { invoke } from "@tauri-apps/api/core";
import type { OrblyConfig, AppConfig, GeneralConfig } from "../types/config";
import type { AppStateInfo } from "../types/appState";

// Config commands
export const getConfig = () => invoke<OrblyConfig>("get_config");
export const getApps = () => invoke<AppConfig[]>("get_apps");
export const getApp = (appId: string) => invoke<AppConfig | null>("get_app", { appId });
export const addApp = (app: AppConfig) => invoke<void>("add_app", { app });
export const updateApp = (app: AppConfig) => invoke<void>("update_app", { app });
export const removeApp = (appId: string) => invoke<AppConfig | null>("remove_app", { appId });
export const updateGeneralConfig = (general: GeneralConfig) => invoke<void>("update_general_config", { general });

// App lifecycle commands
export const getAppStates = () => invoke<AppStateInfo[]>("get_app_states");
export const activateApp = (appId: string) => invoke<void>("activate_app", { appId });
export const hibernateApp = (appId: string) => invoke<void>("hibernate_app", { appId });
export const disableApp = (appId: string) => invoke<void>("disable_app", { appId });
export const enableApp = (appId: string) => invoke<void>("enable_app", { appId });
export const reloadApp = (appId: string) => invoke<void>("reload_app", { appId });
export const notifyAppInteraction = (appId: string) => invoke<void>("notify_app_interaction", { appId });

// Navigation commands
export const navigateBack = (appId: string) => invoke<void>("navigate_back", { appId });
export const navigateForward = (appId: string) => invoke<void>("navigate_forward", { appId });
export const getCurrentUrl = (appId: string) => invoke<string>("get_current_url", { appId });

// Content area bounds
export const setContentAreaBounds = (x: number, y: number, width: number, height: number) =>
  invoke<void>("set_content_area_bounds", { x, y, width, height });

// Startup
export const frontendReady = () => invoke<void>("frontend_ready");
