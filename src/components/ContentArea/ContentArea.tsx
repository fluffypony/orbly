import { Component, createSignal, Switch, Match, onMount, onCleanup } from "solid-js";
import { activeAppId, appConfigs, appStates } from "../../stores/uiStore";
import EmptyState from "./EmptyState";
import LoadingState from "./LoadingState";
import FindBar from "./FindBar";

const ContentArea: Component = () => {
  const activeApp = () => appConfigs.find((a) => a.id === activeAppId());
  const activeState = () => appStates.find((a) => a.id === activeAppId());
  const [findBarVisible, setFindBarVisible] = createSignal(false);

  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "f") {
      e.preventDefault();
      setFindBarVisible(true);
    }
  };

  onMount(() => {
    document.addEventListener("keydown", handleKeyDown);
  });

  onCleanup(() => {
    document.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <div class="flex-1 relative bg-white dark:bg-[#121212] overflow-hidden">
      <FindBar
        visible={findBarVisible()}
        onClose={() => setFindBarVisible(false)}
      />

      <Switch
        fallback={<EmptyState hasApps={appConfigs.length > 0} />}
      >
        <Match when={activeApp() && activeState()?.state === "active"}>
          <div id="webview-container" class="absolute inset-0" />
        </Match>
        <Match when={activeApp() && activeState()?.state === "hibernated"}>
          <LoadingState
            appName={activeApp()!.name}
            message="Waking up..."
          />
        </Match>
        <Match when={activeApp() && activeState()?.state === "disabled"}>
          <div class="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
            <div class="text-4xl">⏸️</div>
            <p class="text-lg">This app is disabled</p>
            <button class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm">
              Enable App
            </button>
          </div>
        </Match>
      </Switch>
    </div>
  );
};

export default ContentArea;
