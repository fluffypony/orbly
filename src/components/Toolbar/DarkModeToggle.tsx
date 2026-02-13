import { Component } from "solid-js";
import { setAppConfigs } from "../../stores/uiStore";
import type { DarkModeType } from "../../types/config";

interface DarkModeToggleProps {
  appId: string;
  darkMode: DarkModeType;
}

const modeOrder: DarkModeType[] = ["off", "dynamic", "filter", "static"];
const modeLabels: Record<DarkModeType, string> = {
  off: "Off",
  dynamic: "Dynamic",
  filter: "Filter",
  static: "Static",
};

const DarkModeToggle: Component<DarkModeToggleProps> = (props) => {
  const cycle = () => {
    const currentIndex = modeOrder.indexOf(props.darkMode);
    const next = modeOrder[(currentIndex + 1) % modeOrder.length];
    setAppConfigs((a) => a.id === props.appId, "dark_mode", next);
  };

  const isActive = () => props.darkMode !== "off";

  return (
    <button
      class={`w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800 ${
        isActive()
          ? "text-blue-500"
          : "text-gray-500 dark:text-gray-400"
      }`}
      onClick={cycle}
      title={`Dark mode: ${modeLabels[props.darkMode]}`}
      aria-label={`Dark mode: ${modeLabels[props.darkMode]}`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill={isActive() ? "currentColor" : "none"} stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </button>
  );
};

export default DarkModeToggle;
