import { createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import type { AppConfig } from "../types/config";
import type { AppStateInfo } from "../types/appState";

// Sidebar state
export const [sidebarExpanded, setSidebarExpanded] = createSignal(false);
export const [activeAppId, setActiveAppId] = createSignal<string | null>(null);

// App data (will be populated from backend in Phase 6)
export const [appConfigs, setAppConfigs] = createStore<AppConfig[]>([]);
export const [appStates, setAppStates] = createStore<AppStateInfo[]>([]);

// DND state
export const [dndEnabled, setDndEnabled] = createSignal(false);

// Active download count (for footer badge)
export const [activeDownloadCount, setActiveDownloadCount] = createSignal(0);

// Downloads panel visibility
export const [downloadsVisible, setDownloadsVisible] = createSignal(false);
