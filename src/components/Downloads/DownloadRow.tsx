import { Component, Show, Switch, Match } from "solid-js";
import { openDownloadFile, openDownloadFolder, cancelDownload as ipcCancelDownload, retryDownload as ipcRetryDownload } from "../../lib/ipc";
import type { DownloadEntry } from "../../types/downloads";

interface DownloadRowProps {
  download: DownloadEntry;
  onRemove: (id: string) => void;
}

const DownloadRow: Component<DownloadRowProps> = (props) => {
  const statusType = () => props.download.status.type;

  const progressPct = () => {
    const s = props.download.status;
    if (s.type === "Downloading") {
      return Math.round(s.data.progress * 100);
    }
    return s.type === "Complete" ? 100 : 0;
  };

  const formatSize = (bytes: number | null) => {
    if (bytes === null) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const openFile = async () => {
    try {
      await openDownloadFile(props.download.id);
    } catch (err) {
      console.error("Failed to open file:", err);
    }
  };

  const openFolder = async () => {
    try {
      await openDownloadFolder(props.download.id);
    } catch (err) {
      console.error("Failed to open folder:", err);
    }
  };

  const cancelDownload = async () => {
    try {
      await ipcCancelDownload(props.download.id);
    } catch (err) {
      console.error("Failed to cancel download:", err);
    }
  };

  const retryFailed = async () => {
    try {
      const url = await ipcRetryDownload(props.download.id);
      // Open the URL in the browser to re-trigger the download
      window.open(url, '_blank');
    } catch (err) {
      console.error("Failed to retry download:", err);
    }
  };

  return (
    <tr class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <td class="px-3 py-1.5 truncate max-w-[200px]">
        <button
          class="text-left hover:text-blue-500 hover:underline truncate block w-full"
          onClick={openFile}
          title={props.download.filename}
        >
          {props.download.filename}
        </button>
      </td>
      <td class="px-3 py-1.5 text-gray-500 dark:text-gray-400 truncate max-w-[120px]">
        {props.download.source_app_name}
      </td>
      <td class="px-3 py-1.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">
        {formatSize(props.download.size_bytes)}
      </td>
      <td class="px-3 py-1.5 w-[120px]">
        <Show when={statusType() === "Downloading"}>
          <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div
              class="bg-blue-500 h-1.5 rounded-full transition-[width] duration-300"
              style={{ width: `${progressPct()}%` }}
            />
          </div>
          <span class="text-[10px] text-gray-400">{progressPct()}%</span>
        </Show>
      </td>
      <td class="px-3 py-1.5">
        <Switch>
          <Match when={statusType() === "Downloading"}>
            <span class="text-blue-500">Downloading</span>
          </Match>
          <Match when={statusType() === "Complete"}>
            <span class="text-green-500">Complete</span>
          </Match>
          <Match when={statusType() === "Failed"}>
            <span class="text-red-500">Failed</span>
          </Match>
          <Match when={statusType() === "Cancelled"}>
            <span class="text-gray-400">Cancelled</span>
          </Match>
        </Switch>
      </td>
      <td class="px-3 py-1.5 text-gray-400 whitespace-nowrap">
        {formatDate(props.download.created_at)}
      </td>
      <td class="px-3 py-1.5">
        <div class="flex gap-1">
          <Show when={statusType() === "Complete"}>
            <button
              class="text-gray-400 hover:text-blue-500 cursor-pointer"
              onClick={openFile}
              title="Open file"
            >
              📄
            </button>
            <button
              class="text-gray-400 hover:text-blue-500 cursor-pointer"
              onClick={openFolder}
              title="Open folder"
            >
              📁
            </button>
          </Show>
          <Show when={statusType() === "Downloading"}>
            <button
              class="text-gray-400 hover:text-red-500 cursor-pointer"
              onClick={cancelDownload}
              title="Cancel"
            >
              ✕
            </button>
          </Show>
          <Show when={statusType() === "Failed"}>
            <button
              class="text-gray-400 hover:text-blue-500 cursor-pointer"
              onClick={retryFailed}
              title="Retry"
            >
              🔄
            </button>
          </Show>
          <Show when={statusType() !== "Downloading"}>
            <button
              class="text-gray-400 hover:text-red-500 cursor-pointer"
              onClick={() => props.onRemove(props.download.id)}
              title="Remove"
            >
              🗑
            </button>
          </Show>
        </div>
      </td>
    </tr>
  );
};

export default DownloadRow;
