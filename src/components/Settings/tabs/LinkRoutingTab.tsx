import { Component, For, Show, onMount, createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import { SettingSection, TextInput, Button } from "../SettingsControls";
import { getConfig } from "../../../lib/ipc";
import { appConfigs } from "../../../stores/uiStore";
import { invoke } from "@tauri-apps/api/core";
import type { LinkRoutingRule } from "../../../types/config";

const LinkRoutingTab: Component = () => {
  const [rules, setRules] = createStore<LinkRoutingRule[]>([]);
  const [testUrl, setTestUrl] = createSignal("");
  const [testResult, setTestResult] = createSignal<string | null>(null);
  let initialized = false;

  onMount(async () => {
    try {
      const config = await getConfig();
      setRules(config.link_routing.rules);
      initialized = true;
    } catch (err) {
      console.error("Failed to load link routing config:", err);
    }
  });

  const saveRules = async (newRules: LinkRoutingRule[]) => {
    setRules(newRules);
    if (!initialized) return;
    try {
      await invoke("update_link_routing_config", { link_routing: { rules: newRules } });
    } catch (err) {
      console.error("Failed to save link routing config:", err);
    }
  };

  const addRule = () => {
    saveRules([...rules, { pattern: "*.example.com/*", target: "external" }]);
  };

  const removeRule = (index: number) => {
    saveRules(rules.filter((_, i) => i !== index));
  };

  const updateRule = (index: number, field: keyof LinkRoutingRule, value: string) => {
    const newRules = rules.map((r, i) => i === index ? { ...r, [field]: value } : r);
    saveRules(newRules);
  };

  const moveRule = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= rules.length) return;
    const newRules = [...rules];
    [newRules[index], newRules[newIndex]] = [newRules[newIndex], newRules[index]];
    saveRules(newRules);
  };

  const handleTestUrl = async () => {
    const url = testUrl().trim();
    if (!url) return;
    try {
      const result = await invoke<string>("test_link_route", { url });
      setTestResult(result);
    } catch (err) {
      setTestResult("Error: " + String(err));
    }
  };

  const targetOptions = () => {
    const opts = [{ value: "external", label: "External Browser" }];
    for (const app of appConfigs) {
      opts.push({ value: app.id, label: app.name });
    }
    return opts;
  };

  return (
    <div>
      <SettingSection title="Link Routing" description="Control where links open based on URL patterns. Rules are evaluated top-to-bottom; first match wins." />

      <div class="space-y-2 mb-4">
        <For each={rules}>
          {(rule, index) => (
            <div class="flex items-center gap-2 py-1.5">
              <div class="flex flex-col gap-0.5">
                <button onClick={() => moveRule(index(), -1)} class="text-gray-400 hover:text-gray-600 text-xs cursor-pointer leading-none" disabled={index() === 0}>▲</button>
                <button onClick={() => moveRule(index(), 1)} class="text-gray-400 hover:text-gray-600 text-xs cursor-pointer leading-none" disabled={index() === rules.length - 1}>▼</button>
              </div>
              <TextInput value={rule.pattern} onChange={(v) => updateRule(index(), "pattern", v)} class="flex-1 font-mono" placeholder="*.example.com/*" />
              <span class="text-xs text-gray-400">→</span>
              <select
                value={rule.target}
                onChange={(e) => updateRule(index(), "target", e.currentTarget.value)}
                class="bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md px-2 py-1 text-sm text-gray-800 dark:text-gray-200 cursor-pointer"
              >
                {targetOptions().map(opt => <option value={opt.value}>{opt.label}</option>)}
              </select>
              <button onClick={() => removeRule(index())} class="text-red-400 hover:text-red-600 cursor-pointer">✕</button>
            </div>
          )}
        </For>
      </div>

      <Button onClick={addRule}>Add Rule</Button>

      <div class="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
        <p class="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">Test URL</p>
        <div class="flex gap-2">
          <TextInput value={testUrl()} onChange={setTestUrl} placeholder="https://example.com/page" class="flex-1" />
          <Button onClick={handleTestUrl}>Test</Button>
        </div>
        <Show when={testResult() !== null}>
          <p class="mt-2 text-xs text-gray-600 dark:text-gray-300">
            Match: <span class="font-mono font-medium text-blue-500">{testResult()}</span>
          </p>
        </Show>
      </div>
    </div>
  );
};

export default LinkRoutingTab;
