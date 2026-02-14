import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import {
  setActiveAppId,
  setActiveDownloadCount,
  setActiveWorkspaceId,
  setDndEnabled,
  recentAppIds,
  setRecentAppIds,
} from "../stores/uiStore";
import { refreshAppStates } from "./stateSync";
import { showToast } from "../components/Toast/ToastContainer";
import { activateApp, getActiveDownloadCount, getConfig } from "./ipc";

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
      setRecentAppIds([appId, ...recentAppIds().filter(id => id !== appId)].slice(0, 50));
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
    await listen<string>("app-auto-hibernated", () => {
      refreshAppStates();
      showToast("App was auto-hibernated due to inactivity", "info");
    }),
    await listen<string>("app-state-changed", () => {
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
    await listen<string>("workspace-switched", (event) => {
      setActiveWorkspaceId(event.payload);
      refreshAppStates();
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
