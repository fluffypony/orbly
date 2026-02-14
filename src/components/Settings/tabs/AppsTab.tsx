import { Component, For, Show, createSignal, onMount } from "solid-js";
import { createStore } from "solid-js/store";
import { appConfigs } from "../../../stores/uiStore";
import { updateApp, hibernateApp, disableApp, enableApp, getUaPresets } from "../../../lib/ipc";
import { refreshAppConfigs } from "../../../lib/stateSync";
import type { AppConfig, NotificationStyle, DarkModeType } from "../../../types/config";
import { SettingSection, SettingRow, ToggleSwitch, SelectDropdown, TextInput, Button } from "../SettingsControls";
import AddAppDialog from "../AddAppDialog";
import InjectionEditor from "../../AppSettings/InjectionEditor";

const isMac = navigator.platform.includes("Mac");

const AppEditor: Component<{ app: AppConfig; onClose: () => void }> = (props) => {
  const [app, setApp] = createStore<AppConfig>({ ...props.app });
  const [saving, setSaving] = createSignal(false);
  const [showInjection, setShowInjection] = createSignal(false);
  const [uaPresets, setUaPresets] = createSignal<[string, string][]>([]);
  const [uaMode, setUaMode] = createSignal<string>(props.app.user_agent ? "custom" : "default");

  onMount(async () => {
    try {
      const presets = await getUaPresets();
      setUaPresets(presets);
      if (app.user_agent) {
        const match = presets.find(([, ua]) => ua === app.user_agent);
        setUaMode(match ? match[0] : "custom");
      } else {
        setUaMode("default");
      }
    } catch (err) {
      console.error("Failed to load UA presets:", err);
    }
  });

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
        <SettingRow label="Icon">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
              {app.icon && app.icon.startsWith("data:") ? (
                <img src={app.icon} class="w-8 h-8 rounded-lg object-cover" alt="" />
              ) : app.icon && app.icon.length <= 2 ? (
                <span class="text-lg">{app.icon}</span>
              ) : (
                <span class="text-sm font-bold text-gray-500">{app.name.charAt(0)}</span>
              )}
            </div>
            <TextInput value={app.icon} onChange={(v) => setApp("icon", v)} class="w-24" placeholder="🌐" />
          </div>
        </SettingRow>
        <SettingRow label="Sidebar section">
          <TextInput value={app.sidebar_section} onChange={(v) => setApp("sidebar_section", v)} placeholder="(none)" />
        </SettingRow>
        <SettingRow label="Workspace">
          <TextInput value={app.workspace} onChange={(v) => setApp("workspace", v)} placeholder="default" />
        </SettingRow>
        <SettingRow label="User Agent" description="Override the browser user agent string">
          <div class="flex flex-col gap-1.5">
            <SelectDropdown
              value={uaMode()}
              options={[
                { value: "default", label: "Default" },
                ...uaPresets().map(([name]) => ({ value: name, label: name })),
                { value: "custom", label: "Custom" },
              ]}
              onChange={(v) => {
                setUaMode(v);
                if (v === "default") {
                  setApp("user_agent", "");
                } else if (v === "custom") {
                  // Keep current value
                } else {
                  const preset = uaPresets().find(([name]) => name === v);
                  if (preset) setApp("user_agent", preset[1]);
                }
              }}
            />
            <Show when={uaMode() === "custom"}>
              <TextInput value={app.user_agent} onChange={(v) => setApp("user_agent", v)} class="w-64" placeholder="Custom user agent..." />
            </Show>
          </div>
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
        <Show when={app.dark_mode !== "off"}>
          <SettingRow label="Brightness" description="Dark mode brightness (50-150)">
            <input
              type="range"
              min="50"
              max="150"
              value={app.dark_mode_brightness}
              onInput={(e) => setApp("dark_mode_brightness", parseInt(e.currentTarget.value))}
              class="w-32"
            />
            <span class="text-xs text-gray-400 ml-2 w-8">{app.dark_mode_brightness}</span>
          </SettingRow>
          <SettingRow label="Contrast" description="Dark mode contrast (50-150)">
            <input
              type="range"
              min="50"
              max="150"
              value={app.dark_mode_contrast}
              onInput={(e) => setApp("dark_mode_contrast", parseInt(e.currentTarget.value))}
              class="w-32"
            />
            <span class="text-xs text-gray-400 ml-2 w-8">{app.dark_mode_contrast}</span>
          </SettingRow>
          <SettingRow label="Sepia" description="Dark mode sepia (0-100)">
            <input
              type="range"
              min="0"
              max="100"
              value={app.dark_mode_sepia}
              onInput={(e) => setApp("dark_mode_sepia", parseInt(e.currentTarget.value))}
              class="w-32"
            />
            <span class="text-xs text-gray-400 ml-2 w-8">{app.dark_mode_sepia}</span>
          </SettingRow>
          <SettingRow label="Background color" description="Override dark mode background">
            <TextInput value={app.dark_mode_bg_color} onChange={(v) => setApp("dark_mode_bg_color", v)} class="w-32" placeholder="#1a1a1a" />
          </SettingRow>
          <SettingRow label="Text color" description="Override dark mode text color">
            <TextInput value={app.dark_mode_text_color} onChange={(v) => setApp("dark_mode_text_color", v)} class="w-32" placeholder="#e0e0e0" />
          </SettingRow>
        </Show>
        <SettingRow label="Auto-hibernate timeout" description="Minutes of inactivity (0 = never)">
          <TextInput value={String(app.hibernation_timeout_minutes)} onChange={(v) => setApp("hibernation_timeout_minutes", parseInt(v) || 0)} class="w-20" />
        </SettingRow>
        <SettingRow label="Zoom level" description="Page zoom level (50-200%)">
          <div class="flex items-center gap-2">
            <input
              type="range"
              min="50"
              max="200"
              step="10"
              value={app.zoom_level}
              onInput={(e) => setApp("zoom_level", parseInt(e.currentTarget.value))}
              class="w-32"
            />
            <span class="text-xs text-gray-400 w-10">{app.zoom_level}%</span>
          </div>
        </SettingRow>
        <SettingRow label="Proxy" description="HTTP/SOCKS5 proxy (protocol://host:port)">
          <div class="flex flex-col gap-1">
            <TextInput value={app.proxy} onChange={(v) => setApp("proxy", v)} class="w-64" placeholder="socks5://127.0.0.1:1080" />
            <Show when={isMac && app.proxy.length > 0}>
              <span class="text-xs text-yellow-600 dark:text-yellow-400">⚠️ Per-app proxy on macOS requires a local proxy workaround.</span>
            </Show>
          </div>
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
        <SettingRow label="Suppress high-usage alerts" description="Don't show CPU alerts for this app">
          <ToggleSwitch checked={app.suppress_high_usage_alert} onChange={(v) => setApp("suppress_high_usage_alert", v)} />
        </SettingRow>
        <SettingRow label="Custom CSS/JS" description="Inject custom styles and scripts">
          <Button onClick={() => setShowInjection(true)}>Edit</Button>
        </SettingRow>
      </div>

      <div class="flex justify-end gap-2 mt-4">
        <Button onClick={props.onClose}>Cancel</Button>
        <Button variant="primary" onClick={save} disabled={saving()}>
          {saving() ? "Saving..." : "Save"}
        </Button>
      </div>
      <Show when={showInjection()}>
        <InjectionEditor
          app={{ ...app }}
          onSave={async (_updated) => {
            await refreshAppConfigs();
            setShowInjection(false);
          }}
          onClose={() => setShowInjection(false)}
        />
      </Show>
    </div>
  );
};

const AppsTab: Component = () => {
  const [editingAppId, setEditingAppId] = createSignal<string | null>(null);
  const [showAddApp, setShowAddApp] = createSignal(false);

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
        <Button variant="primary" onClick={() => setShowAddApp(true)}>+ Add App</Button>
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
                  <div class="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center text-xs font-bold text-gray-500 overflow-hidden">
                    {app.icon && app.icon.startsWith("data:") ? (
                      <img src={app.icon} class="w-8 h-8 rounded-lg object-cover" alt="" />
                    ) : app.icon && app.icon.length <= 2 ? (
                      <span class="text-lg">{app.icon}</span>
                    ) : (
                      app.name.charAt(0).toUpperCase()
                    )}
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

      <Show when={showAddApp()}>
        <AddAppDialog onClose={() => setShowAddApp(false)} />
      </Show>
    </div>
  );
};

export default AppsTab;
