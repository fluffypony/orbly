import { getConfig, getAppStates } from "./ipc";
import {
  setAppConfigs,
  setAppStates,
  setDndEnabled,
  setWorkspaces,
  setActiveWorkspaceId,
  setTheme,
  setRecentAppIds,
  setLayoutMode,
  setTileAssignments,
} from "../stores/uiStore";
import { load } from "@tauri-apps/plugin-store";

let storeInstance: Awaited<ReturnType<typeof load>> | null = null;

async function getStore() {
  if (!storeInstance) {
    storeInstance = await load("ui-state.json", { autoSave: true, defaults: {} });
  }
  return storeInstance;
}

export async function initializeState() {
  try {
    const config = await getConfig();
    setAppConfigs(config.apps);
    setDndEnabled(config.general.dnd_enabled);
    setTheme(config.general.theme);
    setWorkspaces(config.workspaces.items);
    setActiveWorkspaceId(config.workspaces.active);
    const activeWorkspace = config.workspaces.items.find((w) => w.id === config.workspaces.active);
    setLayoutMode((activeWorkspace?.tiling_layout as import("../stores/uiStore").LayoutMode) || "single");
    setTileAssignments(() => {
      const assignments: Record<number, string> = {};
      (activeWorkspace?.tile_assignments ?? []).forEach((appId, idx) => {
        assignments[idx] = appId;
      });
      return assignments;
    });

    const states = await getAppStates();
    setAppStates(states);

    // Restore recent app IDs from persistent store
    try {
      const store = await getStore();
      const recent = await store.get<string[]>("recentAppIds");
      if (recent && Array.isArray(recent)) {
        setRecentAppIds(recent);
      }
    } catch {
      // Ignore store errors
    }
  } catch (err) {
    console.error("Failed to initialize state:", err);
  }
}

export async function refreshAppStates() {
  try {
    const states = await getAppStates();
    setAppStates(states);
  } catch (err) {
    console.error("Failed to refresh app states:", err);
  }
}

export async function refreshAppConfigs() {
  try {
    const config = await getConfig();
    setAppConfigs(config.apps);
  } catch (err) {
    console.error("Failed to refresh app configs:", err);
  }
}

let saveDebounceTimer: ReturnType<typeof setTimeout> | undefined;

export async function persistRecentAppIds(ids: string[]) {
  clearTimeout(saveDebounceTimer);
  saveDebounceTimer = setTimeout(async () => {
    try {
      const store = await getStore();
      await store.set("recentAppIds", ids);
    } catch {
      // Ignore store errors
    }
  }, 1000);
}
