import {
  register,
  unregister,
  isRegistered,
} from "@tauri-apps/plugin-global-shortcut";

export interface ShortcutBinding {
  action: string;
  keys: string;
  global: boolean;
  handler: () => void;
}

let localHandler: ((e: KeyboardEvent) => void) | null = null;
let registeredGlobalKeys: string[] = [];

export async function registerShortcuts(bindings: ShortcutBinding[]) {
  const globalBindings = bindings.filter((b) => b.global);
  for (const binding of globalBindings) {
    try {
      if (await isRegistered(binding.keys)) {
        await unregister(binding.keys);
      }
      await register(binding.keys, (event) => {
        if (event.state === "Pressed") {
          binding.handler();
        }
      });
      registeredGlobalKeys.push(binding.keys);
    } catch (err) {
      console.warn(`Failed to register global shortcut ${binding.keys}:`, err);
    }
  }

  const localBindings = bindings.filter((b) => !b.global);
  localHandler = (e: KeyboardEvent) => {
    for (const binding of localBindings) {
      if (matchesShortcut(e, binding.keys)) {
        e.preventDefault();
        e.stopPropagation();
        binding.handler();
        return;
      }
    }
  };
  document.addEventListener("keydown", localHandler);
}

export async function unregisterAllShortcuts() {
  for (const keys of registeredGlobalKeys) {
    try {
      await unregister(keys);
    } catch (err) {
      console.warn(`Failed to unregister global shortcut ${keys}:`, err);
    }
  }
  registeredGlobalKeys = [];

  if (localHandler) {
    document.removeEventListener("keydown", localHandler);
    localHandler = null;
  }
}

function matchesShortcut(e: KeyboardEvent, shortcutStr: string): boolean {
  const parts = shortcutStr
    .split("+")
    .map((p) => p.trim().toLowerCase());

  let needMeta = false;
  let needShift = false;
  let needAlt = false;
  let targetKey = "";

  for (const part of parts) {
    switch (part) {
      case "cmdorctrl":
      case "cmd":
      case "ctrl":
        needMeta = true;
        break;
      case "shift":
        needShift = true;
        break;
      case "alt":
      case "option":
        needAlt = true;
        break;
      default:
        targetKey = part;
        break;
    }
  }

  const metaPressed = e.metaKey || e.ctrlKey;
  if (needMeta !== metaPressed) return false;
  if (needShift !== e.shiftKey) return false;
  if (needAlt !== e.altKey) return false;

  const eventKey = e.key.toLowerCase();

  if (targetKey === "\\") return eventKey === "\\";
  if (targetKey === ",") return eventKey === ",";
  if (targetKey === "=") return eventKey === "=" || eventKey === "+";
  if (targetKey === "-") return eventKey === "-" || eventKey === "_";
  if (targetKey === "[") return eventKey === "[";
  if (targetKey === "]") return eventKey === "]";
  if (targetKey === "tab") return eventKey === "tab";

  return eventKey === targetKey;
}
