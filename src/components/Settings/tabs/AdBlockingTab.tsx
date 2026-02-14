import { Component, For, onMount, onCleanup, createSignal } from "solid-js";
import { listen } from "@tauri-apps/api/event";
import { createStore } from "solid-js/store";
import { SettingSection, SettingRow, ToggleSwitch, TextInput, Button } from "../SettingsControls";
import { getConfig, updateFilterLists, updateApp, addCustomAdblockRule, updateAdblockConfig, getRecipeStatus, updateRecipes } from "../../../lib/ipc";
import { refreshAppConfigs } from "../../../lib/stateSync";
import { appConfigs } from "../../../stores/uiStore";
import type { AdblockConfig } from "../../../types/config";

const AdBlockingTab: Component = () => {
  const [adblock, setAdblock] = createStore<AdblockConfig>({
    enabled: true,
    custom_rules: [],
    filter_lists: [],
    last_updated: "",
  });
  const [newFilterUrl, setNewFilterUrl] = createSignal("");
  const [newCustomRule, setNewCustomRule] = createSignal("");
  const [updating, setUpdating] = createSignal(false);
  const [recipeStatus, setRecipeStatus] = createSignal<{ status: string; last_updated: string; manifest_version: number | null; service_count: number } | null>(null);
  const [updatingRecipes, setUpdatingRecipes] = createSignal(false);
  let initialized = false;

  let unlistenFilterUpdate: (() => void) | undefined;

  onMount(async () => {
    try {
      const config = await getConfig();
      setAdblock(config.adblock);
      initialized = true;
    } catch (err) {
      console.error("Failed to load adblock config:", err);
    }
    try {
      const status = await getRecipeStatus();
      setRecipeStatus(status);
    } catch (err) {
      console.error("Failed to load recipe status:", err);
    }
    unlistenFilterUpdate = await listen("filter-lists-updated", async () => {
      try {
        const config = await getConfig();
        setAdblock(config.adblock);
      } catch {}
    });
  });

  onCleanup(() => unlistenFilterUpdate?.());

  const saveAdblock = async (updates: Partial<AdblockConfig>) => {
    setAdblock(updates);
    if (!initialized) return;
    try {
      await updateAdblockConfig({ ...adblock });
    } catch (err) {
      console.error("Failed to save adblock config:", err);
    }
  };

  const addFilterList = () => {
    const url = newFilterUrl().trim();
    if (!url || adblock.filter_lists.includes(url)) return;
    saveAdblock({ filter_lists: [...adblock.filter_lists, url] });
    setNewFilterUrl("");
  };

  const removeFilterList = (url: string) => {
    saveAdblock({ filter_lists: adblock.filter_lists.filter(u => u !== url) });
  };

  const handleUpdateNow = async () => {
    setUpdating(true);
    try {
      await updateFilterLists();
      const config = await getConfig();
      setAdblock(config.adblock);
    } catch (err) {
      console.error("Failed to update filter lists:", err);
    } finally {
      setUpdating(false);
    }
  };

  const addRule = async () => {
    const rule = newCustomRule().trim();
    if (!rule) return;
    try {
      await addCustomAdblockRule(rule);
      setAdblock("custom_rules", [...adblock.custom_rules, rule]);
      setNewCustomRule("");
    } catch (err) {
      console.error("Failed to add custom rule:", err);
    }
  };

  const toggleAppAdblock = async (appId: string) => {
    const app = appConfigs.find(a => a.id === appId);
    if (!app) return;
    try {
      await updateApp({ ...app, adblock_enabled: !app.adblock_enabled });
      await refreshAppConfigs();
    } catch (err) {
      console.error("Failed to toggle app adblock:", err);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "Never";
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  return (
    <div>
      <SettingSection title="Ad Blocking" description="Block ads and trackers across your apps" />

      <SettingRow label="Enable ad blocking" description="Global toggle for all apps">
        <ToggleSwitch checked={adblock.enabled} onChange={(v) => saveAdblock({ enabled: v })} />
      </SettingRow>

      <div class="py-4 border-b border-gray-100 dark:border-gray-800">
        <div class="flex items-center justify-between mb-3">
          <div>
            <p class="text-sm font-medium text-gray-800 dark:text-gray-200">Filter Lists</p>
            <p class="text-xs text-gray-400 mt-0.5">Last updated: {formatDate(adblock.last_updated)}</p>
          </div>
          <Button onClick={handleUpdateNow} disabled={updating()}>
            {updating() ? "Updating..." : "Update Now"}
          </Button>
        </div>
        <div class="space-y-1 mb-2">
          <For each={adblock.filter_lists}>
            {(url) => (
              <div class="flex items-center justify-between py-1.5 px-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                <span class="text-gray-600 dark:text-gray-300 truncate mr-2">{url}</span>
                <button onClick={() => removeFilterList(url)} class="text-red-400 hover:text-red-600 cursor-pointer flex-shrink-0" aria-label="Remove filter list">✕</button>
              </div>
            )}
          </For>
        </div>
        <div class="flex gap-2">
          <TextInput value={newFilterUrl()} onChange={setNewFilterUrl} placeholder="https://easylist.to/..." class="flex-1" />
          <Button onClick={addFilterList}>Add</Button>
        </div>
      </div>

      <div class="py-4 border-b border-gray-100 dark:border-gray-800">
        <p class="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">Custom Rules</p>
        <div class="space-y-1 mb-2">
          <For each={adblock.custom_rules}>
            {(rule) => (
              <div class="py-1 px-2 bg-gray-50 dark:bg-gray-800 rounded text-xs font-mono text-gray-600 dark:text-gray-300">
                {rule}
              </div>
            )}
          </For>
        </div>
        <div class="flex gap-2">
          <TextInput value={newCustomRule()} onChange={setNewCustomRule} placeholder="||ads.example.com^" class="flex-1 font-mono" />
          <Button onClick={addRule}>Add</Button>
        </div>
      </div>

      <div class="mt-4">
        <h4 class="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">Per-App Override</h4>
        <For each={[...appConfigs]}>
          {(app) => (
            <SettingRow label={app.name}>
              <ToggleSwitch checked={app.adblock_enabled} onChange={() => toggleAppAdblock(app.id)} />
            </SettingRow>
          )}
        </For>
      </div>

      <div class="mt-8">
        <SettingSection title="Remote Scripts" description="Service-specific badge scraping and injection scripts updated from the Orbly recipe server" />
        {(() => {
          const s = recipeStatus();
          if (!s) return null;
          const statusLabel = s.status === "up-to-date" ? "Up to date" : s.status === "fetch-failed" ? "Fetch failed" : s.status === "no-data" ? "No data" : s.status;
          const statusColor = s.status === "up-to-date" ? "text-green-500" : s.status === "fetch-failed" ? "text-red-500" : "text-gray-400";
          return (
            <>
              <SettingRow label="Status" description={s.service_count > 0 ? `${s.service_count} service recipes loaded` : undefined}>
                <span class={`text-sm font-medium ${statusColor}`}>{statusLabel}</span>
              </SettingRow>
              <SettingRow label="Last updated" description={s.last_updated ? formatDate(s.last_updated) : "Never"}>
                <Button
                  onClick={async () => {
                    setUpdatingRecipes(true);
                    try {
                      await updateRecipes();
                      // Wait a moment for the background task to complete
                      await new Promise(r => setTimeout(r, 2000));
                      const newStatus = await getRecipeStatus();
                      setRecipeStatus(newStatus);
                    } catch (err) {
                      console.error("Failed to update recipes:", err);
                    } finally {
                      setUpdatingRecipes(false);
                    }
                  }}
                  disabled={updatingRecipes()}
                >
                  {updatingRecipes() ? "Updating..." : "Refresh Now"}
                </Button>
              </SettingRow>
            </>
          );
        })()}
      </div>
    </div>
  );
};

export default AdBlockingTab;
