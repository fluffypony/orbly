import { Component, createSignal, Show, Switch, Match, onMount, onCleanup } from "solid-js";
import { activeAppId, appConfigs, appStates } from "../../stores/uiStore";
import { setContentAreaBounds, frontendReady, enableApp, reloadApp } from "../../lib/ipc";
import EmptyState from "./EmptyState";
import LoadingState from "./LoadingState";
import ErrorState from "./ErrorState";
import CrashedState from "./CrashedState";
import FindBar from "./FindBar";

const ContentArea: Component = () => {
  const activeApp = () => appConfigs.find((a) => a.id === activeAppId());
  const activeState = () => appStates.find((a) => a.id === activeAppId());
  const [findBarVisible, setFindBarVisible] = createSignal(false);
  let containerRef: HTMLDivElement | undefined;
  let frontendReadySent = false;

  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "f") {
      e.preventDefault();
      setFindBarVisible(true);
    }
  };

  onMount(() => {
    document.addEventListener("keydown", handleKeyDown);

    if (containerRef) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const rect = entry.target.getBoundingClientRect();
          setContentAreaBounds(rect.x, rect.y, rect.width, rect.height).then(() => {
            if (!frontendReadySent) {
              frontendReadySent = true;
              frontendReady().catch((err) =>
                console.error("Failed to signal frontend ready:", err)
              );
            }
          }).catch((err) => console.error("Failed to set content area bounds:", err));
        }
      });
      observer.observe(containerRef);
      onCleanup(() => observer.disconnect());
    }
  });

  onCleanup(() => {
    document.removeEventListener("keydown", handleKeyDown);
  });

  const handleEnable = async () => {
    const id = activeAppId();
    if (id) {
      try {
        await enableApp(id);
      } catch (err) {
        console.error("Failed to enable app:", err);
      }
    }
  };

  const handleReload = async () => {
    const id = activeAppId();
    if (id) {
      try {
        await reloadApp(id);
      } catch (err) {
        console.error("Failed to reload app:", err);
      }
    }
  };

  return (
    <div ref={containerRef} class="flex-1 relative bg-white dark:bg-[#121212] overflow-hidden">
      <FindBar
        visible={findBarVisible()}
        onClose={() => setFindBarVisible(false)}
      />

      <Show when={activeApp()} fallback={<EmptyState hasApps={appConfigs.length > 0} />}>
        {(app) => (
          <Switch fallback={<LoadingState appName={app().name} />}>
            <Match when={activeState()?.state === "active"}>
              <div id="webview-container" class="absolute inset-0" />
            </Match>
            <Match when={activeState()?.state === "hibernated"}>
              <LoadingState appName={app().name} message="Waking up..." />
            </Match>
            <Match when={activeState()?.state === "disabled"}>
              <div class="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
                <div class="text-4xl">⏸️</div>
                <p class="text-lg">This app is disabled</p>
                <button
                  class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                  onClick={handleEnable}
                >
                  Enable App
                </button>
              </div>
            </Match>
            <Match when={activeState()?.state === "error"}>
              <ErrorState appName={app().name} />
            </Match>
            <Match when={activeState()?.state === "crashed"}>
              <CrashedState appName={app().name} onReload={handleReload} />
            </Match>
          </Switch>
        )}
      </Show>
    </div>
  );
};

export default ContentArea;
