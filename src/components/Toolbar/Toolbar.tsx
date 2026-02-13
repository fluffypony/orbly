import { Component, Show } from "solid-js";
import { activeAppId, appConfigs, appStates } from "../../stores/uiStore";
import NavButtons from "./NavButtons";
import UrlDisplay from "./UrlDisplay";
import AudioToggle from "./AudioToggle";
import DarkModeToggle from "./DarkModeToggle";
import AdblockToggle from "./AdblockToggle";
import AppMenu from "./AppMenu";

const Toolbar: Component = () => {
  const activeApp = () => appConfigs.find((a) => a.id === activeAppId());
  const activeState = () => appStates.find((a) => a.id === activeAppId());

  return (
    <div class="h-10 bg-white dark:bg-[#1E1E1E] border-b border-gray-200 dark:border-gray-800 flex items-center px-3 gap-2 flex-shrink-0">
      <Show
        when={activeApp()}
        fallback={
          <span class="text-sm text-gray-400">No app selected</span>
        }
      >
        {(app) => (
          <>
            <div class="flex items-center gap-2 min-w-0">
              <div class="w-5 h-5 rounded bg-blue-500 flex items-center justify-center text-white text-[10px] flex-shrink-0 font-medium">
                {app().name.charAt(0).toUpperCase()}
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
            </div>

            <AppMenu appId={app().id} />
          </>
        )}
      </Show>
    </div>
  );
};

export default Toolbar;
