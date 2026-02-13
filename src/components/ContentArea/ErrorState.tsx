import { Component } from "solid-js";
import { activeAppId, appStates } from "../../stores/uiStore";
import { reloadApp, hibernateApp } from "../../lib/ipc";

interface ErrorStateProps {
  appName: string;
  message?: string;
}

const ErrorState: Component<ErrorStateProps> = (props) => {
  const handleRetry = async () => {
    const id = activeAppId();
    if (id) {
      try {
        await reloadApp(id);
      } catch (err) {
        console.error("Failed to retry:", err);
      }
    }
  };

  const handleOpenExternal = async () => {
    const id = activeAppId();
    const state = appStates.find((s) => s.id === id);
    if (state?.current_url) {
      const { open } = await import("@tauri-apps/plugin-shell");
      await open(state.current_url);
    }
  };

  const handleHibernate = async () => {
    const id = activeAppId();
    if (id) {
      try {
        await hibernateApp(id);
      } catch (err) {
        console.error("Failed to hibernate:", err);
      }
    }
  };

  return (
    <div class="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
      <div class="w-16 h-16 rounded-2xl bg-red-500 flex items-center justify-center text-white text-2xl font-bold">
        {props.appName.charAt(0).toUpperCase()}
      </div>
      <h2 class="text-lg font-semibold text-gray-700 dark:text-gray-300">
        This app failed to load
      </h2>
      <p class="text-sm text-gray-400 max-w-xs">
        {props.message || "A network error occurred. Please check your connection and try again."}
      </p>
      <div class="flex gap-2 mt-2">
        <button
          class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
          onClick={handleRetry}
        >
          Retry
        </button>
        <button
          class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
          onClick={handleOpenExternal}
        >
          Open in Browser
        </button>
        <button
          class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
          onClick={handleHibernate}
        >
          Hibernate
        </button>
      </div>
    </div>
  );
};

export default ErrorState;
