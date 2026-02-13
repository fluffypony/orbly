import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { setActiveAppId } from "../stores/uiStore";
import { refreshAppStates } from "./stateSync";
import { showToast } from "../components/Toast/ToastContainer";

let unlisteners: UnlistenFn[] = [];

export async function setupEventListeners() {
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
  );
}

export function teardownEventListeners() {
  unlisteners.forEach((fn) => fn());
  unlisteners = [];
}
