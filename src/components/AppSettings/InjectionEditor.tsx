import { Component, createSignal } from "solid-js";
import { updateApp, reloadApp } from "../../lib/ipc";
import type { AppConfig } from "../../types/config";

interface InjectionEditorProps {
  app: AppConfig;
  onSave: (updated: AppConfig) => void;
  onClose: () => void;
}

const InjectionEditor: Component<InjectionEditorProps> = (props) => {
  const [css, setCss] = createSignal(props.app.custom_css ?? "");
  const [js, setJs] = createSignal(props.app.custom_js ?? "");
  const [activeTab, setActiveTab] = createSignal<'css' | 'js'>('css');
  const [saving, setSaving] = createSignal(false);

  const save = async () => {
    setSaving(true);
    try {
      const updated = {
        ...props.app,
        custom_css: css(),
        custom_js: js(),
      };
      await updateApp(updated);
      await reloadApp(props.app.id);
      props.onSave(updated);
    } catch (err) {
      console.error("Failed to save injection settings:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div class="fixed inset-0 bg-black/30 z-50 flex items-center justify-center" onClick={(e) => { if (e.target === e.currentTarget) props.onClose(); }}>
      <div class="w-[600px] h-[500px] bg-white dark:bg-[#2D2D2D] rounded-xl shadow-2xl flex flex-col">
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 class="text-sm font-semibold text-gray-800 dark:text-gray-200">Custom Injection — {props.app.name}</h2>
          <button
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none"
            onClick={props.onClose}
          >✕</button>
        </div>
        <div class="flex border-b border-gray-200 dark:border-gray-700">
          <button
            class={`px-4 py-2 text-xs font-medium ${activeTab() === 'css' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            onClick={() => setActiveTab('css')}
          >Custom CSS</button>
          <button
            class={`px-4 py-2 text-xs font-medium ${activeTab() === 'js' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            onClick={() => setActiveTab('js')}
          >Custom JS</button>
        </div>
        <div class="flex-1 p-3">
          <textarea
            class="w-full h-full bg-gray-900 text-green-400 font-mono text-xs p-3 rounded-lg resize-none outline-none"
            placeholder={activeTab() === 'css' ? '/* Enter custom CSS */' : '// Enter custom JavaScript'}
            value={activeTab() === 'css' ? css() : js()}
            onInput={(e) => {
              if (activeTab() === 'css') setCss(e.currentTarget.value);
              else setJs(e.currentTarget.value);
            }}
            spellcheck={false}
          />
        </div>
        <div class="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <p class="text-[10px] text-yellow-600 dark:text-yellow-400">
            ⚠️ Custom scripts have full access to the web app's session data.
          </p>
          <div class="flex gap-2">
            <button
              onClick={props.onClose}
              class="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >Cancel</button>
            <button
              onClick={save}
              disabled={saving()}
              class="px-3 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >{saving() ? 'Saving...' : 'Save & Reload'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InjectionEditor;
