import { Component, Show } from "solid-js";

interface EmptyStateProps {
  hasApps: boolean;
}

const EmptyState: Component<EmptyStateProps> = (props) => {
  return (
    <div class="flex flex-col items-center justify-center h-full text-center px-8 gap-4">
      <Show
        when={props.hasApps}
        fallback={
          <>
            <div class="text-5xl mb-2">🌐</div>
            <h2 class="text-lg font-semibold text-gray-700 dark:text-gray-300">
              Welcome to Orbly
            </h2>
            <p class="text-sm text-gray-400 max-w-xs">
              Add your favourite web apps and manage them all in one place.
            </p>
            <button class="px-4 py-2 bg-accent text-white rounded-lg hover:opacity-90 text-sm font-medium mt-2">
              Add your first app
            </button>
          </>
        }
      >
        <div class="text-4xl mb-2">💤</div>
        <p class="text-sm text-gray-400">
          All apps are sleeping. Click an app in the sidebar to wake it.
        </p>
      </Show>
    </div>
  );
};

export default EmptyState;
