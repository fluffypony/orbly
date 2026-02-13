import { Component, For, onMount, createSignal } from "solid-js";
import { SettingSection } from "../SettingsControls";
import { getConfig } from "../../../lib/ipc";
import type { ShortcutConfig } from "../../../types/config";

const SHORTCUT_LABELS: { key: keyof ShortcutConfig; label: string }[] = [
  { key: "quick_switcher", label: "Quick Switcher" },
  { key: "toggle_dnd", label: "Toggle DND" },
  { key: "toggle_sidebar", label: "Toggle Sidebar" },
  { key: "next_app", label: "Next App" },
  { key: "prev_app", label: "Previous App" },
];

const FIXED_SHORTCUTS: { label: string; binding: string }[] = [
  { label: "Reload Current App", binding: "CmdOrCtrl+R" },
  { label: "Apps Manager", binding: "CmdOrCtrl+Shift+A" },
  { label: "Downloads", binding: "CmdOrCtrl+J" },
  { label: "Settings", binding: "CmdOrCtrl+," },
  { label: "Zoom In", binding: "CmdOrCtrl+=" },
  { label: "Zoom Out", binding: "CmdOrCtrl+-" },
  { label: "Zoom Reset", binding: "CmdOrCtrl+0" },
  { label: "Find in Page", binding: "CmdOrCtrl+F" },
  { label: "Switch to App 1–9", binding: "CmdOrCtrl+1–9" },
];

const formatKey = (key: string): string => {
  return key.replace("CmdOrCtrl", navigator.platform.includes("Mac") ? "⌘" : "Ctrl");
};

const ShortcutsTab: Component = () => {
  const [shortcuts, setShortcuts] = createSignal<ShortcutConfig>({
    quick_switcher: "CmdOrCtrl+K",
    toggle_dnd: "CmdOrCtrl+Shift+D",
    toggle_sidebar: "CmdOrCtrl+\\",
    next_app: "CmdOrCtrl+]",
    prev_app: "CmdOrCtrl+[",
  });

  onMount(async () => {
    try {
      const config = await getConfig();
      setShortcuts(config.shortcuts);
    } catch (err) {
      console.error("Failed to load shortcuts:", err);
    }
  });

  return (
    <div>
      <SettingSection title="Shortcuts" description="Keyboard shortcuts for common actions" />

      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-200 dark:border-gray-700">
            <th class="text-left py-2 font-medium text-gray-600 dark:text-gray-400">Action</th>
            <th class="text-right py-2 font-medium text-gray-600 dark:text-gray-400">Binding</th>
          </tr>
        </thead>
        <tbody>
          <For each={SHORTCUT_LABELS}>
            {(item) => (
              <tr class="border-b border-gray-100 dark:border-gray-800">
                <td class="py-2.5 text-gray-800 dark:text-gray-200">{item.label}</td>
                <td class="py-2.5 text-right">
                  <kbd class="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono text-gray-700 dark:text-gray-300">
                    {formatKey(shortcuts()[item.key])}
                  </kbd>
                </td>
              </tr>
            )}
          </For>
          <For each={FIXED_SHORTCUTS}>
            {(item) => (
              <tr class="border-b border-gray-100 dark:border-gray-800">
                <td class="py-2.5 text-gray-800 dark:text-gray-200">{item.label}</td>
                <td class="py-2.5 text-right">
                  <kbd class="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono text-gray-700 dark:text-gray-300">
                    {formatKey(item.binding)}
                  </kbd>
                </td>
              </tr>
            )}
          </For>
        </tbody>
      </table>

      <p class="text-xs text-gray-400 mt-4">
        Shortcut customization will be available in a future update.
      </p>
    </div>
  );
};

export default ShortcutsTab;
