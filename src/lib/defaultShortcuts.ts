import type { ShortcutBinding } from "./shortcuts";
import type { ShortcutConfig } from "../types/config";

export interface ShortcutHandlers {
  quickSwitcher: () => void;
  toggleSidebar: () => void;
  toggleDnd: () => void;
  nextApp: () => void;
  prevApp: () => void;
  reloadCurrentApp: () => void;
  appsManager: () => void;
  downloads: () => void;
  settings: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomReset: () => void;
  findInPage: () => void;
  globalMute: () => void;
  switchToApp: (index: number) => void;
}

export function createDefaultBindings(
  handlers: ShortcutHandlers,
  overrides?: ShortcutConfig,
): ShortcutBinding[] {
  const bindings: ShortcutBinding[] = [
    { action: "quick_switcher", keys: "CmdOrCtrl+K", global: false, handler: handlers.quickSwitcher },
    { action: "toggle_sidebar", keys: "CmdOrCtrl+\\", global: false, handler: handlers.toggleSidebar },
    { action: "toggle_dnd", keys: "CmdOrCtrl+Shift+D", global: false, handler: handlers.toggleDnd },
    { action: "next_app", keys: "CmdOrCtrl+]", global: false, handler: handlers.nextApp },
    { action: "prev_app", keys: "CmdOrCtrl+[", global: false, handler: handlers.prevApp },
    { action: "reload_app", keys: "CmdOrCtrl+R", global: false, handler: handlers.reloadCurrentApp },
    { action: "apps_manager", keys: "CmdOrCtrl+Shift+A", global: false, handler: handlers.appsManager },
    { action: "downloads", keys: "CmdOrCtrl+J", global: false, handler: handlers.downloads },
    { action: "settings", keys: "CmdOrCtrl+,", global: false, handler: handlers.settings },
    { action: "zoom_in", keys: "CmdOrCtrl+=", global: false, handler: handlers.zoomIn },
    { action: "zoom_out", keys: "CmdOrCtrl+-", global: false, handler: handlers.zoomOut },
    { action: "zoom_reset", keys: "CmdOrCtrl+0", global: false, handler: handlers.zoomReset },
    { action: "find_in_page", keys: "CmdOrCtrl+F", global: false, handler: handlers.findInPage },
    { action: "global_mute", keys: "CmdOrCtrl+Shift+M", global: false, handler: handlers.globalMute },
    ...Array.from({ length: 9 }, (_, i) => ({
      action: `switch_to_app_${i + 1}`,
      keys: `CmdOrCtrl+${i + 1}`,
      global: false,
      handler: () => handlers.switchToApp(i),
    })),
  ];

  if (overrides) {
    const overrideMap: Record<string, string> = {
      quick_switcher: overrides.quick_switcher,
      toggle_sidebar: overrides.toggle_sidebar,
      toggle_dnd: overrides.toggle_dnd,
      next_app: overrides.next_app,
      prev_app: overrides.prev_app,
      global_mute: overrides.global_mute,
    };
    for (const binding of bindings) {
      if (overrideMap[binding.action] && overrideMap[binding.action].trim()) {
        binding.keys = overrideMap[binding.action];
      }
    }
  }

  return bindings;
}
