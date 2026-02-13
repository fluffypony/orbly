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

const isMac = navigator.platform.toUpperCase().includes("MAC");

function matchesShortcut(e: KeyboardEvent, shortcutStr: string): boolean {
  const parts = shortcutStr
    .split("+")
    .map((p) => p.trim().toLowerCase());

  let needCmdOrCtrl = false;
  let needShift = false;
  let needAlt = false;
  let targetKey = "";

  for (const part of parts) {
    switch (part) {
      case "cmdorctrl":
        needCmdOrCtrl = true;
        break;
      case "cmd":
        needCmdOrCtrl = true;
        break;
      case "ctrl":
        needCmdOrCtrl = true;
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

  const cmdOrCtrlPressed = isMac ? e.metaKey : e.ctrlKey;
  if (needCmdOrCtrl !== cmdOrCtrlPressed) return false;
  // On Mac, reject if Ctrl is also pressed (unless we need it)
  if (isMac && !needCmdOrCtrl && e.metaKey) return false;
  if (needAlt !== e.altKey) return false;

  const eventKey = e.key.toLowerCase();
  const eventCode = e.code.toLowerCase();

  // For zoom keys, match by physical key code and ignore Shift
  // (Shift+= produces "+" on most keyboards)
  if (targetKey === "=") return eventCode === "equal";
  if (targetKey === "-") return eventCode === "minus";

  // For all other shortcuts, Shift must match exactly
  if (needShift !== e.shiftKey) return false;

  if (targetKey === "\\") return eventKey === "\\";
  if (targetKey === ",") return eventKey === ",";
  if (targetKey === "[") return eventKey === "[";
  if (targetKey === "]") return eventKey === "]";
  if (targetKey === "tab") return eventKey === "tab";

  return eventKey === targetKey;
}
