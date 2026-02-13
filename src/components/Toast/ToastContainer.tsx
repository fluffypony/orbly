import { Component, For, createSignal } from "solid-js";

interface Toast {
  id: string;
  message: string;
  type: "info" | "warning" | "error";
}

export const [toasts, setToasts] = createSignal<Toast[]>([]);

export function showToast(
  message: string,
  type: "info" | "warning" | "error" = "info",
  duration = 5000
) {
  const id = Date.now().toString();
  setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
  setTimeout(() => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, duration);
}

const ToastContainer: Component = () => {
  return (
    <div class="fixed top-2 right-2 z-40 flex flex-col gap-2 pointer-events-none">
      <For each={toasts()}>
        {(toast) => (
          <div
            class={`pointer-events-auto px-4 py-2.5 rounded-lg shadow-lg text-sm max-w-xs animate-[slideInRight_200ms_ease-out] ${
              toast.type === "error"
                ? "bg-red-500 text-white"
                : toast.type === "warning"
                  ? "bg-yellow-500 text-white"
                  : "bg-gray-800 text-white dark:bg-gray-700"
            }`}
          >
            {toast.message}
          </div>
        )}
      </For>
    </div>
  );
};

export default ToastContainer;
