import { Component } from "solid-js";
import { activeAppId } from "../../stores/uiStore";
import { navigateBack, navigateForward } from "../../lib/ipc";

const NavButtons: Component = () => {
  const handleBack = async () => {
    const id = activeAppId();
    if (!id) return;
    try {
      await navigateBack(id);
    } catch (err) {
      console.error("Failed to navigate back:", err);
    }
  };

  const handleForward = async () => {
    const id = activeAppId();
    if (!id) return;
    try {
      await navigateForward(id);
    } catch (err) {
      console.error("Failed to navigate forward:", err);
    }
  };

  return (
    <div class="flex items-center gap-0.5">
      <button
        class="w-7 h-7 min-w-[44px] min-h-[44px] flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500"
        title="Back"
        aria-label="Go back"
        onClick={handleBack}
        disabled={!activeAppId()}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <button
        class="w-7 h-7 min-w-[44px] min-h-[44px] flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500"
        title="Forward"
        aria-label="Go forward"
        onClick={handleForward}
        disabled={!activeAppId()}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  );
};

export default NavButtons;
