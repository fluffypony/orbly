import { Component, createSignal, onMount } from "solid-js";
import { SettingSection, SettingRow, ToggleSwitch, Button } from "../SettingsControls";
import { getConfig } from "../../../lib/ipc";
import { invoke } from "@tauri-apps/api/core";

const SyncTab: Component = () => {
  const [syncEnabled, setSyncEnabled] = createSignal(false);

  onMount(async () => {
    try {
      const config = await getConfig();
      setSyncEnabled(config.sync.enabled);
    } catch (err) {
      console.error("Failed to load sync config:", err);
    }
  });

  const handleExport = async () => {
    try {
      const json = await invoke<string>("export_config_json");
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "orbly-config.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export config:", err);
    }
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        await invoke("import_config_json", { json: text });
        window.location.reload();
      } catch (err) {
        console.error("Failed to import config:", err);
      }
    };
    input.click();
  };

  return (
    <div>
      <SettingSection title="Sync" description="Sync your configuration across devices" />

      <SettingRow label="iCloud Sync" description="Sync settings via iCloud (macOS only, coming soon)">
        <ToggleSwitch checked={syncEnabled()} onChange={setSyncEnabled} disabled />
      </SettingRow>

      <div class="py-3 border-b border-gray-100 dark:border-gray-800">
        <p class="text-xs text-gray-400">Last synced: Not available</p>
      </div>

      <div class="mt-6">
        <h4 class="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">Config Backup</h4>
        <div class="flex gap-2">
          <Button onClick={handleExport}>Export as JSON</Button>
          <Button onClick={handleImport}>Import from JSON</Button>
        </div>
        <p class="text-xs text-gray-400 mt-2">
          Export your complete configuration for backup or transfer to another machine.
        </p>
      </div>
    </div>
  );
};

export default SyncTab;
