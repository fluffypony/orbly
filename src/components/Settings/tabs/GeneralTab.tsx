import { Component, createSignal, onMount, For, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { SettingSection, SettingRow, ToggleSwitch, SelectDropdown, TextInput } from "../SettingsControls";
import { getConfig, updateGeneralConfig, getCertificateExceptions, removeCertificateException, setLaunchAtLogin } from "../../../lib/ipc";
import { setTheme } from "../../../stores/uiStore";
import RecipeStatusPanel from "../RecipeStatusPanel";
import type { GeneralConfig } from "../../../types/config";

const GeneralTab: Component = () => {
  const [certExceptions, setCertExceptions] = createSignal<[string, string][]>([]);
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
    sidebar_hover_expand: true,
    recipe_cache_ttl_hours: 24,
    recipe_manifest_url: null,
    window_state: { maximized: false },
  });

  let initialized = false;

  onMount(async () => {
    try {
      const fullConfig = await getConfig();
      setConfig(fullConfig.general);
      initialized = true;
      const certs = await getCertificateExceptions();
      setCertExceptions(certs);
    } catch (err) {
      console.error("Failed to load general config:", err);
    }
  });

  const save = async (updates: Partial<GeneralConfig>) => {
    setConfig(updates);
    if (updates.theme) {
      setTheme(updates.theme);
    }
    if (!initialized) return;
    try {
      const latest = await getConfig();
      await updateGeneralConfig({ ...config, window_state: latest.general.window_state });
    } catch (err) {
      console.error("Failed to save general config:", err);
    }
  };

  const handleRemoveCert = async (host: string) => {
    try {
      await removeCertificateException(host);
      setCertExceptions(certExceptions().filter(([h]) => h !== host));
    } catch (err) {
      console.error("Failed to remove certificate exception:", err);
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
          onChange={async (v) => {
            save({ launch_at_login: v });
            try { await setLaunchAtLogin(v); } catch (err) { console.error("Failed to set launch at login:", err); }
          }}
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

      <SettingRow label="Developer mode" description="Show developer tools like Inject Console in the app menu">
        <ToggleSwitch
          checked={config.developer_mode}
          onChange={(v) => save({ developer_mode: v })}
        />
      </SettingRow>

      <SettingRow label="Sidebar hover expand" description="Expand sidebar when hovering over it">
        <ToggleSwitch
          checked={config.sidebar_hover_expand}
          onChange={(v) => save({ sidebar_hover_expand: v })}
        />
      </SettingRow>

      <SettingRow label="Local scripts only" description="Disable remote recipe fetching (badge scripts, CSS/JS)">
        <ToggleSwitch
          checked={config.local_scripts_only}
          onChange={(v) => save({ local_scripts_only: v })}
        />
      </SettingRow>

      <SettingRow label="CPU alert threshold" description="Alert when an app exceeds this CPU % for 30+ seconds">
        <input
          type="number"
          min="10"
          max="100"
          value={config.cpu_alert_threshold}
          onInput={(e) => save({ cpu_alert_threshold: parseInt(e.currentTarget.value) || 30 })}
          class="w-20 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md px-2 py-1 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
        />
      </SettingRow>

      <SettingRow label="Scrollbar color" description="CSS color for scrollbars (empty for default)">
        <TextInput
          value={config.scrollbar_color ?? ''}
          onChange={(v) => save({ scrollbar_color: v || null })}
          placeholder="e.g. #888"
          class="w-32"
        />
      </SettingRow>

      <SettingRow label="Selection color" description="CSS color for text selection (empty for default)">
        <TextInput
          value={config.selection_color ?? ''}
          onChange={(v) => save({ selection_color: v || null })}
          placeholder="e.g. #0088ff"
          class="w-32"
        />
      </SettingRow>

      <SettingRow label="Recipe cache TTL (hours)" description="How long to cache remote recipes before refreshing">
        <input
          type="number"
          min="1"
          max="168"
          value={config.recipe_cache_ttl_hours}
          onInput={(e) => save({ recipe_cache_ttl_hours: parseInt(e.currentTarget.value) || 24 })}
          class="w-20 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md px-2 py-1 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
        />
      </SettingRow>

      <SettingRow label="Recipe manifest URL" description="Custom URL for the recipe manifest (leave empty for default)">
        <TextInput
          value={config.recipe_manifest_url ?? ''}
          onChange={(v) => save({ recipe_manifest_url: v || null })}
          placeholder="https://recipes.getorb.ly/manifest.json"
          class="w-64"
        />
      </SettingRow>

      <div class="mt-6">
        <h4 class="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">Certificate Exceptions</h4>
        <Show when={certExceptions().length > 0} fallback={
          <p class="text-xs text-gray-400 dark:text-gray-500">No certificate exceptions configured.</p>
        }>
          <div class="space-y-1">
            <For each={certExceptions()}>
              {([host, expiry]) => (
                <div class="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <div>
                    <p class="text-sm text-gray-800 dark:text-gray-200">{host}</p>
                    <p class="text-xs text-gray-400">Expires: {expiry}</p>
                  </div>
                  <button
                    class="text-xs text-red-500 hover:text-red-600 cursor-pointer"
                    onClick={() => handleRemoveCert(host)}
                  >
                    Remove
                  </button>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>

      <div class="mt-6">
        <h4 class="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">Remote Recipes</h4>
        <RecipeStatusPanel localScriptsOnly={config.local_scripts_only} />
      </div>
    </div>
  );
};

export default GeneralTab;
