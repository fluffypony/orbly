import { Component, Show, createSignal } from "solid-js";
import { sidebarExpanded } from "../../stores/uiStore";

const WorkspaceSwitcher: Component = () => {
  // Mock: only one workspace exists, so this is hidden
  const [workspaces] = createSignal([{ id: "default", name: "All Apps" }]);
  const [activeWorkspace] = createSignal("default");

  return (
    <Show when={workspaces().length > 1}>
      <div class="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-1.5 py-2">
        <div class="flex items-center gap-1 overflow-x-auto">
          {workspaces().map((ws) => (
            <button
              class={`flex-shrink-0 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                activeWorkspace() === ws.id
                  ? "bg-[#E8E8ED] dark:bg-[#2D2D2D] text-gray-900 dark:text-gray-100"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
              title={ws.name}
            >
              <Show when={sidebarExpanded()} fallback={ws.name.charAt(0)}>
                {ws.name}
              </Show>
            </button>
          ))}
          <button
            class="flex-shrink-0 rounded-md px-1.5 py-1 text-[11px] text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Add workspace"
          >
            +
          </button>
        </div>
      </div>
    </Show>
  );
};

export default WorkspaceSwitcher;
