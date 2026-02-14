import { Component, For, onMount } from "solid-js";
import { createStore } from "solid-js/store";
import { open } from "@tauri-apps/plugin-dialog";
import { SettingSection, SettingRow, ToggleSwitch, TextInput } from "../SettingsControls";
import { getConfig, updateApp, updateDownloadsConfig } from "../../../lib/ipc";
import { refreshAppConfigs } from "../../../lib/stateSync";
import { appConfigs } from "../../../stores/uiStore";
import type { DownloadGlobalConfig } from "../../../types/config";

const DownloadsTab: Component = () => {
  const [downloads, setDownloads] = createStore<DownloadGlobalConfig>({
    unified_manager_enabled: true,
    default_directory: "~/Downloads",
    skip_download_dialog_default: false,
  });
  let initialized = false;

  onMount(async () => {
    try {
      const config = await getConfig();
      setDownloads(config.downloads);
      initialized = true;
    } catch (err) {
      console.error("Failed to load download config:", err);
    }
  });

  const save = async (updates: Partial<DownloadGlobalConfig>) => {
    setDownloads(updates);
    if (!initialized) return;
    try {
      await updateDownloadsConfig({ ...downloads });
    } catch (err) {
      console.error("Failed to save download config:", err);
    }
  };

  const updateAppDownload = async (appId: string, field: string, value: any) => {
    const app = appConfigs.find(a => a.id === appId);
    if (!app) return;
    try {
      await updateApp({ ...app, [field]: value });
      await refreshAppConfigs();
    } catch (err) {
      console.error("Failed to update app download setting:", err);
    }
  };

  return (
    <div>
      <SettingSection title="Downloads" description="Configure download behavior and locations" />

      <SettingRow label="Default download directory" description="Where files are saved by default">
        <div class="flex items-center gap-2">
          <TextInput value={downloads.default_directory} onChange={(v) => save({ default_directory: v })} class="w-52" />
          <button
            class="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer"
            onClick={async () => {
              try {
                const selected = await open({ directory: true });
                if (selected) save({ default_directory: selected as string });
              } catch {}
            }}
          >
            Browse...
          </button>
        </div>
      </SettingRow>

      <SettingRow label="Unified download manager" description="Show all downloads in a single panel">
        <ToggleSwitch checked={downloads.unified_manager_enabled} onChange={(v) => save({ unified_manager_enabled: v })} />
      </SettingRow>

      <SettingRow label="Skip download dialog by default" description="New apps will skip the download dialog when this is on">
        <ToggleSwitch checked={downloads.skip_download_dialog_default} onChange={(v) => save({ skip_download_dialog_default: v })} />
      </SettingRow>

      <div class="mt-6">
        <h4 class="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">Per-App Overrides</h4>
        <For each={[...appConfigs]}>
          {(app) => (
            <div class="py-2.5 border-b border-gray-100 dark:border-gray-800">
              <div class="flex items-center justify-between">
                <p class="text-sm text-gray-800 dark:text-gray-200">{app.name}</p>
                <div class="flex items-center gap-3">
                  <TextInput
                    value={app.download_directory}
                    onChange={(v) => updateAppDownload(app.id, "download_directory", v)}
                    class="w-48"
                    placeholder={downloads.default_directory}
                  />
                  <div class="flex items-center gap-1.5">
                    <span class="text-xs text-gray-400">Skip dialog</span>
                    <ToggleSwitch
                      checked={app.skip_download_dialog}
                      onChange={(v) => updateAppDownload(app.id, "skip_download_dialog", v)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  );
};

export default DownloadsTab;
