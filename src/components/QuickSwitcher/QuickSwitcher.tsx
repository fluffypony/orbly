import { Component, Show, For, createSignal, createEffect } from "solid-js";
import { fuzzySearch } from "../../lib/fuzzySearch";
import { appConfigs, recentAppIds } from "../../stores/uiStore";
import { activateApp } from "../../lib/ipc";
import type { AppConfig } from "../../types/config";

interface QuickSwitcherProps {
  visible: boolean;
  onClose: () => void;
}

const QuickSwitcher: Component<QuickSwitcherProps> = (props) => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [query, setQuery] = createSignal("");
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  let inputRef: HTMLInputElement | undefined;

  const results = (): AppConfig[] => {
    const enabled = [...appConfigs].filter((a) => a.enabled);
    if (!query()) {
      const recent = recentAppIds();
      return enabled.sort((a, b) => {
        const aIdx = recent.indexOf(a.id);
        const bIdx = recent.indexOf(b.id);
        if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
        if (aIdx !== -1) return -1;
        if (bIdx !== -1) return 1;
        return a.position - b.position;
      });
    }
    return fuzzySearch(enabled, query(), (a) => a.name).map((r) => r.item);
  };

  createEffect(() => {
    if (props.visible) {
      setQuery("");
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef?.focus());
    }
  });

  const selectAndClose = (app: AppConfig) => {
    activateApp(app.id);
    props.onClose();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (results().length > 0)
          setSelectedIndex((i) => Math.min(i + 1, results().length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        if (results().length > 0)
          setSelectedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter": {
        e.preventDefault();
        const selected = results()[selectedIndex()];
        if (selected) selectAndClose(selected);
        break;
      }
      case "Escape":
        e.preventDefault();
        props.onClose();
        break;
    }
  };

  return (
    <Show when={props.visible}>
      <div
        role="dialog"
        aria-label="Quick Switcher"
        class="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-start justify-center pt-[15vh]"
        onClick={props.onClose}
      >
        <div
          class="w-[500px] bg-white dark:bg-[#2D2D2D] rounded-xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          style={{ animation: reduceMotion ? "none" : "quickSwitcherIn 100ms ease-out" }}
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="Switch to app..."
            class="w-full px-4 py-3 text-base bg-transparent border-b border-gray-200 dark:border-gray-700 outline-none text-gray-800 dark:text-gray-200 placeholder-gray-400"
            value={query()}
            onInput={(e) => {
              setQuery(e.currentTarget.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
          <div role="listbox" class="max-h-[300px] overflow-y-auto">
            <For each={results()}>
              {(app, index) => (
                <button
                  class={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-gray-600 ${
                    index() === selectedIndex()
                      ? "bg-blue-50 dark:bg-gray-600"
                      : ""
                  }`}
                  onClick={() => selectAndClose(app)}
                  onMouseEnter={() => setSelectedIndex(index())}
                >
                  <div class="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white text-sm flex-shrink-0 overflow-hidden">
                    {app.icon && app.icon.startsWith("data:") ? (
                      <img src={app.icon} class="w-8 h-8 rounded-lg object-cover" alt="" />
                    ) : app.icon && app.icon.length <= 2 ? (
                      <span class="text-lg">{app.icon}</span>
                    ) : (
                      app.name.charAt(0)
                    )}
                  </div>
                  <span class="text-sm text-gray-800 dark:text-gray-200 truncate">
                    {app.name}
                  </span>
                  <span class="text-xs text-gray-400 ml-auto">
                    {app.workspace}
                  </span>
                </button>
              )}
            </For>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default QuickSwitcher;
