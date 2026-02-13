import { Component, Show, createSignal, createEffect, onCleanup } from "solid-js";
import { findInPage, clearFindInPage } from "../../lib/ipc";
import { activeAppId } from "../../stores/uiStore";

interface FindBarProps {
  visible: boolean;
  onClose: () => void;
}

const FindBar: Component<FindBarProps> = (props) => {
  const [query, setQuery] = createSignal("");
  let inputRef: HTMLInputElement | undefined;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  const doFind = (forward: boolean) => {
    const appId = activeAppId();
    const q = query();
    if (appId && q) {
      findInPage(appId, q, forward).catch((err) =>
        console.error("Find in page failed:", err)
      );
    }
  };

  const findNext = () => doFind(true);
  const findPrev = () => doFind(false);

  createEffect(() => {
    const q = query();
    const appId = activeAppId();
    if (debounceTimer) clearTimeout(debounceTimer);
    if (appId && q) {
      debounceTimer = setTimeout(() => {
        findInPage(appId, q, true).catch((err) =>
          console.error("Find in page failed:", err)
        );
      }, 200);
    }
  });

  createEffect(() => {
    if (props.visible && inputRef) {
      inputRef.focus();
    }
  });

  const handleClose = () => {
    const appId = activeAppId();
    if (appId) {
      clearFindInPage(appId).catch((err) =>
        console.error("Clear find failed:", err)
      );
    }
    setQuery("");
    props.onClose();
  };

  onCleanup(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    const appId = activeAppId();
    if (appId) {
      clearFindInPage(appId).catch(() => {});
    }
  });

  return (
    <Show when={props.visible}>
      <div class="absolute top-0 right-0 z-10 bg-white dark:bg-[#2D2D2D] border border-gray-200 dark:border-gray-700 rounded-bl-lg shadow-lg flex items-center gap-2 px-3 py-1.5">
        <input
          ref={inputRef}
          type="text"
          placeholder="Find in page..."
          class="text-sm bg-transparent outline-none w-48 text-gray-800 dark:text-gray-200 placeholder-gray-400"
          value={query()}
          onInput={(e) => setQuery(e.currentTarget.value)}
          autofocus
          onKeyDown={(e) => {
            if (e.key === "Escape") handleClose();
            if (e.key === "Enter") {
              if (e.shiftKey) findPrev();
              else findNext();
            }
          }}
        />
        <button
          onClick={findPrev}
          class="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400"
          title="Previous"
          aria-label="Previous match"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
        <button
          onClick={findNext}
          class="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400"
          title="Next"
          aria-label="Next match"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        <button
          onClick={handleClose}
          class="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400"
          title="Close"
          aria-label="Close find bar"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </Show>
  );
};

export default FindBar;
