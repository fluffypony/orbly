import { Component, For, Show, createSignal, createEffect, onCleanup } from "solid-js";
import { listen } from "@tauri-apps/api/event";
import { getResourceUsage, reloadApp, hibernateApp, disableApp, enableApp, killApp, getConfig } from "../../lib/ipc";
import { appConfigs } from "../../stores/uiStore";

interface AppsManagerProps {
  visible: boolean;
  onClose: () => void;
}

interface AppResourceUsage {
  app_id: string;
  app_name: string;
  status: string;
  cpu_percent: number | null;
  memory_mb: number | null;
}

type SortField = "name" | "status" | "cpu" | "memory";

const AppsManager: Component<AppsManagerProps> = (props) => {
  const [usages, setUsages] = createSignal<AppResourceUsage[]>([]);
  const [sortBy, setSortBy] = createSignal<SortField>("name");
  const [sortAsc, setSortAsc] = createSignal(true);
  const [cpuThreshold, setCpuThreshold] = createSignal(30);

  createEffect(() => {
    if (!props.visible) return;

    getResourceUsage()
      .then((data) => setUsages(data as AppResourceUsage[]))
      .catch(console.error);

    getConfig().then((config) => setCpuThreshold(config.general.cpu_alert_threshold)).catch(() => {});

    const unlistenPromise = listen<AppResourceUsage[]>("resource-usage-updated", (event) => {
      setUsages(event.payload);
    });

    onCleanup(() => {
      unlistenPromise.then((fn) => fn());
    });
  });

  createEffect(() => {
    if (!props.visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onClose();
    };
    window.addEventListener("keydown", handler);
    onCleanup(() => window.removeEventListener("keydown", handler));
  });

  const toggleSort = (field: SortField) => {
    if (sortBy() === field) {
      setSortAsc((v) => !v);
    } else {
      setSortBy(field);
      setSortAsc(true);
    }
  };

  const sortIndicator = (field: SortField) => {
    if (sortBy() !== field) return "";
    return sortAsc() ? " ▲" : " ▼";
  };

  const sorted = () => {
    const items = [...usages()];
    const field = sortBy();
    const asc = sortAsc();
    items.sort((a, b) => {
      let cmp = 0;
      switch (field) {
        case "name":
          cmp = a.app_name.localeCompare(b.app_name);
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
        case "cpu":
          cmp = (a.cpu_percent ?? -1) - (b.cpu_percent ?? -1);
          break;
        case "memory":
          cmp = (a.memory_mb ?? -1) - (b.memory_mb ?? -1);
          break;
      }
      return asc ? cmp : -cmp;
    });
    return items;
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "active": return "🟢";
      case "loading": return "🔵";
      case "hibernated": return "🟡";
      case "crashed": return "⚠️";
      case "error": return "🔴";
      case "disabled": return "⏸️";
      default: return "⚪";
    }
  };

  const rowClass = (usage: AppResourceUsage) => {
    const threshold = cpuThreshold();
    if (usage.cpu_percent !== null && usage.cpu_percent > threshold * 1.5) {
      return "bg-red-50 dark:bg-red-900/20";
    }
    if (usage.cpu_percent !== null && usage.cpu_percent > threshold) {
      return "bg-yellow-50 dark:bg-yellow-900/20";
    }
    return "";
  };

  const handleAction = async (action: string, appId: string) => {
    try {
      switch (action) {
        case "reload":
          await reloadApp(appId);
          break;
        case "hibernate":
          await hibernateApp(appId);
          break;
        case "disable":
          await disableApp(appId);
          break;
        case "enable":
          await enableApp(appId);
          break;
        case "kill":
          await killApp(appId);
          break;
      }
    } catch (err) {
      console.error(`Failed to ${action} app ${appId}:`, err);
    }
  };

  return (
    <Show when={props.visible}>
      <div
        class="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center"
        onClick={(e) => { if (e.target === e.currentTarget) props.onClose(); }}
      >
        <div class="w-[700px] max-h-[500px] bg-white dark:bg-[#2D2D2D] rounded-xl shadow-2xl overflow-hidden flex flex-col">
          <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <h2 class="text-sm font-semibold text-gray-800 dark:text-gray-200">Apps Manager</h2>
            <button
              onClick={props.onClose}
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer text-lg leading-none"
              aria-label="Close apps manager"
            >
              ✕
            </button>
          </div>

          <div class="flex-1 overflow-y-auto">
            <Show
              when={sorted().length > 0}
              fallback={
                <div class="flex items-center justify-center h-full text-gray-400 text-sm py-12">
                  No apps configured
                </div>
              }
            >
              <table class="w-full text-xs text-gray-700 dark:text-gray-300">
                <thead class="bg-gray-50 dark:bg-gray-800 sticky top-0">
                  <tr>
                    <th class="w-8 px-2 py-2"></th>
                    <th
                      class="text-left px-3 py-2 font-medium cursor-pointer select-none hover:text-gray-900 dark:hover:text-gray-100"
                      onClick={() => toggleSort("name")}
                    >
                      Name{sortIndicator("name")}
                    </th>
                    <th
                      class="text-left px-3 py-2 font-medium cursor-pointer select-none hover:text-gray-900 dark:hover:text-gray-100"
                      onClick={() => toggleSort("status")}
                    >
                      Status{sortIndicator("status")}
                    </th>
                    <th
                      class="text-right px-3 py-2 font-medium cursor-pointer select-none hover:text-gray-900 dark:hover:text-gray-100"
                      onClick={() => toggleSort("cpu")}
                    >
                      CPU %{sortIndicator("cpu")}
                    </th>
                    <th
                      class="text-right px-3 py-2 font-medium cursor-pointer select-none hover:text-gray-900 dark:hover:text-gray-100"
                      onClick={() => toggleSort("memory")}
                    >
                      Memory{sortIndicator("memory")}
                    </th>
                    <th class="text-center px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={sorted()}>
                    {(usage) => (
                      <tr class={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 ${rowClass(usage)}`}>
                        <td class="px-2 py-2">
                          {(() => {
                            const config = appConfigs.find(a => a.id === usage.app_id);
                            const icon = config?.icon ?? "";
                            if (icon.startsWith("data:")) {
                              return <img src={icon} class="w-5 h-5 rounded object-cover" alt="" />;
                            } else if (icon.length > 0 && icon.length <= 2) {
                              return <span class="text-sm">{icon}</span>;
                            } else {
                              return <span class="text-xs font-bold text-gray-400">{usage.app_name.charAt(0).toUpperCase()}</span>;
                            }
                          })()}
                        </td>
                        <td class="px-3 py-2">{usage.app_name}</td>
                        <td class="px-3 py-2">
                          <span class="mr-1">{statusIcon(usage.status)}</span>
                          {usage.status}
                        </td>
                        <td class="text-right px-3 py-2">
                          {usage.cpu_percent !== null ? `${usage.cpu_percent.toFixed(1)}%` : "—"}
                        </td>
                        <td class="text-right px-3 py-2">
                          {usage.memory_mb !== null ? `${usage.memory_mb.toFixed(1)} MB` : "—"}
                        </td>
                        <td class="text-center px-3 py-2">
                          <div class="flex gap-1 justify-center">
                            <Show when={usage.status === "disabled"}>
                              <button
                                title="Enable"
                                class="hover:bg-gray-200 dark:hover:bg-gray-600 rounded p-0.5 cursor-pointer"
                                onClick={() => handleAction("enable", usage.app_id)}
                              >
                                ▶️
                              </button>
                            </Show>
                            <Show when={usage.status !== "disabled"}>
                              <button
                                title="Reload"
                                class="hover:bg-gray-200 dark:hover:bg-gray-600 rounded p-0.5 cursor-pointer"
                                onClick={() => handleAction("reload", usage.app_id)}
                              >
                                🔄
                              </button>
                              <button
                                title="Hibernate"
                                class="hover:bg-gray-200 dark:hover:bg-gray-600 rounded p-0.5 cursor-pointer"
                                onClick={() => handleAction("hibernate", usage.app_id)}
                              >
                                🌙
                              </button>
                              <button
                                title="Disable"
                                class="hover:bg-gray-200 dark:hover:bg-gray-600 rounded p-0.5 cursor-pointer"
                                onClick={() => handleAction("disable", usage.app_id)}
                              >
                                ⏻
                              </button>
                            </Show>
                            <button
                              title="Kill"
                              class="hover:bg-gray-200 dark:hover:bg-gray-600 rounded p-0.5 cursor-pointer"
                              onClick={() => handleAction("kill", usage.app_id)}
                            >
                              💀
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </Show>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default AppsManager;
