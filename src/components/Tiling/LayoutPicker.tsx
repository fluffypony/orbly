import { Component, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { type LayoutMode, layoutMode, setLayoutMode, setTileAssignments } from "../../stores/uiStore";

interface LayoutPickerProps {
  onClose: () => void;
  anchorRect: DOMRect;
}

const layouts: { mode: LayoutMode; label: string; icon: string }[] = [
  { mode: "single", label: "Single", icon: "□" },
  { mode: "split-vertical", label: "Split Vertical", icon: "▌▐" },
  { mode: "split-horizontal", label: "1/2 + 1/2 (H)", icon: "▀▄" },
  { mode: "three-column", label: "Three Columns", icon: "⫿" },
  { mode: "two-thirds-left", label: "⅔ + ⅓", icon: "▌▏" },
  { mode: "two-thirds-right", label: "⅓ + ⅔", icon: "▏▌" },
  { mode: "grid", label: "Grid (2×2)", icon: "⊞" },
];

const LayoutPicker: Component<LayoutPickerProps> = (props) => {
  const handleSelect = (mode: LayoutMode) => {
    setLayoutMode(mode);
    if (mode === "single") {
      setTileAssignments({});
    }
    props.onClose();
  };

  return (
    <Portal>
      <div
        class="fixed inset-0 z-40"
        onClick={props.onClose}
      />
      <div
        role="radiogroup"
        aria-label="Tiling layout options"
        class="fixed z-50 bg-white dark:bg-[#2D2D2D] border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[160px]"
        style={{
          left: `${Math.max(0, props.anchorRect.left - 80)}px`,
          top: `${props.anchorRect.bottom + 4}px`,
        }}
      >
        {layouts.map((l) => (
          <button
            role="radio"
            aria-checked={layoutMode() === l.mode}
            class={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 cursor-pointer ${
              layoutMode() === l.mode
                ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
            }`}
            onClick={() => handleSelect(l.mode)}
          >
            <span class="text-base w-6 text-center font-mono">{l.icon}</span>
            <span>{l.label}</span>
            <Show when={layoutMode() === l.mode}>
              <span class="ml-auto text-blue-500">✓</span>
            </Show>
          </button>
        ))}
      </div>
    </Portal>
  );
};

export default LayoutPicker;
