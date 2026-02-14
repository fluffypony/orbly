import { Component, Show } from "solid-js";
import {
  sidebarExpanded,
  dndEnabled,
  setDndEnabled,
  activeDownloadCount,
  setDownloadsVisible,
  setAppsManagerVisible,
  setSettingsVisible,
} from "../../stores/uiStore";
import { getConfig, updateGeneralConfig } from "../../lib/ipc";

interface IconButtonProps {
  label: string;
  icon: string;
  active?: boolean;
  badge?: number;
  onClick: () => void;
}

const IconButton: Component<IconButtonProps> = (props) => {
  return (
    <button
      class={`relative flex items-center justify-center rounded-lg cursor-pointer transition-colors ${
        props.active
          ? "text-[#FF9500] dark:text-[#FF9F0A]"
          : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
      }`}
      style={{ width: "36px", height: "36px", "min-height": "36px" }}
      onClick={props.onClick}
      title={props.label}
      aria-label={props.label}
    >
      <span class="text-base">{props.icon}</span>
      <Show when={props.badge && props.badge > 0}>
        <span class="absolute -top-0.5 -right-0.5 bg-[#FF3B30] dark:bg-[#FF453A] text-white text-[9px] font-bold rounded-full min-w-[14px] h-3.5 flex items-center justify-center px-0.5">
          {props.badge! > 99 ? "99+" : props.badge}
        </span>
      </Show>
    </button>
  );
};

const SidebarFooter: Component = () => {
  return (
    <div class="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 px-1.5 py-2">
      <div
        class={`flex ${sidebarExpanded() ? "flex-row justify-around" : "flex-col items-center gap-1"}`}
      >
        <IconButton
          label={dndEnabled() ? "Disable Do Not Disturb" : "Enable Do Not Disturb"}
          icon={dndEnabled() ? "🔕" : "🔔"}
          active={dndEnabled()}
          onClick={async () => {
            const newVal = !dndEnabled();
            setDndEnabled(newVal);
            try {
              const config = await getConfig();
              await updateGeneralConfig({ ...config.general, dnd_enabled: newVal });
            } catch (err) {
              console.error("Failed to persist DND state:", err);
            }
          }}
        />
        <IconButton
          label="Downloads"
          icon="⬇️"
          badge={activeDownloadCount()}
          onClick={() => setDownloadsVisible((v) => !v)}
        />
        <IconButton
          label="Settings"
          icon="⚙️"
          onClick={() => setSettingsVisible((v) => !v)}
        />
        <IconButton
          label="Resource Monitor"
          icon="📊"
          onClick={() => setAppsManagerVisible((v) => !v)}
        />
      </div>
    </div>
  );
};

export default SidebarFooter;
