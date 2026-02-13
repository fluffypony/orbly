import { Component, For, Show, createSignal } from "solid-js";
import { SettingSection, TextInput, Button } from "../SettingsControls";
import { createWorkspace, updateWorkspace, deleteWorkspace } from "../../../lib/ipc";
import { appConfigs, workspaces, setWorkspaces } from "../../../stores/uiStore";
import type { Workspace } from "../../../types/config";

const WorkspacesTab: Component = () => {
  const [editingId, setEditingId] = createSignal<string | null>(null);
  const [newName, setNewName] = createSignal("");
  const [creating, setCreating] = createSignal(false);

  const handleCreate = async () => {
    const name = newName().trim();
    if (!name) return;
    try {
      const ws = await createWorkspace(name, []);
      setWorkspaces([...workspaces, ws]);
      setNewName("");
      setCreating(false);
    } catch (err) {
      console.error("Failed to create workspace:", err);
    }
  };

  const handleDelete = async (wsId: string) => {
    if (wsId === "default") return;
    try {
      await deleteWorkspace(wsId);
      setWorkspaces(workspaces.filter(w => w.id !== wsId));
    } catch (err) {
      console.error("Failed to delete workspace:", err);
    }
  };

  const toggleAppInWorkspace = async (ws: Workspace, appId: string) => {
    const newAppIds = ws.app_ids.includes(appId)
      ? ws.app_ids.filter(id => id !== appId)
      : [...ws.app_ids, appId];
    const updated = { ...ws, app_ids: newAppIds };
    try {
      await updateWorkspace(updated);
      setWorkspaces(workspaces.map(w => w.id === ws.id ? updated : w));
    } catch (err) {
      console.error("Failed to update workspace:", err);
    }
  };

  const updateName = async (ws: Workspace, name: string) => {
    const updated = { ...ws, name };
    try {
      await updateWorkspace(updated);
      setWorkspaces(workspaces.map(w => w.id === ws.id ? updated : w));
    } catch (err) {
      console.error("Failed to update workspace name:", err);
    }
  };

  return (
    <div>
      <SettingSection title="Workspaces" description="Organize your apps into separate workspaces" />

      <div class="space-y-4">
        <For each={workspaces}>
          {(ws) => (
            <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div class="flex items-center justify-between mb-3">
                <Show when={editingId() === ws.id} fallback={
                  <h4 class="text-sm font-semibold text-gray-800 dark:text-gray-200">{ws.name}</h4>
                }>
                  <TextInput value={ws.name} onChange={(v) => updateName(ws, v)} class="w-48" />
                </Show>
                <div class="flex gap-2">
                  <Button onClick={() => setEditingId(editingId() === ws.id ? null : ws.id)}>
                    {editingId() === ws.id ? "Done" : "Edit"}
                  </Button>
                  <Show when={ws.id !== "default"}>
                    <Button variant="danger" onClick={() => handleDelete(ws.id)}>Delete</Button>
                  </Show>
                </div>
              </div>
              <Show when={editingId() === ws.id}>
                <div class="space-y-1 mt-2">
                  <p class="text-xs text-gray-500 mb-2">Select apps for this workspace:</p>
                  <For each={[...appConfigs]}>
                    {(app) => (
                      <label class="flex items-center gap-2 py-1 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ws.app_ids.includes(app.id)}
                          onChange={() => toggleAppInWorkspace(ws, app.id)}
                          class="rounded border-gray-300 dark:border-gray-600"
                        />
                        <span class="text-sm text-gray-700 dark:text-gray-300">{app.name}</span>
                      </label>
                    )}
                  </For>
                </div>
              </Show>
              <Show when={editingId() !== ws.id}>
                <p class="text-xs text-gray-400">
                  {ws.id === "default" ? "All apps" : `${ws.app_ids.length} apps`}
                </p>
              </Show>
            </div>
          )}
        </For>
      </div>

      <div class="mt-4">
        <Show when={creating()} fallback={
          <Button onClick={() => setCreating(true)}>Create Workspace</Button>
        }>
          <div class="flex gap-2">
            <TextInput value={newName()} onChange={setNewName} placeholder="Workspace name" class="flex-1" />
            <Button variant="primary" onClick={handleCreate}>Create</Button>
            <Button onClick={() => { setCreating(false); setNewName(""); }}>Cancel</Button>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default WorkspacesTab;
