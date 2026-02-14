import { Component, Show, createSignal, onMount, onCleanup } from "solid-js";
import { listen } from "@tauri-apps/api/event";
import Sidebar from "./components/Sidebar/Sidebar";
import Toolbar from "./components/Toolbar/Toolbar";
import ContentArea from "./components/ContentArea/ContentArea";
import QuickSwitcher from "./components/QuickSwitcher/QuickSwitcher";
import ToastContainer from "./components/Toast/ToastContainer";
import DownloadManagerPanel from "./components/Downloads/DownloadManager";
import AppsManager from "./components/AppsManager/AppsManager";
import Settings from "./components/Settings/Settings";
import Onboarding from "./components/Onboarding/Onboarding";
import { initializeState } from "./lib/stateSync";
import { initThemeManager } from "./lib/themeManager";
import { setupEventListeners, teardownEventListeners } from "./lib/events";
import { registerShortcuts, unregisterAllShortcuts } from "./lib/shortcuts";
import { createDefaultBindings } from "./lib/defaultShortcuts";
import {
  activeAppId,
  appConfigs,
  dndEnabled,
  setSidebarExpanded,
  setDndEnabled,
  downloadsVisible,
  setDownloadsVisible,
  appsManagerVisible,
  setAppsManagerVisible,
  settingsVisible,
  setSettingsVisible,
} from "./stores/uiStore";
import { activateApp, reloadApp, zoomIn, zoomOut, zoomReset, getConfig, frontendReady, updateGeneralConfig, toggleGlobalMute } from "./lib/ipc";
import { showToast } from "./components/Toast/ToastContainer";

const App: Component = () => {
  const [quickSwitcherVisible, setQuickSwitcherVisible] = createSignal(false);
  const [findBarVisible, setFindBarVisible] = createSignal(false);
  const [showOnboarding, setShowOnboarding] = createSignal(false);
  let cleanupHighUsage: (() => void) | undefined;

  const initializeApp = async () => {
    await setupEventListeners();
    await initializeState();
    initThemeManager();

    const config = await getConfig();

    const unlistenHighUsage = await listen<{ appId: string; appName: string; cpu: number }>(
      "high-usage-alert",
      (event) => {
        showToast(
          `${event.payload.appName} is using ${event.payload.cpu.toFixed(0)}% CPU`,
          "warning",
          5000,
        );
      },
    );
    cleanupHighUsage = unlistenHighUsage;

    const bindings = createDefaultBindings({
      quickSwitcher: () => setQuickSwitcherVisible((v) => !v),
      toggleSidebar: () => setSidebarExpanded((v) => !v),
      toggleDnd: () => {
        const newVal = !dndEnabled();
        setDndEnabled(newVal);
        getConfig().then(config => {
          updateGeneralConfig({ ...config.general, dnd_enabled: newVal }).catch(err => {
            console.error("Failed to persist DND state:", err);
          });
        }).catch(() => {});
      },
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
      appsManager: () => setAppsManagerVisible((v) => !v),
      downloads: () => {
        setDownloadsVisible((v) => !v);
      },
      settings: () => {
        setSettingsVisible((v) => !v);
      },
      zoomIn: async () => {
        const id = activeAppId();
        if (id) {
          try {
            const newZoom = await zoomIn(id);
            showToast(`Zoom: ${newZoom}%`, "info", 1500);
          } catch (err) {
            console.error("Zoom in failed:", err);
          }
        }
      },
      zoomOut: async () => {
        const id = activeAppId();
        if (id) {
          try {
            const newZoom = await zoomOut(id);
            showToast(`Zoom: ${newZoom}%`, "info", 1500);
          } catch (err) {
            console.error("Zoom out failed:", err);
          }
        }
      },
      zoomReset: async () => {
        const id = activeAppId();
        if (id) {
          try {
            await zoomReset(id);
            showToast("Zoom: 100%", "info", 1500);
          } catch (err) {
            console.error("Zoom reset failed:", err);
          }
        }
      },
      findInPage: () => setFindBarVisible((v) => !v),
      globalMute: async () => {
        try {
          const muted = await toggleGlobalMute();
          showToast(muted ? "All apps muted" : "All apps unmuted", "info", 1500);
        } catch (err) {
          console.error("Global mute failed:", err);
        }
      },
      switchToApp: (index) => {
        const apps = [...appConfigs]
          .filter((a) => a.enabled)
          .sort((a, b) => a.position - b.position);
        if (apps[index]) activateApp(apps[index].id);
      },
    }, config.shortcuts);

    await registerShortcuts(bindings);
  };

  onMount(async () => {
    try {
      const config = await getConfig();
      if (config.apps.length === 0) {
        setShowOnboarding(true);
      } else {
        await initializeApp();
        await frontendReady();
      }
    } catch (err) {
      console.error("Failed to check first launch:", err);
      await initializeApp();
      await frontendReady();
    }
  });

  const handleOnboardingComplete = async () => {
    setShowOnboarding(false);
    await initializeApp();
    await frontendReady();
  };

  onCleanup(() => {
    teardownEventListeners();
    unregisterAllShortcuts();
    cleanupHighUsage?.();
  });

  return (
    <>
      <Show when={showOnboarding()}>
        <Onboarding onComplete={handleOnboardingComplete} />
      </Show>
      <Show when={!showOnboarding()}>
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
          <AppsManager
            visible={appsManagerVisible()}
            onClose={() => setAppsManagerVisible(false)}
          />
          <Settings
            visible={settingsVisible()}
            onClose={() => setSettingsVisible(false)}
          />
        </div>
      </Show>
    </>
  );
};

export default App;
