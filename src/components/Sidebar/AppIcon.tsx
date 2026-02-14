import { Component, Show } from "solid-js";
import { sidebarExpanded, activeAppId } from "../../stores/uiStore";

interface AppIconProps {
  id: string;
  name: string;
  state: "active" | "hibernated" | "disabled";
  badgeCount: number | null;
  icon?: string;
  audioMuted: boolean;
  onClick: (id: string) => void;
  onContextMenu: (e: MouseEvent, id: string) => void;
}

const AppIcon: Component<AppIconProps> = (props) => {
  const isActive = () => activeAppId() === props.id;
  const opacity = () => {
    if (props.state === "disabled") return "opacity-30";
    if (props.state === "hibernated") return "opacity-50";
    return "opacity-100";
  };

  return (
    <button
      class={`relative flex items-center gap-3 w-full px-2 py-1.5 rounded-lg cursor-pointer ${opacity()} ${
        isActive()
          ? "bg-[#E8E8ED] dark:bg-[#2D2D2D]"
          : "hover:bg-gray-100 dark:hover:bg-gray-800"
      }`}
      onClick={() => props.onClick(props.id)}
      onContextMenu={(e) => {
        e.preventDefault();
        props.onContextMenu(e, props.id);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          const next = (e.currentTarget as HTMLElement).closest("[role='option']")?.nextElementSibling?.querySelector("button");
          if (next instanceof HTMLElement) next.focus();
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          const prev = (e.currentTarget as HTMLElement).closest("[role='option']")?.previousElementSibling?.querySelector("button");
          if (prev instanceof HTMLElement) prev.focus();
        }
      }}
      title={props.name}
      aria-label={`${props.name}, ${props.state}${props.badgeCount && props.badgeCount > 0 ? `, ${props.badgeCount} unread` : props.badgeCount && props.badgeCount < 0 ? ', unread' : ''}`}
      style={{ "min-height": "44px" }}
    >
      <div class="relative w-10 h-10 flex items-center justify-center flex-shrink-0">
        <div class="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white text-sm font-medium overflow-hidden">
          {props.icon && props.icon.startsWith("data:") ? (
            <img src={props.icon} class="w-8 h-8 rounded-lg object-cover" alt="" />
          ) : props.icon && props.icon.length <= 2 ? (
            <span class="text-lg">{props.icon}</span>
          ) : (
            props.name.charAt(0).toUpperCase()
          )}
        </div>

        <Show
          when={
            props.badgeCount !== null &&
            props.badgeCount !== undefined &&
            props.badgeCount !== 0 &&
            props.state !== "disabled"
          }
        >
          <span class="absolute -top-0.5 -right-0.5 bg-[#FF3B30] dark:bg-[#FF453A] text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
            {props.badgeCount! > 99 ? "99+" : props.badgeCount! > 0 ? props.badgeCount : "•"}
          </span>
        </Show>

        <Show when={props.audioMuted}>
          <span class="absolute -bottom-0.5 -right-0.5 text-[10px]">🔇</span>
        </Show>

        <Show when={props.state === "hibernated"}>
          <span class="absolute -bottom-0.5 left-0 text-[9px]">💤</span>
        </Show>

        <Show when={props.state === "disabled"}>
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="w-8 h-0.5 bg-gray-500 rotate-45 absolute" />
          </div>
        </Show>
      </div>

      <Show when={sidebarExpanded()}>
        <span class="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
          {props.name}
        </span>
      </Show>
    </button>
  );
};

export default AppIcon;
