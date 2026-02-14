import { Component, Show, createSignal, onMount } from "solid-js";
import { getRecipeStatus, updateRecipes } from "../../lib/ipc";

interface RecipeStatusPanelProps {
  localScriptsOnly?: boolean;
}

const RecipeStatusPanel: Component<RecipeStatusPanelProps> = (props) => {
  const [recipeStatus, setRecipeStatus] = createSignal<{ status: string; last_updated: string; manifest_version: number | null; service_count: number } | null>(null);
  const [updatingRecipes, setUpdatingRecipes] = createSignal(false);

  onMount(async () => {
    try {
      const status = await getRecipeStatus();
      setRecipeStatus(status);
    } catch (err) {
      console.error("Failed to load recipe status:", err);
    }
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "Never";
    try { return new Date(dateStr).toLocaleString(); } catch { return dateStr; }
  };

  return (
    <div>
      {(() => {
        const s = recipeStatus();
        if (!s) return <p class="text-xs text-gray-400">Loading status...</p>;
        const statusLabel = s.status === "up-to-date" ? "Up to date" : s.status === "fetch-failed" ? "Fetch failed" : s.status === "no-data" ? "No data" : s.status;
        const statusColor = s.status === "up-to-date" ? "text-green-500" : s.status === "fetch-failed" ? "text-red-500" : "text-gray-400";
        return (
          <div class="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-800 rounded-md">
            <div>
              <p class="text-sm">
                <span class={`font-medium ${statusColor}`}>{statusLabel}</span>
                <Show when={s.service_count > 0}>
                  <span class="text-gray-400 ml-2">({s.service_count} recipes)</span>
                </Show>
              </p>
              <p class="text-xs text-gray-400 mt-0.5">Last updated: {formatDate(s.last_updated)}</p>
            </div>
            <button
              class="text-xs px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300 cursor-pointer disabled:opacity-50"
              disabled={updatingRecipes() || props.localScriptsOnly}
              onClick={async () => {
                setUpdatingRecipes(true);
                try {
                  await updateRecipes();
                  await new Promise(r => setTimeout(r, 2000));
                  const newStatus = await getRecipeStatus();
                  setRecipeStatus(newStatus);
                } catch (err) {
                  console.error("Failed to update recipes:", err);
                } finally {
                  setUpdatingRecipes(false);
                }
              }}
            >
              {updatingRecipes() ? "Updating..." : "Refresh Now"}
            </button>
          </div>
        );
      })()}
      <Show when={props.localScriptsOnly}>
        <p class="text-xs text-gray-400 mt-1">Remote fetching is disabled (local scripts only mode).</p>
      </Show>
    </div>
  );
};

export default RecipeStatusPanel;
