import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import {
  setActiveAppId,
  setActiveDownloadCount,
  setActiveWorkspaceId,
} from "../stores/uiStore";
import { refreshAppStates } from "./stateSync";
import { showToast } from "../components/Toast/ToastContainer";
import { getActiveDownloadCount } from "./ipc";

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
    await listen<{ appId: string; count: number | null }>("badge-updated", () => {
      refreshAppStates();
    }),
    await listen<string>("download-started", () => {
      refreshDownloadCount();
    }),
    await listen<string>("download-finished", () => {
      refreshDownloadCount();
    }),
    await listen<string>("workspace-switched", (event) => {
      setActiveWorkspaceId(event.payload);
      refreshAppStates();
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
