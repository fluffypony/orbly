import { Component, onMount } from "solid-js";
import { createStore } from "solid-js/store";
import { SettingSection, SettingRow, ToggleSwitch, SelectDropdown } from "../SettingsControls";
import { getConfig, updateGeneralConfig } from "../../../lib/ipc";
import type { GeneralConfig } from "../../../types/config";

const GeneralTab: Component = () => {
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
    window_state: { maximized: false },
  });

  let initialized = false;

  onMount(async () => {
    try {
      const fullConfig = await getConfig();
      setConfig(fullConfig.general);
      initialized = true;
    } catch (err) {
      console.error("Failed to load general config:", err);
    }
  });

  const save = async (updates: Partial<GeneralConfig>) => {
    setConfig(updates);
    if (!initialized) return;
    try {
      await updateGeneralConfig({ ...config });
    } catch (err) {
      console.error("Failed to save general config:", err);
    }
  };

  return (
    <div>
      <SettingSection title="General" description="Appearance and behavior settings" />

      <SettingRow label="Theme" description="Choose the app appearance">
        <SelectDropdown
          value={config.theme}
          options={[
            { value: "system", label: "System" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
          onChange={(v) => save({ theme: v as GeneralConfig["theme"] })}
        />
      </SettingRow>

      <SettingRow label="Launch at login" description="Start Orbly when you log in">
        <ToggleSwitch
          checked={config.launch_at_login}
          onChange={(v) => save({ launch_at_login: v })}
        />
      </SettingRow>

      <SettingRow label="Close to tray" description="Minimize to system tray instead of quitting">
        <ToggleSwitch
          checked={config.tray_mode}
          onChange={(v) => save({ tray_mode: v })}
        />
      </SettingRow>

      <SettingRow label="Show badge in tray" description="Display unread count on the tray/dock icon">
        <ToggleSwitch
          checked={config.show_badge_in_tray}
          onChange={(v) => save({ show_badge_in_tray: v })}
        />
      </SettingRow>

      <SettingRow label="Check for updates" description="Automatically check for new versions">
        <ToggleSwitch
          checked={config.check_for_updates}
          onChange={(v) => save({ check_for_updates: v })}
        />
      </SettingRow>
    </div>
  );
};

export default GeneralTab;
