import { Component, For, onMount, createSignal, Show, onCleanup } from "solid-js";
import { SettingSection, Button } from "../SettingsControls";
import { getConfig, importConfigJson } from "../../../lib/ipc";
import type { ShortcutConfig } from "../../../types/config";

const SHORTCUT_LABELS: { key: keyof ShortcutConfig; label: string }[] = [
  { key: "quick_switcher", label: "Quick Switcher" },
  { key: "toggle_dnd", label: "Toggle DND" },
  { key: "toggle_sidebar", label: "Toggle Sidebar" },
  { key: "next_app", label: "Next App" },
  { key: "prev_app", label: "Previous App" },
  { key: "global_mute", label: "Global Mute" },
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
  ...Array.from({ length: 9 }, (_, i) => ({
    label: `Switch to App ${i + 1}`,
    binding: `CmdOrCtrl+${i + 1}`,
  })),
];

const DEFAULT_SHORTCUTS: ShortcutConfig = {
  quick_switcher: "CmdOrCtrl+K",
  toggle_dnd: "CmdOrCtrl+Shift+D",
  toggle_sidebar: "CmdOrCtrl+\\",
  next_app: "CmdOrCtrl+]",
  prev_app: "CmdOrCtrl+[",
  global_mute: "CmdOrCtrl+Shift+M",
};

const isMac = navigator.platform.includes("Mac");

const formatKey = (key: string): string => {
  return key.replace("CmdOrCtrl", isMac ? "⌘" : "Ctrl");
};

const keyEventToShortcut = (e: KeyboardEvent): string | null => {
  const parts: string[] = [];
  if (isMac ? e.metaKey : e.ctrlKey) parts.push("CmdOrCtrl");
  if (e.shiftKey) parts.push("Shift");
  if (e.altKey) parts.push("Alt");

  const key = e.key;
  if (["Meta", "Control", "Shift", "Alt"].includes(key)) return null;

  const keyStr = key.length === 1 ? key.toUpperCase() : key;
  parts.push(keyStr);
  return parts.join("+");
};

const ShortcutsTab: Component = () => {
  const [shortcuts, setShortcuts] = createSignal<ShortcutConfig>({ ...DEFAULT_SHORTCUTS });
  const [recording, setRecording] = createSignal<keyof ShortcutConfig | null>(null);
  const [conflict, setConflict] = createSignal<string | null>(null);

  onMount(async () => {
    try {
      const config = await getConfig();
      setShortcuts(config.shortcuts);
    } catch (err) {
      console.error("Failed to load shortcuts:", err);
    }
  });

  const handleKeyDown = (e: KeyboardEvent) => {
    const rec = recording();
    if (!rec) return;
    e.preventDefault();
    e.stopPropagation();

    if (e.key === "Escape") {
      setRecording(null);
      setConflict(null);
      return;
    }

    const shortcut = keyEventToShortcut(e);
    if (!shortcut) return;

    const current = shortcuts();
    for (const item of SHORTCUT_LABELS) {
      if (item.key !== rec && current[item.key] === shortcut) {
        setConflict(`Conflicts with "${item.label}"`);
        return;
      }
    }

    for (const fixed of FIXED_SHORTCUTS) {
      if (fixed.binding === shortcut) {
        setConflict(`Conflicts with "${fixed.label}"`);
        return;
      }
    }

    setConflict(null);
    const updated = { ...shortcuts(), [rec]: shortcut };
    setShortcuts(updated);
    setRecording(null);
    saveShortcuts(updated);
  };

  const saveShortcuts = async (updated: ShortcutConfig) => {
    try {
      const fullConfig = await getConfig();
      fullConfig.shortcuts = updated;
      await importConfigJson(JSON.stringify(fullConfig));
    } catch (err) {
      console.error("Failed to save shortcuts:", err);
    }
  };

  const resetToDefaults = async () => {
    setShortcuts({ ...DEFAULT_SHORTCUTS });
    await saveShortcuts({ ...DEFAULT_SHORTCUTS });
  };

  onCleanup(() => {
    setRecording(null);
  });

  return (
    <div onKeyDown={handleKeyDown}>
      <SettingSection title="Shortcuts" description="Keyboard shortcuts for common actions. Click a binding to change it." />

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
                  <button
                    class={`px-2 py-0.5 rounded text-xs font-mono cursor-pointer transition-colors ${
                      recording() === item.key
                        ? "bg-blue-500 text-white animate-pulse"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                    onClick={() => {
                      setConflict(null);
                      setRecording(recording() === item.key ? null : item.key);
                    }}
                  >
                    {recording() === item.key ? "Press keys..." : formatKey(shortcuts()[item.key])}
                  </button>
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

      <Show when={conflict()}>
        <p class="text-xs text-red-500 mt-2">{conflict()}</p>
      </Show>

      <div class="flex justify-end mt-4">
        <Button onClick={resetToDefaults}>Reset to Defaults</Button>
      </div>
    </div>
  );
};

export default ShortcutsTab;
