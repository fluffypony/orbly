import { Component, For, Show, createSignal } from "solid-js";
import {
  sidebarExpanded,
  workspaces,
  activeWorkspaceId,
} from "../../stores/uiStore";
import { switchWorkspace } from "../../lib/ipc";
import CreateWorkspaceDialog from "../Workspaces/CreateWorkspaceDialog";

const WorkspaceSwitcher: Component = () => {
  const [showCreateDialog, setShowCreateDialog] = createSignal(false);

  const handleSwitch = async (id: string) => {
    try {
      await switchWorkspace(id);
    } catch (err) {
      console.error("Failed to switch workspace:", err);
    }
  };

  return (
    <>
      <Show when={workspaces.length > 1}>
        <div class="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-1.5 py-2">
          <div role="tablist" aria-label="Workspaces" class="flex items-center gap-1 overflow-x-auto">
            <For each={workspaces}>
              {(ws) => (
                <button
                  role="tab"
                  aria-selected={activeWorkspaceId() === ws.id}
                  class={`flex-shrink-0 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                    activeWorkspaceId() === ws.id
                      ? "bg-[#E8E8ED] dark:bg-[#2D2D2D] text-gray-900 dark:text-gray-100"
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                  onClick={() => handleSwitch(ws.id)}
                  title={ws.name}
                >
                  <Show when={sidebarExpanded()} fallback={ws.name.charAt(0)}>
                    {ws.name}
                  </Show>
                </button>
              )}
            </For>
            <button
              class="flex-shrink-0 rounded-md px-1.5 py-1 text-[11px] text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => setShowCreateDialog(true)}
              title="New workspace"
            >
              +
            </button>
          </div>
        </div>
      </Show>

      <Show when={showCreateDialog()}>
        <CreateWorkspaceDialog onClose={() => setShowCreateDialog(false)} />
      </Show>
    </>
  );
};

export default WorkspaceSwitcher;
