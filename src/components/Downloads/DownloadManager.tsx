import { Component, For, Show, createSignal, createEffect, onCleanup } from "solid-js";
import { getDownloads, clearCompletedDownloads as ipcClearCompleted, removeDownload as ipcRemoveDownload } from "../../lib/ipc";
import type { DownloadEntry } from "../../types/downloads";
import DownloadRow from "./DownloadRow";

interface DownloadManagerProps {
  visible: boolean;
  onClose: () => void;
}

const DownloadManager: Component<DownloadManagerProps> = (props) => {
  const [downloads, setDownloads] = createSignal<DownloadEntry[]>([]);
  const [filter, setFilter] = createSignal("");

  const fetchDownloads = async () => {
    try {
      const dl = await getDownloads();
      setDownloads(dl);
    } catch (err) {
      console.error("Failed to fetch downloads:", err);
    }
  };

  let interval: ReturnType<typeof setInterval> | undefined;

  createEffect(() => {
    if (props.visible) {
      fetchDownloads();
      interval = setInterval(fetchDownloads, 2000);
    } else {
      if (interval) {
        clearInterval(interval);
        interval = undefined;
      }
    }
  });

  onCleanup(() => {
    if (interval) clearInterval(interval);
  });

  const filteredDownloads = () => {
    const f = filter().toLowerCase();
    if (!f) return downloads();
    return downloads().filter(
      (d) =>
        d.filename.toLowerCase().includes(f) ||
        d.source_app_name.toLowerCase().includes(f),
    );
  };

  const clearCompleted = async () => {
    try {
      await ipcClearCompleted();
      await fetchDownloads();
    } catch (err) {
      console.error("Failed to clear completed:", err);
    }
  };

  const removeDownload = async (id: string) => {
    try {
      await ipcRemoveDownload(id);
      await fetchDownloads();
    } catch (err) {
      console.error("Failed to remove download:", err);
    }
  };

  return (
    <Show when={props.visible}>
      <div class="absolute bottom-0 left-0 right-0 h-[300px] bg-white dark:bg-[#1E1E1E] border-t border-gray-200 dark:border-gray-700 z-20 flex flex-col">
        <div class="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h3 class="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Downloads
          </h3>
          <div class="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search..."
              class="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-transparent text-gray-700 dark:text-gray-300 outline-none focus:border-blue-400"
              onInput={(e) => setFilter(e.currentTarget.value)}
              value={filter()}
            />
            <button
              class="text-xs text-blue-500 hover:underline cursor-pointer whitespace-nowrap"
              onClick={clearCompleted}
            >
              Clear Completed
            </button>
            <button
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer text-lg leading-none"
              onClick={props.onClose}
              aria-label="Close downloads"
            >
              ✕
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto">
          <Show
            when={filteredDownloads().length > 0}
            fallback={
              <div class="flex items-center justify-center h-full text-gray-400 text-sm">
                No downloads
              </div>
            }
          >
            <table class="w-full text-xs text-gray-700 dark:text-gray-300">
              <thead class="bg-gray-50 dark:bg-gray-800 sticky top-0">
                <tr>
                  <th class="text-left px-3 py-1.5 font-medium">Filename</th>
                  <th class="text-left px-3 py-1.5 font-medium">Source</th>
                  <th class="text-left px-3 py-1.5 font-medium">Size</th>
                  <th class="text-left px-3 py-1.5 font-medium">Progress</th>
                  <th class="text-left px-3 py-1.5 font-medium">Status</th>
                  <th class="text-left px-3 py-1.5 font-medium">Date</th>
                  <th class="text-left px-3 py-1.5 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                <For each={filteredDownloads()}>
                  {(dl) => (
                    <DownloadRow download={dl} onRemove={removeDownload} />
                  )}
                </For>
              </tbody>
            </table>
          </Show>
        </div>
      </div>
    </Show>
  );
};

export default DownloadManager;
