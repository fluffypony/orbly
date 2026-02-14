import { Component, Switch, Match, createSignal } from "solid-js";
import WelcomeStep from "./WelcomeStep";
import AddAppsStep from "./AddAppsStep";
import QuickSettingsStep from "./QuickSettingsStep";
import DoneStep from "./DoneStep";
import { addApp, updateGeneralConfig, getConfig, setLaunchAtLogin } from "../../lib/ipc";
import type { AppConfig, ThemeMode } from "../../types/config";

interface OnboardingProps {
  onComplete: () => void;
}

const Onboarding: Component<OnboardingProps> = (props) => {
  const [step, setStep] = createSignal(0);
  const [addedCount, setAddedCount] = createSignal(0);

  const handleAddApps = async (selected: { template: { id: string; name: string; url: string; icon: string; category: string }; customName: string; customUrl: string }[]) => {
    let count = 0;
    for (let i = 0; i < selected.length; i++) {
      const s = selected[i];
      const app: AppConfig = {
        id: s.template.id + "-" + Date.now() + "-" + i,
        name: s.customName,
        service_type: s.template.id,
        url: s.customUrl,
        icon: s.template.icon,
        data_store_uuid: crypto.randomUUID(),
        enabled: true,
        hibernated: false,
        audio_muted: false,
        user_agent: "",
        custom_css: "",
        custom_js: "",
        proxy: "",
        dark_mode: "off",
        dark_mode_brightness: 100,
        dark_mode_contrast: 90,
        dark_mode_sepia: 10,
        dark_mode_bg_color: "",
        dark_mode_text_color: "",
        hibernation_timeout_minutes: 15,
        download_directory: "~/Downloads",
        skip_download_dialog: false,
        workspace: "default",
        sidebar_section: s.template.category,
        position: i,
        notification_style: "full",
        adblock_enabled: true,
        zoom_level: 100,
        suppress_high_usage_alert: false,
      };
      try {
        await addApp(app);
        count++;
      } catch (err) {
        console.error(`Failed to add app ${s.customName}:`, err);
      }
    }
    setAddedCount(count);
    setStep(2);
  };

  const handleQuickSettings = async (settings: { theme: ThemeMode; dndScheduleEnabled: boolean; dndStart: string; dndEnd: string; dndDays: string[]; launchAtLogin: boolean }) => {
    try {
      const config = await getConfig();
      const updatedGeneral = {
        ...config.general,
        theme: settings.theme,
        dnd_schedule_enabled: settings.dndScheduleEnabled,
        dnd_schedule_start: settings.dndStart,
        dnd_schedule_end: settings.dndEnd,
        dnd_schedule_days: settings.dndDays,
        launch_at_login: settings.launchAtLogin,
      };
      await updateGeneralConfig(updatedGeneral);
      await setLaunchAtLogin(settings.launchAtLogin);
    } catch (err) {
      console.error("Failed to save quick settings:", err);
    }
    setStep(3);
  };

  return (
    <div class="fixed inset-0 bg-white dark:bg-[#121212] z-50 flex items-center justify-center">
      <div class="w-[600px] max-h-[700px] flex flex-col">
        {/* Progress indicator */}
        <div class="flex justify-center gap-2 pt-6 pb-2">
          {[0, 1, 2, 3].map(i => (
            <div
              class={`w-2 h-2 rounded-full transition-colors ${
                i === step()
                  ? 'bg-blue-500'
                  : i < step()
                    ? 'bg-blue-300'
                    : 'bg-gray-300 dark:bg-gray-600'
              }`}
            />
          ))}
        </div>

        <Switch>
          <Match when={step() === 0}>
            <WelcomeStep onNext={() => setStep(1)} />
          </Match>
          <Match when={step() === 1}>
            <AddAppsStep onNext={handleAddApps} onBack={() => setStep(0)} />
          </Match>
          <Match when={step() === 2}>
            <QuickSettingsStep onNext={handleQuickSettings} onBack={() => setStep(1)} />
          </Match>
          <Match when={step() === 3}>
            <DoneStep onComplete={props.onComplete} appCount={addedCount()} />
          </Match>
        </Switch>
      </div>
    </div>
  );
};

export default Onboarding;
