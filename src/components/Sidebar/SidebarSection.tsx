import { Component, Show } from "solid-js";
import { sidebarExpanded } from "../../stores/uiStore";

const SidebarSection: Component<{ label: string }> = (props) => {
  return (
    <div class="flex items-center gap-2 px-2 py-1.5">
      <div class="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
      <Show when={sidebarExpanded()}>
        <span class="text-[10px] font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">
          {props.label}
        </span>
        <div class="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
      </Show>
    </div>
  );
};

export default SidebarSection;
