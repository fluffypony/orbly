import { createSignal, createMemo } from "solid-js";
import { createStore } from "solid-js/store";
import type { AppConfig, Workspace } from "../types/config";
import type { AppStateInfo } from "../types/appState";

// Sidebar state
export const [sidebarExpanded, setSidebarExpanded] = createSignal(false);
export const [activeAppId, setActiveAppId] = createSignal<string | null>(null);
export const [recentAppIds, setRecentAppIds] = createSignal<string[]>([]);

// App data (will be populated from backend in Phase 6)
export const [appConfigs, setAppConfigs] = createStore<AppConfig[]>([]);
export const [appStates, setAppStates] = createStore<AppStateInfo[]>([]);

// Workspace state
export const [activeWorkspaceId, setActiveWorkspaceId] = createSignal("default");
export const [workspaces, setWorkspaces] = createStore<Workspace[]>([]);

// Whether to include disabled apps in visible list (some views dim them, others hide)
export const [showDisabledApps, setShowDisabledApps] = createSignal(true);

// Derived: apps visible in current workspace (optionally filtered by enabled status)
export const visibleApps = createMemo(() => {
  const wsId = activeWorkspaceId();
  const ws = workspaces.find((w) => w.id === wsId);
  let apps = (ws && ws.id !== "default")
    ? appConfigs.filter((a) => ws.app_ids.includes(a.id))
    : [...appConfigs];
  if (!showDisabledApps()) {
    apps = apps.filter((a) => a.enabled);
  }
  return apps;
});

// DND state
export const [dndEnabled, setDndEnabled] = createSignal(false);

// Active download count (for footer badge)
export const [activeDownloadCount, setActiveDownloadCount] = createSignal(0);

// Downloads panel visibility
export const [downloadsVisible, setDownloadsVisible] = createSignal(false);

// Apps Manager panel visibility
export const [appsManagerVisible, setAppsManagerVisible] = createSignal(false);

// Settings panel visibility
export const [settingsVisible, setSettingsVisible] = createSignal(false);

// Theme state
export const [theme, setTheme] = createSignal<'system' | 'light' | 'dark'>('system');
