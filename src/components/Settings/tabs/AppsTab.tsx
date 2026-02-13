import { Component, For, Show, createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import { appConfigs } from "../../../stores/uiStore";
import { updateApp, hibernateApp, disableApp, enableApp } from "../../../lib/ipc";
import { refreshAppConfigs } from "../../../lib/stateSync";
import type { AppConfig, NotificationStyle, DarkModeType } from "../../../types/config";
import { SettingSection, SettingRow, ToggleSwitch, SelectDropdown, TextInput, Button } from "../SettingsControls";

const AppEditor: Component<{ app: AppConfig; onClose: () => void }> = (props) => {
  const [app, setApp] = createStore<AppConfig>({ ...props.app });
  const [saving, setSaving] = createSignal(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateApp({ ...app });
      await refreshAppConfigs();
      props.onClose();
    } catch (err) {
      console.error("Failed to save app:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mt-2 bg-gray-50 dark:bg-[#1E1E1E]">
      <div class="flex items-center justify-between mb-4">
        <h4 class="text-sm font-semibold text-gray-800 dark:text-gray-200">Edit: {props.app.name}</h4>
        <button onClick={props.onClose} class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer">✕</button>
      </div>

      <div class="space-y-0">
        <SettingRow label="Name">
          <TextInput value={app.name} onChange={(v) => setApp("name", v)} />
        </SettingRow>
        <SettingRow label="URL">
          <TextInput value={app.url} onChange={(v) => setApp("url", v)} class="w-64" />
        </SettingRow>
        <SettingRow label="User Agent" description="Leave empty for system default">
          <TextInput value={app.user_agent} onChange={(v) => setApp("user_agent", v)} class="w-64" placeholder="Default" />
        </SettingRow>
        <SettingRow label="Notification style">
          <SelectDropdown
            value={app.notification_style}
            options={[
              { value: "full", label: "Full" },
              { value: "private", label: "Private" },
              { value: "off", label: "Off" },
            ]}
            onChange={(v) => setApp("notification_style", v as NotificationStyle)}
          />
        </SettingRow>
        <SettingRow label="Dark mode">
          <SelectDropdown
            value={app.dark_mode}
            options={[
              { value: "off", label: "Off" },
              { value: "dynamic", label: "Dynamic" },
              { value: "filter", label: "Filter" },
              { value: "static", label: "Static" },
            ]}
            onChange={(v) => setApp("dark_mode", v as DarkModeType)}
          />
        </SettingRow>
        <SettingRow label="Auto-hibernate timeout" description="Minutes of inactivity (0 = never)">
          <TextInput value={String(app.hibernation_timeout_minutes)} onChange={(v) => setApp("hibernation_timeout_minutes", parseInt(v) || 0)} class="w-20" />
        </SettingRow>
        <SettingRow label="Download directory">
          <TextInput value={app.download_directory} onChange={(v) => setApp("download_directory", v)} class="w-64" />
        </SettingRow>
        <SettingRow label="Skip download dialog">
          <ToggleSwitch checked={app.skip_download_dialog} onChange={(v) => setApp("skip_download_dialog", v)} />
        </SettingRow>
        <SettingRow label="Ad blocking">
          <ToggleSwitch checked={app.adblock_enabled} onChange={(v) => setApp("adblock_enabled", v)} />
        </SettingRow>
      </div>

      <div class="flex justify-end gap-2 mt-4">
        <Button onClick={props.onClose}>Cancel</Button>
        <Button variant="primary" onClick={save} disabled={saving()}>
          {saving() ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
};

const AppsTab: Component = () => {
  const [editingAppId, setEditingAppId] = createSignal<string | null>(null);

  const handleBulkAction = async (action: "hibernate" | "disable" | "enable") => {
    try {
      for (const app of appConfigs) {
        switch (action) {
          case "hibernate": await hibernateApp(app.id); break;
          case "disable": await disableApp(app.id); break;
          case "enable": await enableApp(app.id); break;
        }
      }
      await refreshAppConfigs();
    } catch (err) {
      console.error(`Bulk ${action} failed:`, err);
    }
  };

  const statusLabel = (app: AppConfig) => {
    if (!app.enabled) return "Disabled";
    if (app.hibernated) return "Hibernated";
    return "Active";
  };

  const statusColor = (app: AppConfig) => {
    if (!app.enabled) return "text-red-500";
    if (app.hibernated) return "text-yellow-500";
    return "text-green-500";
  };

  return (
    <div>
      <SettingSection title="Apps" description="Manage your configured applications" />

      <div class="flex gap-2 mb-4">
        <Button onClick={() => handleBulkAction("hibernate")}>Hibernate All</Button>
        <Button onClick={() => handleBulkAction("disable")}>Disable All</Button>
        <Button onClick={() => handleBulkAction("enable")}>Enable All</Button>
      </div>

      <div class="space-y-1">
        <For each={[...appConfigs].sort((a, b) => a.position - b.position)}>
          {(app) => (
            <div>
              <div class="flex items-center justify-between py-2.5 px-3 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center text-xs font-bold text-gray-500">
                    {app.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p class="text-sm font-medium text-gray-800 dark:text-gray-200">{app.name}</p>
                    <p class="text-xs text-gray-400 truncate max-w-xs">{app.url}</p>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <span class={`text-xs font-medium ${statusColor(app)}`}>{statusLabel(app)}</span>
                  <Button onClick={() => setEditingAppId(editingAppId() === app.id ? null : app.id)}>
                    {editingAppId() === app.id ? "Close" : "Edit"}
                  </Button>
                </div>
              </div>
              <Show when={editingAppId() === app.id}>
                <AppEditor app={app} onClose={() => setEditingAppId(null)} />
              </Show>
            </div>
          )}
        </For>
      </div>

      <Show when={appConfigs.length === 0}>
        <div class="text-center py-12 text-gray-400 text-sm">
          No apps configured yet.
        </div>
      </Show>
    </div>
  );
};

export default AppsTab;
