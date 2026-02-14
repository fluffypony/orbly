import { Component, Show, createSignal, onMount } from "solid-js";
import { getVersion } from "@tauri-apps/api/app";
import { open } from "@tauri-apps/plugin-shell";
import { check } from "@tauri-apps/plugin-updater";
import { SettingSection, Button } from "../SettingsControls";

const AboutTab: Component = () => {
  const [version, setVersion] = createSignal("0.1.0");
  const [checking, setChecking] = createSignal(false);
  const [updateStatus, setUpdateStatus] = createSignal<string | null>(null);

  const handleCheckUpdates = async () => {
    setChecking(true);
    setUpdateStatus(null);
    try {
      const update = await check();
      if (update) {
        setUpdateStatus(`Update available: v${update.version}`);
      } else {
        setUpdateStatus("You're up to date!");
      }
    } catch (err) {
      setUpdateStatus("Failed to check for updates");
    } finally {
      setChecking(false);
    }
  };

  onMount(async () => {
    try {
      const v = await getVersion();
      setVersion(v);
    } catch {
      // fallback to default
    }
  });

  return (
    <div>
      <SettingSection title="About" />

      <div class="space-y-6">
        <div class="flex items-center gap-4">
          <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            O
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Orbly</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">Version {version()}</p>
          </div>
        </div>

        <div class="flex items-center gap-2 mt-2">
          <Button onClick={handleCheckUpdates} disabled={checking()}>
            {checking() ? "Checking..." : "Check for Updates"}
          </Button>
          <Show when={updateStatus()}>
            <span class="text-xs text-gray-500 dark:text-gray-400">{updateStatus()}</span>
          </Show>
        </div>

        <div class="space-y-3 border-t border-gray-100 dark:border-gray-800 pt-4">
          <div class="flex items-center justify-between py-2">
            <span class="text-sm text-gray-600 dark:text-gray-300">License</span>
            <span class="text-sm text-gray-800 dark:text-gray-200">BSD 3-Clause</span>
          </div>
          <div class="flex items-center justify-between py-2">
            <span class="text-sm text-gray-600 dark:text-gray-300">Source Code</span>
            <Button onClick={async () => { try { await open("https://github.com/fluffypony/orbly"); } catch (err) { console.error("Failed to open URL:", err); } }}>
              Open on GitHub
            </Button>
          </div>
          <div class="flex items-center justify-between py-2">
            <span class="text-sm text-gray-600 dark:text-gray-300">Website</span>
            <Button onClick={async () => { try { await open("https://getorb.ly"); } catch (err) { console.error("Failed to open URL:", err); } }}>
              getorb.ly
            </Button>
          </div>
        </div>

        <div class="border-t border-gray-100 dark:border-gray-800 pt-4">
          <p class="text-xs text-gray-400 dark:text-gray-500">
            A lightweight, privacy-respecting multi-app workspace manager.
            Built with Tauri 2, SolidJS, and Rust.
          </p>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-2">
            © {new Date().getFullYear()} Orbly Contributors
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutTab;
