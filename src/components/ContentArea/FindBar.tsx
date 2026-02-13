import { Component, Show, createSignal } from "solid-js";

interface FindBarProps {
  visible: boolean;
  onClose: () => void;
}

const FindBar: Component<FindBarProps> = (props) => {
  const [query, setQuery] = createSignal("");
  // Match count will be set by webview find-in-page API in Phase 13
  const [matchCount] = createSignal(0);
  const [currentMatch, setCurrentMatch] = createSignal(0);

  const findPrev = () => {
    if (currentMatch() > 1) setCurrentMatch(currentMatch() - 1);
  };

  const findNext = () => {
    if (currentMatch() < matchCount()) setCurrentMatch(currentMatch() + 1);
  };

  return (
    <Show when={props.visible}>
      <div class="absolute top-0 right-0 z-10 bg-white dark:bg-[#2D2D2D] border border-gray-200 dark:border-gray-700 rounded-bl-lg shadow-lg flex items-center gap-2 px-3 py-1.5">
        <input
          type="text"
          placeholder="Find in page..."
          class="text-sm bg-transparent outline-none w-48 text-gray-800 dark:text-gray-200 placeholder-gray-400"
          value={query()}
          onInput={(e) => setQuery(e.currentTarget.value)}
          autofocus
          onKeyDown={(e) => {
            if (e.key === "Escape") props.onClose();
            if (e.key === "Enter") {
              if (e.shiftKey) findPrev();
              else findNext();
            }
          }}
        />
        <span class="text-xs text-gray-400 flex-shrink-0">
          {currentMatch()}/{matchCount()}
        </span>
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
          onClick={props.onClose}
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
