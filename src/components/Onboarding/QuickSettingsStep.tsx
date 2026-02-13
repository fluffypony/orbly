import { Component, createSignal } from "solid-js";
import type { ThemeMode } from "../../types/config";

interface QuickSettingsStepProps {
  onNext: (settings: { theme: ThemeMode; dndScheduleEnabled: boolean; dndStart: string; dndEnd: string; launchAtLogin: boolean }) => void;
  onBack: () => void;
}

const QuickSettingsStep: Component<QuickSettingsStepProps> = (props) => {
  const [theme, setTheme] = createSignal<ThemeMode>("system");
  const [dndScheduleEnabled, setDndScheduleEnabled] = createSignal(false);
  const [dndStart, setDndStart] = createSignal("18:00");
  const [dndEnd, setDndEnd] = createSignal("09:00");
  const [launchAtLogin, setLaunchAtLogin] = createSignal(false);

  const themes: { value: ThemeMode; label: string; icon: string }[] = [
    { value: "system", label: "System", icon: "💻" },
    { value: "light", label: "Light", icon: "☀️" },
    { value: "dark", label: "Dark", icon: "🌙" },
  ];

  return (
    <div class="flex flex-col h-full">
      <div class="px-8 pt-8 pb-4">
        <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">Quick Settings</h2>
        <p class="text-sm text-gray-400 dark:text-gray-500 mb-6">Customize your experience. You can change these anytime in Settings.</p>
      </div>

      <div class="flex-1 px-8 space-y-6">
        {/* Theme */}
        <div>
          <label class="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3 block">Theme</label>
          <div class="flex gap-3">
            {themes.map(t => (
              <button
                class={`flex-1 flex flex-col items-center gap-1.5 p-4 rounded-lg border cursor-pointer transition-all ${
                  theme() === t.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => setTheme(t.value)}
              >
                <span class="text-2xl">{t.icon}</span>
                <span class="text-xs font-medium text-gray-700 dark:text-gray-300">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* DND Schedule */}
        <div>
          <div class="flex items-center justify-between mb-3">
            <div>
              <label class="text-sm font-medium text-gray-800 dark:text-gray-200 block">Do Not Disturb Schedule</label>
              <p class="text-xs text-gray-400 mt-0.5">Automatically mute notifications outside work hours</p>
            </div>
            <button
              class={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${dndScheduleEnabled() ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}
              onClick={() => setDndScheduleEnabled(!dndScheduleEnabled())}
              role="switch"
              aria-checked={dndScheduleEnabled()}
            >
              <div class={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${dndScheduleEnabled() ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>
          {dndScheduleEnabled() && (
            <div class="flex items-center gap-3 ml-1">
              <div class="flex items-center gap-2">
                <span class="text-xs text-gray-500">From</span>
                <input
                  type="time"
                  value={dndStart()}
                  onInput={(e) => setDndStart(e.currentTarget.value)}
                  class="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 text-sm text-gray-800 dark:text-gray-200 outline-none"
                />
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-gray-500">To</span>
                <input
                  type="time"
                  value={dndEnd()}
                  onInput={(e) => setDndEnd(e.currentTarget.value)}
                  class="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 text-sm text-gray-800 dark:text-gray-200 outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Launch at login */}
        <div class="flex items-center justify-between">
          <div>
            <label class="text-sm font-medium text-gray-800 dark:text-gray-200 block">Launch at Login</label>
            <p class="text-xs text-gray-400 mt-0.5">Start Orbly automatically when you log in</p>
          </div>
          <button
            class={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${launchAtLogin() ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}
            onClick={() => setLaunchAtLogin(!launchAtLogin())}
            role="switch"
            aria-checked={launchAtLogin()}
          >
            <div class={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${launchAtLogin() ? 'left-5' : 'left-0.5'}`} />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div class="flex justify-between px-8 py-4">
        <button
          class="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer"
          onClick={props.onBack}
        >
          ← Back
        </button>
        <button
          class="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
          onClick={() => props.onNext({
            theme: theme(),
            dndScheduleEnabled: dndScheduleEnabled(),
            dndStart: dndStart(),
            dndEnd: dndEnd(),
            launchAtLogin: launchAtLogin(),
          })}
        >
          Next →
        </button>
      </div>
    </div>
  );
};

export default QuickSettingsStep;
