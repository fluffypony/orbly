import { Component, For, createSignal } from "solid-js";
import { Portal } from "solid-js/web";
import { appConfigs, setWorkspaces, workspaces } from "../../stores/uiStore";
import { createWorkspace } from "../../lib/ipc";

interface CreateWorkspaceDialogProps {
  onClose: () => void;
}

const CreateWorkspaceDialog: Component<CreateWorkspaceDialogProps> = (props) => {
  const [name, setName] = createSignal("");
  const [selectedAppIds, setSelectedAppIds] = createSignal<string[]>([]);
  const [error, setError] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);

  const toggleApp = (appId: string) => {
    setSelectedAppIds((prev) =>
      prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId],
    );
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    const trimmed = name().trim();
    if (!trimmed) {
      setError("Workspace name is required");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const ws = await createWorkspace(trimmed, selectedAppIds());
      setWorkspaces([...workspaces, ws]);
      props.onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      props.onClose();
    }
  };

  return (
    <Portal>
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        onClick={handleBackdropClick}
        onKeyDown={(e) => e.key === "Escape" && props.onClose()}
      >
        <div class="w-[400px] max-h-[80vh] bg-white dark:bg-[#2D2D2D] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Create Workspace
            </h2>
          </div>

          <form onSubmit={handleSubmit} class="flex flex-col flex-1 overflow-hidden">
            <div class="px-5 py-4 space-y-4 overflow-y-auto">
              <div>
                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={name()}
                  onInput={(e) => setName(e.currentTarget.value)}
                  placeholder="e.g. Work, Personal"
                  class="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1E1E1E] px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autofocus
                />
              </div>

              <div>
                <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Apps
                </label>
                <div class="space-y-1 max-h-[240px] overflow-y-auto">
                  <For each={[...appConfigs]}>
                    {(app) => (
                      <label class="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedAppIds().includes(app.id)}
                          onChange={() => toggleApp(app.id)}
                          class="rounded border-gray-300 dark:border-gray-600"
                        />
                        <span class="text-sm text-gray-800 dark:text-gray-200">
                          {app.name}
                        </span>
                      </label>
                    )}
                  </For>
                </div>
              </div>

              {error() && (
                <p class="text-xs text-red-500">{error()}</p>
              )}
            </div>

            <div class="px-5 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
              <button
                type="button"
                onClick={props.onClose}
                class="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting()}
                class="px-3 py-1.5 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 rounded-md"
              >
                {submitting() ? "Creating..." : "Create"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
};

export default CreateWorkspaceDialog;
