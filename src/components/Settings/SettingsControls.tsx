import { Component, Show, JSX } from "solid-js";

// Section heading with optional description
export const SettingSection: Component<{ title: string; description?: string }> = (props) => (
  <div class="mb-6">
    <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">{props.title}</h3>
    <Show when={props.description}>
      <p class="text-xs text-gray-500 dark:text-gray-400">{props.description}</p>
    </Show>
  </div>
);

// A labeled row with a control on the right
export const SettingRow: Component<{ label: string; description?: string; children: JSX.Element }> = (props) => (
  <div class="flex items-start justify-between py-3 border-b border-gray-100 dark:border-gray-800">
    <div class="pr-4">
      <p class="text-sm font-medium text-gray-800 dark:text-gray-200">{props.label}</p>
      <Show when={props.description}>
        <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{props.description}</p>
      </Show>
    </div>
    <div class="flex-shrink-0">{props.children}</div>
  </div>
);

// Toggle switch
export const ToggleSwitch: Component<{ checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }> = (props) => (
  <button
    class={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${props.checked ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'} ${props.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    onClick={() => !props.disabled && props.onChange(!props.checked)}
    role="switch"
    aria-checked={props.checked}
  >
    <div class={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${props.checked ? 'left-5' : 'left-0.5'}`} />
  </button>
);

// Select dropdown
export const SelectDropdown: Component<{ value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }> = (props) => (
  <select
    value={props.value}
    onChange={(e) => props.onChange(e.currentTarget.value)}
    class="bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md px-2 py-1 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
  >
    {props.options.map(opt => (
      <option value={opt.value}>{opt.label}</option>
    ))}
  </select>
);

// Text input
export const TextInput: Component<{ value: string; onChange: (v: string) => void; placeholder?: string; class?: string }> = (props) => (
  <input
    type="text"
    value={props.value}
    onInput={(e) => props.onChange(e.currentTarget.value)}
    placeholder={props.placeholder}
    class={`bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md px-2 py-1 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500 ${props.class ?? ''}`}
  />
);

// Textarea
export const TextArea: Component<{ value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }> = (props) => (
  <textarea
    value={props.value}
    onInput={(e) => props.onChange(e.currentTarget.value)}
    placeholder={props.placeholder}
    rows={props.rows ?? 4}
    class="w-full bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md px-3 py-2 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500 font-mono resize-none"
  />
);

// Button variants
export const Button: Component<{ onClick: () => void; variant?: 'primary' | 'secondary' | 'danger'; disabled?: boolean; children: JSX.Element }> = (props) => {
  const base = "px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-blue-500 text-white hover:bg-blue-600",
    secondary: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600",
    danger: "bg-red-500 text-white hover:bg-red-600",
  };
  return (
    <button
      class={`${base} ${variants[props.variant ?? 'secondary']}`}
      onClick={props.onClick}
      disabled={props.disabled}
    >
      {props.children}
    </button>
  );
};
