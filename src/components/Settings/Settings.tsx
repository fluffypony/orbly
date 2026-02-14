import { Component, Show, Switch, Match, createSignal, createEffect, onCleanup } from "solid-js";
import GeneralTab from "./tabs/GeneralTab";
import AppsTab from "./tabs/AppsTab";
import NotificationsTab from "./tabs/NotificationsTab";
import ShortcutsTab from "./tabs/ShortcutsTab";
import AdBlockingTab from "./tabs/AdBlockingTab";
import DownloadsTab from "./tabs/DownloadsTab";
import LinkRoutingTab from "./tabs/LinkRoutingTab";
import WorkspacesTab from "./tabs/WorkspacesTab";
import SyncTab from "./tabs/SyncTab";
import AboutTab from "./tabs/AboutTab";

type SettingsTab = 'general' | 'apps' | 'notifications' | 'shortcuts' | 'adblocking' | 'downloads' | 'linkrouting' | 'workspaces' | 'sync' | 'about';

interface SettingsProps {
  visible: boolean;
  onClose: () => void;
}

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'apps', label: 'Apps' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'shortcuts', label: 'Shortcuts' },
  { id: 'adblocking', label: 'Ad Blocking' },
  { id: 'downloads', label: 'Downloads' },
  { id: 'linkrouting', label: 'Link Routing' },
  { id: 'workspaces', label: 'Workspaces' },
  { id: 'sync', label: 'Sync' },
  { id: 'about', label: 'About' },
];

const Settings: Component<SettingsProps> = (props) => {
  const [activeTab, setActiveTab] = createSignal<SettingsTab>('general');

  createEffect(() => {
    if (!props.visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onClose();
    };
    window.addEventListener("keydown", handler);
    onCleanup(() => window.removeEventListener("keydown", handler));
  });

  return (
    <Show when={props.visible}>
      <div role="dialog" aria-label="Settings" class="fixed inset-0 bg-white dark:bg-[#121212] z-50 flex">
        {/* Tab sidebar */}
        <div class="w-48 bg-[#F5F5F7] dark:bg-[#1E1E1E] border-r border-gray-200 dark:border-gray-700 py-4 flex flex-col">
          <div class="flex items-center justify-between px-4 mb-4">
            <h2 class="text-base font-semibold text-gray-800 dark:text-gray-200">Settings</h2>
            <button
              onClick={props.onClose}
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none cursor-pointer"
              aria-label="Close settings"
            >
              ✕
            </button>
          </div>
          <nav role="tablist" aria-label="Settings sections" class="space-y-0.5 px-2 flex-1">
            {TABS.map(tab => (
              <button
                role="tab"
                aria-selected={activeTab() === tab.id}
                class={`w-full text-left px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors
                  ${activeTab() === tab.id
                    ? 'bg-[#E8E8ED] dark:bg-[#2D2D2D] text-blue-600 dark:text-blue-400 font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab content */}
        <div class="flex-1 overflow-y-auto p-8">
          <div class="max-w-3xl">
            <Switch>
              <Match when={activeTab() === 'general'}><GeneralTab /></Match>
              <Match when={activeTab() === 'apps'}><AppsTab /></Match>
              <Match when={activeTab() === 'notifications'}><NotificationsTab /></Match>
              <Match when={activeTab() === 'shortcuts'}><ShortcutsTab /></Match>
              <Match when={activeTab() === 'adblocking'}><AdBlockingTab /></Match>
              <Match when={activeTab() === 'downloads'}><DownloadsTab /></Match>
              <Match when={activeTab() === 'linkrouting'}><LinkRoutingTab /></Match>
              <Match when={activeTab() === 'workspaces'}><WorkspacesTab /></Match>
              <Match when={activeTab() === 'sync'}><SyncTab /></Match>
              <Match when={activeTab() === 'about'}><AboutTab /></Match>
            </Switch>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default Settings;
