import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import {
  setActiveAppId,
  activeAppId,
  setActiveDownloadCount,
  setActiveWorkspaceId,
  activeWorkspaceId,
  setDndEnabled,
  recentAppIds,
  setRecentAppIds,
  appConfigs,
  visibleApps,
  layoutMode,
  tileAssignments,
  setLayoutMode,
  setTileAssignments,
  workspaces,
  setWorkspaces,
} from "../stores/uiStore";
import { refreshAppStates, persistRecentAppIds, refreshAppConfigs } from "./stateSync";
import { showToast } from "../components/Toast/ToastContainer";
import { activateApp, getActiveDownloadCount, getConfig, updateWorkspaceTiling } from "./ipc";

let unlisteners: UnlistenFn[] = [];
let downloadCountInterval: ReturnType<typeof setInterval> | undefined;

async function refreshDownloadCount() {
  try {
    const count = await getActiveDownloadCount();
    setActiveDownloadCount(count);
  } catch {
    // ignore
  }
}

export async function setupEventListeners() {
  downloadCountInterval = setInterval(refreshDownloadCount, 3000);

  unlisteners.push(
    await listen<string>("app-activated", (event) => {
      setActiveAppId(event.payload);
      // Track recent app order for quick switcher (capped at 50)
      const appId = event.payload;
      const updated = [appId, ...recentAppIds().filter(id => id !== appId)].slice(0, 50);
      setRecentAppIds(updated);
      persistRecentAppIds(updated);
      refreshAppStates();
    }),
    await listen<string>("app-hibernated", () => {
      refreshAppStates();
    }),
    await listen<string>("app-disabled", () => {
      refreshAppStates();
    }),
    await listen<string>("app-enabled", () => {
      refreshAppStates();
    }),
    await listen<string>("app-auto-hibernated", (event) => {
      refreshAppStates();
      const appName = appConfigs.find(a => a.id === event.payload)?.name ?? "An app";
      showToast(`${appName} was auto-hibernated due to inactivity`, "info");
    }),
    await listen<string>("app-state-changed", () => {
      refreshAppStates();
    }),
    await listen<string>("app-crashed", () => {
      refreshAppStates();
    }),
    await listen<{ appId: string; count: number | null }>("badge-updated", () => {
      refreshAppStates();
    }),
    await listen<string>("download-started", () => {
      refreshDownloadCount();
    }),
    await listen<string>("download-finished", () => {
      refreshDownloadCount();
      showToast("Download complete", "info");
    }),
    await listen<string>("workspace-switched", async (event) => {
      const outgoingWorkspaceId = activeWorkspaceId();
      const outgoingTileList = Object.entries(tileAssignments)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([, appId]) => appId);
      await updateWorkspaceTiling(outgoingWorkspaceId, layoutMode(), outgoingTileList).catch(() => {});

      setActiveWorkspaceId(event.payload);
      const latestConfig = await getConfig().catch(() => null);
      if (latestConfig) {
        setWorkspaces(latestConfig.workspaces.items);
      }
      const sourceWorkspaces = latestConfig?.workspaces.items ?? workspaces;
      const incomingWorkspace = sourceWorkspaces.find((w) => w.id === event.payload);
      setLayoutMode((incomingWorkspace?.tiling_layout as import("../stores/uiStore").LayoutMode) || "single");
      setTileAssignments(() => {
        const assignments: Record<number, string> = {};
        (incomingWorkspace?.tile_assignments ?? []).forEach((appId, idx) => {
          assignments[idx] = appId;
        });
        return assignments;
      });

      await refreshAppConfigs();
      await refreshAppStates();
      // If the currently active app is no longer visible in the new workspace, switch to first visible or clear
      const currentActive = activeAppId();
      const visible = visibleApps();
      if (currentActive && !visible.some(a => a.id === currentActive)) {
        const firstEnabled = visible.find(a => a.enabled);
        if (firstEnabled) {
          activateApp(firstEnabled.id);
        } else {
          setActiveAppId(null);
        }
      }
    }),
    await listen<string>("switch-to-app", (event) => {
      activateApp(event.payload);
    }),
    await listen<void>("dnd-toggled", async () => {
      try {
        const config = await getConfig();
        setDndEnabled(config.general.dnd_enabled);
      } catch {}
      refreshAppStates();
    }),
    await listen<{ appId: string; message: string }>("app-error", () => {
      refreshAppStates();
    }),
    await listen<{ appId: string; url: string }>("url-changed", () => {
      refreshAppStates();
    }),
    await listen<string>("update-available", (event) => {
      showToast(
        `Update available: v${event.payload}`,
        "info",
        10000,
      );
    }),
    await listen<string>("deep-link-received", (event) => {
      const url = event.payload;
      if (!url || !url.startsWith("orbly://")) return;
      const oauthTarget = appConfigs.find((a) => {
        const service = a.service_type.toLowerCase();
        return url.includes(service) || url.includes(a.id);
      });
      if (oauthTarget) {
        activateApp(oauthTarget.id).catch(() => {});
      }
    }),
  );
}

export function teardownEventListeners() {
  unlisteners.forEach((fn) => fn());
  unlisteners = [];
  if (downloadCountInterval) {
    clearInterval(downloadCountInterval);
    downloadCountInterval = undefined;
  }
}
