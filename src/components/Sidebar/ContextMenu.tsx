import { Component, onMount, onCleanup } from "solid-js";
import { Portal } from "solid-js/web";

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
  const handleAction = (action: string) => {
    console.log(`Context menu action: ${action} for app: ${props.appId}`);
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
        {menuItems.map((item) =>
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
  );
};

export default ContextMenu;
