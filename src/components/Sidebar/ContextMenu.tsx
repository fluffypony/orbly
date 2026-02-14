import { Component, onMount, onCleanup, createSignal, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { hibernateApp, disableApp, enableApp, reloadApp, removeApp, setAudioMuted } from "../../lib/ipc";
import { refreshAppConfigs } from "../../lib/stateSync";
import { appConfigs, appStates, setSettingsVisible } from "../../stores/uiStore";
import ConfirmDialog from "../Dialogs/ConfirmDialog";

interface ContextMenuProps {
  position: { x: number; y: number };
  appId: string;
  onClose: () => void;
}

const menuItems = [
  { label: "Reload", action: "reload" },
  { label: "Hibernate", action: "hibernate" },
  { label: "Disable", action: "disable" },
  { label: "---", action: "separator" },
  { label: "Mute/Unmute Audio", action: "toggle-mute" },
  { label: "Open in External Browser", action: "open-external" },
  { label: "---", action: "separator" },
  { label: "Edit", action: "edit" },
  { label: "Remove", action: "remove" },
  { label: "---", action: "separator" },
  { label: "Move to Section", action: "move-section" },
  { label: "Move to Workspace", action: "move-workspace" },
] as const;

const ContextMenu: Component<ContextMenuProps> = (props) => {
  const [showRemoveConfirm, setShowRemoveConfirm] = createSignal(false);

  const handleAction = async (action: string) => {
    try {
      switch (action) {
        case "reload":
          await reloadApp(props.appId);
          break;
        case "hibernate":
          await hibernateApp(props.appId);
          break;
        case "disable": {
          const state = appStates.find((s) => s.id === props.appId);
          if (state?.state === "disabled") {
            await enableApp(props.appId);
          } else {
            await disableApp(props.appId);
          }
          break;
        }
        case "toggle-mute": {
          const config = appConfigs.find((a) => a.id === props.appId);
          if (config) {
            await setAudioMuted(props.appId, !config.audio_muted);
            await refreshAppConfigs();
          }
          break;
        }
        case "open-external": {
          const config = appConfigs.find((a) => a.id === props.appId);
          if (config?.url) {
            const { open } = await import("@tauri-apps/plugin-shell");
            await open(config.url);
          }
          break;
        }
        case "remove":
          setShowRemoveConfirm(true);
          return; // Don't close the menu yet
        case "edit":
          setSettingsVisible(true);
          break;
        case "move-section":
        case "move-workspace":
          break;
      }
    } catch (err) {
      console.error(`Failed to execute ${action}:`, err);
    }
    props.onClose();
  };

  const handleRemoveConfirm = async () => {
    try {
      await removeApp(props.appId);
      await refreshAppConfigs();
    } catch (err) {
      console.error("Failed to remove app:", err);
    }
    setShowRemoveConfirm(false);
    props.onClose();
  };

  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest("[data-context-menu]")) {
      props.onClose();
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      props.onClose();
    }
  };

  onMount(() => {
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
  });

  onCleanup(() => {
    document.removeEventListener("mousedown", handleClickOutside);
    document.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <Portal>
      <div
        data-context-menu
        class="fixed z-50 min-w-[180px] bg-white dark:bg-[#2D2D2D] border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1"
        style={{
          left: `${props.position.x}px`,
          top: `${props.position.y}px`,
        }}
      >
        {menuItems.map((item) => {
          if (item.action === "separator") {
            return <div class="h-px bg-gray-200 dark:bg-gray-700 my-1" />;
          }
          const label =
            item.action === "disable"
              ? appStates.find((s) => s.id === props.appId)?.state === "disabled"
                ? "Enable"
                : "Disable"
              : item.label;
          return (
            <button
              class="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
              onClick={() => handleAction(item.action)}
            >
              {label}
            </button>
          );
        })}
      </div>
      <Show when={showRemoveConfirm()}>
        <ConfirmDialog
          title="Remove App"
          message={`Are you sure you want to remove "${appConfigs.find((a) => a.id === props.appId)?.name ?? "this app"}"? This cannot be undone.`}
          confirmLabel="Remove"
          variant="danger"
          onConfirm={handleRemoveConfirm}
          onCancel={() => { setShowRemoveConfirm(false); props.onClose(); }}
        />
      </Show>
    </Portal>
  );
};

export default ContextMenu;
