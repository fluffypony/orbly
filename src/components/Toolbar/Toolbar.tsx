import { Component, Show, createSignal } from "solid-js";
import { activeAppId, appConfigs, appStates, layoutMode } from "../../stores/uiStore";
import LayoutPicker from "../Tiling/LayoutPicker";
import NavButtons from "./NavButtons";
import UrlDisplay from "./UrlDisplay";
import AudioToggle from "./AudioToggle";
import DarkModeToggle from "./DarkModeToggle";
import AdblockToggle from "./AdblockToggle";
import AppMenu from "./AppMenu";

interface ToolbarProps {
  onToggleFindBar?: () => void;
}

const Toolbar: Component<ToolbarProps> = (props) => {
  const activeApp = () => appConfigs.find((a) => a.id === activeAppId());
  const activeState = () => appStates.find((a) => a.id === activeAppId());
  const [showLayoutPicker, setShowLayoutPicker] = createSignal(false);

  return (
    <div role="toolbar" aria-label="App toolbar" class="h-11 bg-white dark:bg-[#1E1E1E] border-b border-gray-200 dark:border-gray-800 flex items-center px-3 gap-2 flex-shrink-0">
      <Show
        when={activeApp()}
        fallback={
          <span class="text-sm text-gray-400">No app selected</span>
        }
      >
        {(app) => (
          <>
            <div class="flex items-center gap-2 min-w-0">
              <div class="w-5 h-5 rounded bg-blue-500 flex items-center justify-center text-white text-[10px] flex-shrink-0 font-medium overflow-hidden">
                {app().icon && app().icon.startsWith("data:") ? (
                  <img src={app().icon} class="w-5 h-5 rounded object-cover" alt="" />
                ) : app().icon && app().icon.length <= 2 ? (
                  <span class="text-sm">{app().icon}</span>
                ) : (
                  app().name.charAt(0).toUpperCase()
                )}
              </div>
              <span class="text-[13px] font-medium text-gray-800 dark:text-gray-200 truncate">
                {app().name}
              </span>
            </div>

            <div class="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

            <NavButtons />

            <UrlDisplay url={activeState()?.current_url ?? null} />

            <div class="flex items-center gap-0.5 ml-auto flex-shrink-0">
              <AudioToggle appId={app().id} audioMuted={app().audio_muted} />
              <DarkModeToggle appId={app().id} darkMode={app().dark_mode} />
              <AdblockToggle
                appId={app().id}
                adblockEnabled={app().adblock_enabled}
              />
              <Show when={app().zoom_level !== 100}>
                <span class="text-[10px] font-medium text-gray-400 dark:text-gray-500 ml-1">{app().zoom_level}%</span>
              </Show>
            </div>

            {(() => {
              let tilingBtnRef: HTMLButtonElement | undefined;
              return (
                <>
                  <button
                    ref={tilingBtnRef}
                    class={`w-7 h-7 min-w-[44px] min-h-[44px] flex items-center justify-center rounded cursor-pointer ${
                      layoutMode() !== "single"
                        ? "text-blue-500 bg-blue-50 dark:bg-blue-900/30"
                        : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                    title="Tiling layout"
                    aria-label="Tiling layout"
                    onClick={() => setShowLayoutPicker((v) => !v)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="3" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" />
                      <rect x="14" y="14" width="7" height="7" />
                    </svg>
                  </button>
                  <Show when={showLayoutPicker()}>
                    <LayoutPicker
                      onClose={() => setShowLayoutPicker(false)}
                      anchorRect={tilingBtnRef!.getBoundingClientRect()}
                    />
                  </Show>
                </>
              );
            })()}
            <Show when={props.onToggleFindBar && activeState()?.state === "active"}>
              <button
                class="w-7 h-7 min-w-[44px] min-h-[44px] flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-pointer"
                title="Find in page"
                aria-label="Find in page"
                onClick={props.onToggleFindBar}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </button>
            </Show>
            <AppMenu appId={app().id} />
          </>
        )}
      </Show>
    </div>
  );
};

export default Toolbar;
