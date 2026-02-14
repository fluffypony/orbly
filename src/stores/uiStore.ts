import { createSignal, createMemo, createEffect } from "solid-js";
import { createStore } from "solid-js/store";
import type { AppConfig, Workspace } from "../types/config";
import type { AppStateInfo } from "../types/appState";
import { updateWorkspaceTiling } from "../lib/ipc";

// Sidebar state
export const [sidebarExpanded, setSidebarExpanded] = createSignal(false);
export const [sidebarManuallyExpanded, setSidebarManuallyExpanded] = createSignal(false);
export const [activeAppId, setActiveAppId] = createSignal<string | null>(null);
export const [recentAppIds, setRecentAppIds] = createSignal<string[]>([]);

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
  return (ws && ws.id !== "default")
    ? appConfigs.filter((a) => ws.app_ids.includes(a.id))
    : [...appConfigs];
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

// Context menu → settings edit bridge
export const [editingAppIdFromContextMenu, setEditingAppIdFromContextMenu] = createSignal<string | null>(null);

// Theme state
export const [theme, setTheme] = createSignal<'system' | 'light' | 'dark'>('system');

// Tiling state
export type LayoutMode = 'single' | 'split-vertical' | 'split-horizontal' | 'three-column' | 'two-thirds-left' | 'two-thirds-right' | 'grid';
export const [layoutMode, setLayoutMode] = createSignal<LayoutMode>('single');
export const [tileAssignments, setTileAssignments] = createStore<Record<number, string>>({});
export const [activeTileId, setActiveTileId] = createSignal<number>(0);
export const [splitRatio, setSplitRatio] = createSignal<number>(0.5);

let persistTilingTimer: ReturnType<typeof setTimeout> | undefined;

createEffect(() => {
  const workspaceId = activeWorkspaceId();
  const mode = layoutMode();
  const assignmentsSnapshot = JSON.stringify(tileAssignments);

  clearTimeout(persistTilingTimer);
  persistTilingTimer = setTimeout(() => {
    const parsed = JSON.parse(assignmentsSnapshot) as Record<string, string>;
    const tileList = Object.entries(parsed)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([, appId]) => appId);
    updateWorkspaceTiling(workspaceId, mode, tileList).catch((err) => {
      console.error("Failed to persist workspace tiling:", err);
    });
  }, 500);
});
