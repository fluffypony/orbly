import { Component, For, onMount } from "solid-js";
import { createStore } from "solid-js/store";
import { SettingSection, SettingRow, ToggleSwitch, SelectDropdown } from "../SettingsControls";
import { getConfig, updateGeneralConfig, updateApp } from "../../../lib/ipc";
import { refreshAppConfigs } from "../../../lib/stateSync";
import { appConfigs } from "../../../stores/uiStore";
import type { GeneralConfig, NotificationStyle } from "../../../types/config";

const DAYS = [
  { value: "mon", label: "Mon" },
  { value: "tue", label: "Tue" },
  { value: "wed", label: "Wed" },
  { value: "thu", label: "Thu" },
  { value: "fri", label: "Fri" },
  { value: "sat", label: "Sat" },
  { value: "sun", label: "Sun" },
];

const NotificationsTab: Component = () => {
  const [config, setConfig] = createStore<GeneralConfig>({
    config_version: 1,
    theme: "system",
    dnd_enabled: false,
    dnd_schedule_enabled: false,
    dnd_schedule_start: "18:00",
    dnd_schedule_end: "09:00",
    dnd_schedule_days: ["mon", "tue", "wed", "thu", "fri"],
    tray_mode: true,
    show_badge_in_tray: true,
    launch_at_login: false,
    check_for_updates: true,
    developer_mode: false,
    scrollbar_color: null,
    selection_color: null,
    local_scripts_only: false,
    cpu_alert_threshold: 30,
    recipe_cache_ttl_hours: 24,
    window_state: { maximized: false },
  });

  let initialized = false;

  onMount(async () => {
    try {
      const fullConfig = await getConfig();
      setConfig(fullConfig.general);
      initialized = true;
    } catch (err) {
      console.error("Failed to load config:", err);
    }
  });

  const saveGeneral = async (updates: Partial<GeneralConfig>) => {
    setConfig(updates);
    if (!initialized) return;
    try {
      const latest = await getConfig();
      await updateGeneralConfig({ ...config, window_state: latest.general.window_state });
    } catch (err) {
      console.error("Failed to save config:", err);
    }
  };

  const toggleDay = (day: string) => {
    const days = config.dnd_schedule_days;
    const newDays = days.includes(day) ? days.filter(d => d !== day) : [...days, day];
    saveGeneral({ dnd_schedule_days: newDays });
  };

  const updateAppNotification = async (appId: string, style: NotificationStyle) => {
    const app = appConfigs.find(a => a.id === appId);
    if (!app) return;
    try {
      await updateApp({ ...app, notification_style: style });
      await refreshAppConfigs();
    } catch (err) {
      console.error("Failed to update app notification:", err);
    }
  };

  return (
    <div>
      <SettingSection title="Notifications" description="Control how and when you receive notifications" />

      <SettingRow label="Do Not Disturb" description="Suppress all notifications">
        <ToggleSwitch checked={config.dnd_enabled} onChange={(v) => saveGeneral({ dnd_enabled: v })} />
      </SettingRow>

      <SettingRow label="Work hours schedule" description="Auto-enable DND outside work hours">
        <ToggleSwitch checked={config.dnd_schedule_enabled} onChange={(v) => saveGeneral({ dnd_schedule_enabled: v })} />
      </SettingRow>

      {config.dnd_schedule_enabled && (
        <div class="py-3 border-b border-gray-100 dark:border-gray-800 pl-4 space-y-3">
          <div class="flex items-center gap-4">
            <label class="text-xs text-gray-500 w-12">Start</label>
            <input
              type="time"
              value={config.dnd_schedule_start}
              onInput={(e) => saveGeneral({ dnd_schedule_start: e.currentTarget.value })}
              class="bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md px-2 py-1 text-sm text-gray-800 dark:text-gray-200"
            />
            <label class="text-xs text-gray-500 w-12">End</label>
            <input
              type="time"
              value={config.dnd_schedule_end}
              onInput={(e) => saveGeneral({ dnd_schedule_end: e.currentTarget.value })}
              class="bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md px-2 py-1 text-sm text-gray-800 dark:text-gray-200"
            />
          </div>
          <div class="flex gap-1">
            <For each={DAYS}>
              {(day) => (
                <button
                  class={`px-2 py-1 text-xs rounded cursor-pointer ${
                    config.dnd_schedule_days.includes(day.value)
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                  }`}
                  onClick={() => toggleDay(day.value)}
                >
                  {day.label}
                </button>
              )}
            </For>
          </div>
        </div>
      )}

      <div class="mt-6">
        <h4 class="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">Per-App Notification Style</h4>
        <div class="space-y-0">
          <For each={[...appConfigs]}>
            {(app) => (
              <SettingRow label={app.name}>
                <SelectDropdown
                  value={app.notification_style}
                  options={[
                    { value: "full", label: "Full" },
                    { value: "private", label: "Private" },
                    { value: "off", label: "Off" },
                  ]}
                  onChange={(v) => updateAppNotification(app.id, v as NotificationStyle)}
                />
              </SettingRow>
            )}
          </For>
        </div>
      </div>
    </div>
  );
};

export default NotificationsTab;
