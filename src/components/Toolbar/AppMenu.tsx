import { Component, createSignal, onMount, onCleanup, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { reloadApp, hibernateApp, disableApp, getConfig } from "../../lib/ipc";
import { appStates, setSettingsVisible } from "../../stores/uiStore";

interface AppMenuProps {
  appId: string;
}

type MenuItem = { label: string; action: string };

const baseMenuItems: MenuItem[] = [
  { label: "Reload", action: "reload" },
  { label: "Hibernate", action: "hibernate" },
  { label: "Disable", action: "disable" },
  { label: "---", action: "separator" },
  { label: "Open in External Browser", action: "open-external" },
  { label: "Edit Settings", action: "edit-settings" },
];

const AppMenu: Component<AppMenuProps> = (props) => {
  const [open, setOpen] = createSignal(false);
  const [menuPos, setMenuPos] = createSignal({ x: 0, y: 0 });
  let buttonRef: HTMLButtonElement | undefined;
  const [devMode, setDevMode] = createSignal(false);

  const menuItems = (): MenuItem[] => {
    const items = [...baseMenuItems];
    if (devMode()) {
      items.push({ label: "Inject Console", action: "inject-console" });
    }
    return items;
  };

  const toggleMenu = () => {
    if (!open() && buttonRef) {
      const rect = buttonRef.getBoundingClientRect();
      setMenuPos({ x: rect.right - 180, y: rect.bottom + 4 });
    }
    setOpen(!open());
  };

  const handleAction = async (action: string) => {
    try {
      switch (action) {
        case "reload":
          await reloadApp(props.appId);
          break;
        case "hibernate":
          await hibernateApp(props.appId);
          break;
        case "disable":
          await disableApp(props.appId);
          break;
        case "open-external": {
          const state = appStates.find((s) => s.id === props.appId);
          if (state?.current_url) {
            const { open } = await import("@tauri-apps/plugin-shell");
            await open(state.current_url);
          }
          break;
        }
        case "edit-settings":
          setSettingsVisible(true);
          break;
        default:
          break;
      }
    } catch (err) {
      console.error(`Failed to execute ${action}:`, err);
    }
    setOpen(false);
  };

  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest("[data-app-menu]")) {
      setOpen(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
    }
  };

  onMount(async () => {
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    try {
      const config = await getConfig();
      setDevMode(config.general.developer_mode);
    } catch {}
  });

  onCleanup(() => {
    document.removeEventListener("mousedown", handleClickOutside);
    document.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <>
      <button
        ref={buttonRef}
        data-app-menu
        class="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
        onClick={toggleMenu}
        title="App menu"
        aria-label="App menu"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      <Show when={open()}>
        <Portal>
          <div
            data-app-menu
            class="fixed z-50 min-w-[180px] bg-white dark:bg-[#2D2D2D] border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1"
            style={{
              left: `${menuPos().x}px`,
              top: `${menuPos().y}px`,
            }}
          >
            {menuItems().map((item) =>
              item.action === "separator" ? (
                <div class="h-px bg-gray-200 dark:bg-gray-700 my-1" />
              ) : (
                <button
                  class="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleAction(item.action)}
                >
                  {item.label}
                </button>
              )
            )}
          </div>
        </Portal>
      </Show>
    </>
  );
};

export default AppMenu;
