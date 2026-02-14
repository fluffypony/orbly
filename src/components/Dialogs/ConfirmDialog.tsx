import { Component, Show, createSignal, JSX } from "solid-js";
import { Portal } from "solid-js/web";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  children?: JSX.Element;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: Component<ConfirmDialogProps> = (props) => {
  return (
    <Portal>
      <div
        class="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60] flex items-center justify-center"
        onClick={(e) => { if (e.target === e.currentTarget) props.onCancel(); }}
      >
        <div class="w-[400px] bg-white dark:bg-[#2D2D2D] rounded-xl shadow-2xl p-6">
          <h3 class="text-base font-semibold text-gray-800 dark:text-gray-200 mb-2">{props.title}</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">{props.message}</p>
          {props.children}
          <div class="flex justify-end gap-2 mt-4">
            <button
              class="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg cursor-pointer"
              onClick={props.onCancel}
            >
              {props.cancelLabel ?? "Cancel"}
            </button>
            <button
              class={`px-4 py-2 text-sm text-white rounded-lg cursor-pointer ${
                props.variant === "danger"
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-blue-500 hover:bg-blue-600"
              }`}
              onClick={props.onConfirm}
            >
              {props.confirmLabel ?? "Confirm"}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default ConfirmDialog;
