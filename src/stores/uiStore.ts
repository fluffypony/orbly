import { createSignal, createMemo } from "solid-js";
import { createStore } from "solid-js/store";
import type { AppConfig, Workspace } from "../types/config";
import type { AppStateInfo } from "../types/appState";

// Sidebar state
export const [sidebarExpanded, setSidebarExpanded] = createSignal(false);
export const [activeAppId, setActiveAppId] = createSignal<string | null>(null);

// App data (will be populated from backend in Phase 6)
export const [appConfigs, setAppConfigs] = createStore<AppConfig[]>([]);
export const [appStates, setAppStates] = createStore<AppStateInfo[]>([]);

// Workspace state
export const [activeWorkspaceId, setActiveWorkspaceId] = createSignal("default");
export const [workspaces, setWorkspaces] = createStore<Workspace[]>([]);

// Derived: apps visible in current workspace
export const visibleApps = createMemo(() => {
  const wsId = activeWorkspaceId();
  const ws = workspaces.find((w) => w.id === wsId);
  if (!ws || ws.id === "default") {
    return appConfigs;
  }
  return appConfigs.filter((a) => ws.app_ids.includes(a.id));
});

// DND state
export const [dndEnabled, setDndEnabled] = createSignal(false);

// Active download count (for footer badge)
export const [activeDownloadCount, setActiveDownloadCount] = createSignal(0);

// Downloads panel visibility
export const [downloadsVisible, setDownloadsVisible] = createSignal(false);

// Apps Manager panel visibility
export const [appsManagerVisible, setAppsManagerVisible] = createSignal(false);
