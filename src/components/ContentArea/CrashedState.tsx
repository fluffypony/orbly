import { Component, createSignal } from "solid-js";

interface CrashedStateProps {
  appName: string;
  onReload?: () => void;
}

const CrashedState: Component<CrashedStateProps> = (props) => {
  const [reloading, setReloading] = createSignal(false);

  const handleReload = async () => {
    if (!props.onReload) return;
    setReloading(true);
    try {
      await props.onReload();
    } finally {
      setReloading(false);
    }
  };

  return (
    <div class="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
      <div class="w-16 h-16 rounded-2xl bg-gray-500 flex items-center justify-center text-white text-2xl font-bold">
        {props.appName.charAt(0).toUpperCase()}
      </div>
      <h2 class="text-lg font-semibold text-gray-700 dark:text-gray-300">
        This app crashed
      </h2>
      <p class="text-sm text-gray-400 max-w-xs">
        The app has stopped responding. Reload to try again.
      </p>
      <button
        class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm mt-2 disabled:opacity-50"
        onClick={handleReload}
        disabled={reloading()}
      >
        {reloading() ? "Reloading..." : "Reload"}
      </button>
    </div>
  );
};

export default CrashedState;
