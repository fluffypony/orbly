import { Component, createSignal, onMount, onCleanup } from "solid-js";
import Sidebar from "./components/Sidebar/Sidebar";
import Toolbar from "./components/Toolbar/Toolbar";
import ContentArea from "./components/ContentArea/ContentArea";
import QuickSwitcher from "./components/QuickSwitcher/QuickSwitcher";
import ToastContainer from "./components/Toast/ToastContainer";
import DownloadManagerPanel from "./components/Downloads/DownloadManager";
import { initializeState } from "./lib/stateSync";
import { setupEventListeners, teardownEventListeners } from "./lib/events";
import { registerShortcuts, unregisterAllShortcuts } from "./lib/shortcuts";
import { createDefaultBindings } from "./lib/defaultShortcuts";
import {
  activeAppId,
  appConfigs,
  setSidebarExpanded,
  setDndEnabled,
  downloadsVisible,
  setDownloadsVisible,
} from "./stores/uiStore";
import { activateApp, reloadApp } from "./lib/ipc";

const App: Component = () => {
  const [quickSwitcherVisible, setQuickSwitcherVisible] = createSignal(false);
  const [findBarVisible, setFindBarVisible] = createSignal(false);

  onMount(async () => {
    await setupEventListeners();
    await initializeState();

    const bindings = createDefaultBindings({
      quickSwitcher: () => setQuickSwitcherVisible((v) => !v),
      toggleSidebar: () => setSidebarExpanded((v) => !v),
      toggleDnd: () => setDndEnabled((v) => !v),
      nextApp: () => {
        const apps = [...appConfigs]
          .filter((a) => a.enabled)
          .sort((a, b) => a.position - b.position);
        if (apps.length === 0) return;
        const currentIdx = apps.findIndex((a) => a.id === activeAppId());
        const nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % apps.length;
        activateApp(apps[nextIdx].id);
      },
      prevApp: () => {
        const apps = [...appConfigs]
          .filter((a) => a.enabled)
          .sort((a, b) => a.position - b.position);
        if (apps.length === 0) return;
        const currentIdx = apps.findIndex((a) => a.id === activeAppId());
        const prevIdx = currentIdx === -1 ? apps.length - 1 : (currentIdx - 1 + apps.length) % apps.length;
        activateApp(apps[prevIdx].id);
      },
      reloadCurrentApp: () => {
        const id = activeAppId();
        if (id) reloadApp(id);
      },
      appsManager: () => {
        // Apps Manager modal will be wired in a later phase
      },
      downloads: () => {
        setDownloadsVisible((v) => !v);
      },
      settings: () => {
        // Settings panel will be wired in a later phase
      },
      zoomIn: () => {
        // Zoom controls will be wired in a later phase
      },
      zoomOut: () => {
        // Zoom controls will be wired in a later phase
      },
      zoomReset: () => {
        // Zoom controls will be wired in a later phase
      },
      findInPage: () => setFindBarVisible((v) => !v),
      switchToApp: (index) => {
        const apps = [...appConfigs]
          .filter((a) => a.enabled)
          .sort((a, b) => a.position - b.position);
        if (apps[index]) activateApp(apps[index].id);
      },
    });

    await registerShortcuts(bindings);
  });

  onCleanup(() => {
    teardownEventListeners();
    unregisterAllShortcuts();
  });

  return (
    <div class="flex h-screen w-screen bg-white dark:bg-[#121212] select-none">
      <Sidebar />
      <div class="flex-1 flex flex-col min-w-0">
        <Toolbar />
        <div class="flex-1 relative overflow-hidden">
          <ContentArea
            findBarVisible={findBarVisible()}
            onCloseFindBar={() => setFindBarVisible(false)}
          />
          <DownloadManagerPanel
            visible={downloadsVisible()}
            onClose={() => setDownloadsVisible(false)}
          />
        </div>
      </div>
      <QuickSwitcher
        visible={quickSwitcherVisible()}
        onClose={() => setQuickSwitcherVisible(false)}
      />
      <ToastContainer />
    </div>
  );
};

export default App;
