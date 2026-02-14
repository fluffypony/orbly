import { invoke } from "@tauri-apps/api/core";
import type { OrblyConfig, AppConfig, GeneralConfig, Workspace } from "../types/config";
import type { AppStateInfo } from "../types/appState";

// Config commands
export const getConfig = () => invoke<OrblyConfig>("get_config");
export const getApps = () => invoke<AppConfig[]>("get_apps");
export const getApp = (appId: string) => invoke<AppConfig | null>("get_app", { app_id: appId });
export const addApp = (app: AppConfig) => invoke<void>("add_app", { app });
export const updateApp = (app: AppConfig) => invoke<void>("update_app", { app });
export const removeApp = (appId: string, deleteData: boolean = false) => invoke<AppConfig | null>("remove_app", { app_id: appId, delete_data: deleteData });
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
export const evalInApp = (appId: string, script: string) =>
  invoke<void>("eval_in_app", { app_id: appId, script });
export const checkUnsavedWork = (appId: string) => invoke<boolean>("check_unsaved_work", { app_id: appId });

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

// Config section commands
export const updateLinkRoutingConfig = (linkRouting: import("../types/config").LinkRoutingConfig) =>
  invoke<void>("update_link_routing_config", { link_routing: linkRouting });
export const testLinkRoute = (url: string) => invoke<string>("test_link_route", { url });
export const exportConfigJson = () => invoke<string>("export_config_json");
export const importConfigJson = (json: string) => invoke<void>("import_config_json", { json });

// Adblock commands
export const toggleAdblock = (appId: string) => invoke<boolean>("toggle_adblock", { app_id: appId });
export const getBlockedCount = (appId: string) => invoke<number>("get_blocked_count", { app_id: appId });
export const updateFilterLists = () => invoke<void>("update_filter_lists");
export const addCustomAdblockRule = (rule: string) => invoke<void>("add_custom_adblock_rule", { rule });
export const updateAdblockConfig = (adblock: import("../types/config").AdblockConfig) => invoke<void>("update_adblock_config", { adblock });
export const updateDownloadsConfig = (downloads: import("../types/config").DownloadGlobalConfig) => invoke<void>("update_downloads_config", { downloads });

// Download commands
export const getDownloads = () => invoke<import("../types/downloads").DownloadEntry[]>("get_downloads");
export const getActiveDownloadCount = () => invoke<number>("get_active_download_count");
export const cancelDownload = (downloadId: string) => invoke<void>("cancel_download", { download_id: downloadId });
export const clearCompletedDownloads = () => invoke<void>("clear_completed_downloads");
export const removeDownload = (downloadId: string) => invoke<void>("remove_download", { download_id: downloadId });
export const openDownloadFile = (downloadId: string) => invoke<void>("open_download_file", { download_id: downloadId });
export const openDownloadFolder = (downloadId: string) => invoke<void>("open_download_folder", { download_id: downloadId });

// Workspace commands
export const getWorkspaces = () => invoke<Workspace[]>("get_workspaces");
export const getActiveWorkspace = () => invoke<string>("get_active_workspace");
export const switchWorkspace = (workspaceId: string) =>
  invoke<void>("switch_workspace", { workspace_id: workspaceId });
export const createWorkspace = (name: string, appIds: string[]) =>
  invoke<Workspace>("create_workspace", { name, app_ids: appIds });
export const updateWorkspace = (workspace: Workspace) =>
  invoke<void>("update_workspace", { workspace });
export const deleteWorkspace = (workspaceId: string) =>
  invoke<void>("delete_workspace", { workspace_id: workspaceId });

// Audio commands
export const setAudioMuted = (appId: string, muted: boolean) =>
  invoke<void>("set_audio_muted", { app_id: appId, muted });
export const toggleGlobalMute = () => invoke<boolean>("toggle_global_mute");

// Zoom commands
export const setZoomLevel = (appId: string, zoom: number) =>
  invoke<void>("set_zoom_level", { app_id: appId, zoom });
export const zoomIn = (appId: string) => invoke<number>("zoom_in", { app_id: appId });
export const zoomOut = (appId: string) => invoke<number>("zoom_out", { app_id: appId });
export const zoomReset = (appId: string) => invoke<void>("zoom_reset", { app_id: appId });

// Find commands
export const findInPage = (appId: string, query: string, forward: boolean) =>
  invoke<void>("find_in_page", { app_id: appId, query, forward });
export const getFindCount = (appId: string, query: string) =>
  invoke<void>("get_find_count", { app_id: appId, query });
export const clearFindInPage = (appId: string) =>
  invoke<void>("clear_find_in_page", { app_id: appId });

// Tray commands
export const setLaunchAtLogin = (enabled: boolean) =>
  invoke<void>("set_launch_at_login", { enabled });
export const getLaunchAtLogin = () => invoke<boolean>("get_launch_at_login");

// Resource monitor commands
export const getResourceUsage = () => invoke<any[]>("get_resource_usage");
export const killApp = (appId: string) => invoke<void>("kill_app", { app_id: appId });

// User agent commands
export const getUaPresets = () => invoke<[string, string][]>("get_ua_presets");
export const setUserAgent = (appId: string, userAgent: string) =>
  invoke<void>("set_user_agent", { app_id: appId, user_agent: userAgent });

// External browser & certificate commands
export const openInExternalBrowser = (url: string) =>
  invoke<void>("open_in_external_browser", { url });
export const acceptCertificateException = (host: string, days?: number) =>
  invoke<void>("accept_certificate_exception", { host, days });
export const getCertificateExceptions = () =>
  invoke<[string, string][]>("get_certificate_exceptions");

// Recipe commands
export const updateRecipes = () => invoke<void>("update_recipes");
export const getRecipeStatus = () => invoke<{ status: string; last_updated: string; manifest_version: number | null; service_count: number }>("get_recipe_status");

// Favicon commands
export const fetchFavicon = (url: string) => invoke<string>("fetch_favicon", { url });

// Link routing commands
export const routeLink = (url: string, sourceAppId: string) =>
  invoke<void>("route_link", { url, source_app_id: sourceAppId });

// Startup
export const frontendReady = () => invoke<void>("frontend_ready");
