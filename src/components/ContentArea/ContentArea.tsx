import { Component, Show, Switch, Match, onMount, onCleanup, createSignal, createEffect, on } from "solid-js";
import { activeAppId, appConfigs, appStates } from "../../stores/uiStore";
import { setContentAreaBounds, enableApp, reloadApp } from "../../lib/ipc";
import EmptyState from "./EmptyState";
import LoadingState from "./LoadingState";
import ErrorState from "./ErrorState";
import CrashedState from "./CrashedState";
import FindBar from "./FindBar";

interface ContentAreaProps {
  findBarVisible: boolean;
  onCloseFindBar: () => void;
}

const ContentArea: Component<ContentAreaProps> = (props) => {
  const activeApp = () => appConfigs.find((a) => a.id === activeAppId());
  const activeState = () => appStates.find((a) => a.id === activeAppId());
  const [fadingOut, setFadingOut] = createSignal(false);
  let containerRef: HTMLDivElement | undefined;
  let prevState: string | undefined;

  // Track state transitions for hibernate fade-out
  createEffect(on(
    () => activeState()?.state,
    (currentState) => {
      if (prevState === "active" && currentState === "hibernated") {
        setFadingOut(true);
        setTimeout(() => setFadingOut(false), 300);
      }
      prevState = currentState;
    },
    { defer: true }
  ));

  onMount(() => {
    if (containerRef) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const rect = entry.target.getBoundingClientRect();
          setContentAreaBounds(rect.x, rect.y, rect.width, rect.height).catch(
            (err) => console.error("Failed to set content area bounds:", err)
          );
        }
      });
      observer.observe(containerRef);
      onCleanup(() => observer.disconnect());
    }
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
    <div ref={containerRef} role="main" aria-label="Content area" class="flex-1 relative bg-white dark:bg-[#121212] overflow-hidden">
      <FindBar
        visible={props.findBarVisible}
        onClose={props.onCloseFindBar}
      />

      {/* Hibernate fade-out overlay */}
      <Show when={fadingOut()}>
        <div class="absolute inset-0 z-20 bg-white dark:bg-[#121212] transition-opacity duration-300 opacity-100 pointer-events-none" />
      </Show>

      <Show when={activeApp()} fallback={<EmptyState hasApps={appConfigs.length > 0} />}>
        {(app) => (
          <Switch fallback={<LoadingState appName={app().name} />}>
            <Match when={activeState()?.state === "active"}>
              <div id="webview-container" class="absolute inset-0" />
            </Match>
            <Match when={activeState()?.state === "loading"}>
              <LoadingState appName={app().name} message="Loading..." />
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
              <ErrorState appName={app().name} message={activeState()?.error_message} />
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
