import { Component, For, Show, createSignal, createMemo } from "solid-js";
import { createStore } from "solid-js/store";
import { SERVICE_TEMPLATES, CATEGORIES } from "../../lib/serviceTemplates";
import type { ServiceTemplate } from "../../lib/serviceTemplates";

interface SelectedService {
  template: ServiceTemplate;
  customName: string;
  customUrl: string;
}

interface AddAppsStepProps {
  onNext: (selected: SelectedService[]) => void;
  onBack: () => void;
}

const AddAppsStep: Component<AddAppsStepProps> = (props) => {
  const [search, setSearch] = createSignal("");
  const [activeCategory, setActiveCategory] = createSignal<string | null>(null);
  const [selected, setSelected] = createStore<SelectedService[]>([]);
  const [showCustom, setShowCustom] = createSignal(false);
  const [customName, setCustomName] = createSignal("");
  const [customUrl, setCustomUrl] = createSignal("");

  const filteredTemplates = createMemo(() => {
    let list = SERVICE_TEMPLATES;
    const cat = activeCategory();
    if (cat) {
      list = list.filter(t => t.category === cat);
    }
    const q = search().toLowerCase().trim();
    if (q) {
      list = list.filter(t => t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
    }
    return list;
  });

  const isSelected = (id: string) => selected.some(s => s.template.id === id);

  const toggleService = (template: ServiceTemplate) => {
    if (isSelected(template.id)) {
      setSelected(selected.filter(s => s.template.id !== template.id));
    } else {
      setSelected([...selected, { template, customName: template.name, customUrl: template.requiresCustomUrl ? "" : template.url }]);
    }
  };

  const updateSelectedName = (id: string, name: string) => {
    setSelected(s => s.template.id === id, "customName", name);
  };

  const updateSelectedUrl = (id: string, url: string) => {
    setSelected(s => s.template.id === id, "customUrl", url);
  };

  const hasIncompleteCustomUrl = () =>
    selected.some(s => s.template.requiresCustomUrl && !s.customUrl.trim());

  const removeSelected = (id: string) => {
    setSelected(selected.filter(s => s.template.id !== id));
  };

  const addCustomService = () => {
    const name = customName().trim();
    const url = customUrl().trim();
    if (!name || !url) return;
    if (!url.startsWith("http://") && !url.startsWith("https://")) return;
    const customId = `custom-${Date.now()}`;
    const template: ServiceTemplate = { id: customId, name, url, icon: "🌐", category: "custom" };
    setSelected([...selected, { template, customName: name, customUrl: url }]);
    setCustomName("");
    setCustomUrl("");
    setShowCustom(false);
  };

  return (
    <div class="flex flex-col h-full max-h-[700px]">
      <div class="px-8 pt-8 pb-4">
        <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">Add Your Apps</h2>
        <p class="text-sm text-gray-400 dark:text-gray-500 mb-4">Select the services you use. You can always add more later.</p>

        {/* Search */}
        <input
          type="text"
          placeholder="Search services..."
          value={search()}
          onInput={(e) => setSearch(e.currentTarget.value)}
          class="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500 mb-3"
        />

        {/* Category pills */}
        <div class="flex gap-2 flex-wrap mb-4">
          <button
            class={`px-3 py-1 text-xs rounded-full cursor-pointer transition-colors ${!activeCategory() ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            onClick={() => setActiveCategory(null)}
          >
            All
          </button>
          <For each={CATEGORIES}>
            {(cat) => (
              <button
                class={`px-3 py-1 text-xs rounded-full cursor-pointer transition-colors ${activeCategory() === cat.id ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                onClick={() => setActiveCategory(activeCategory() === cat.id ? null : cat.id)}
              >
                {cat.label}
              </button>
            )}
          </For>
        </div>
      </div>

      {/* Template grid */}
      <div class="flex-1 overflow-y-auto px-8">
        <div class="grid grid-cols-3 gap-2 mb-3">
          <For each={filteredTemplates()}>
            {(template) => (
              <button
                class={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all text-left ${
                  isSelected(template.id)
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => toggleService(template)}
              >
                <span class="text-xl flex-shrink-0">{template.icon}</span>
                <span class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{template.name}</span>
                <Show when={isSelected(template.id)}>
                  <span class="ml-auto text-blue-500 text-xs flex-shrink-0">✓</span>
                </Show>
              </button>
            )}
          </For>
        </div>

        {/* Custom URL */}
        <Show when={!showCustom()}>
          <button
            class="w-full flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 text-sm cursor-pointer transition-colors mb-4"
            onClick={() => setShowCustom(true)}
          >
            <span>+</span> Add Custom URL
          </button>
        </Show>
        <Show when={showCustom()}>
          <div class="p-3 rounded-lg border border-gray-200 dark:border-gray-700 mb-4 space-y-2">
            <input
              type="text"
              placeholder="App name"
              value={customName()}
              onInput={(e) => setCustomName(e.currentTarget.value)}
              class="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="https://..."
              value={customUrl()}
              onInput={(e) => setCustomUrl(e.currentTarget.value)}
              class="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div class="flex gap-2 justify-end">
              <button
                class="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-md cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
                onClick={() => setShowCustom(false)}
              >
                Cancel
              </button>
              <button
                class={`px-3 py-1 text-xs rounded-md cursor-pointer ${
                  customUrl().trim() && (customUrl().trim().startsWith("http://") || customUrl().trim().startsWith("https://"))
                    ? "bg-blue-500 text-white hover:bg-blue-600"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
                onClick={addCustomService}
                disabled={!customUrl().trim() || (!customUrl().trim().startsWith("http://") && !customUrl().trim().startsWith("https://"))}
              >
                Add
              </button>
            </div>
          </div>
        </Show>
      </div>

      {/* Selected apps summary */}
      <Show when={selected.length > 0}>
        <div class="px-8 pt-3 pb-2 border-t border-gray-100 dark:border-gray-800">
          <p class="text-xs text-gray-400 mb-2">Selected ({selected.length})</p>
          <div class="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
            <For each={selected}>
              {(s) => (
                <div class="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-md px-2 py-1 text-xs">
                  <span>{s.template.icon}</span>
                  <input
                    type="text"
                    value={s.customName}
                    onInput={(e) => updateSelectedName(s.template.id, e.currentTarget.value)}
                    class="bg-transparent border-none outline-none text-gray-700 dark:text-gray-300 w-24 text-xs"
                  />
                  <Show when={s.template.requiresCustomUrl}>
                    <input
                      type="text"
                      value={s.customUrl}
                      onInput={(e) => updateSelectedUrl(s.template.id, e.currentTarget.value)}
                      placeholder="https://your-instance.example.com"
                      class="bg-transparent border-b border-gray-300 dark:border-gray-600 outline-none text-gray-700 dark:text-gray-300 w-48 text-xs mt-0.5"
                    />
                    <Show when={!s.customUrl.trim()}>
                      <span class="text-red-400 text-[10px]">URL required</span>
                    </Show>
                  </Show>
                  <button
                    class="text-gray-400 hover:text-red-500 cursor-pointer ml-0.5"
                    onClick={() => removeSelected(s.template.id)}
                  >
                    ✕
                  </button>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* Navigation */}
      <div class="flex justify-between px-8 py-4">
        <button
          class="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer"
          onClick={props.onBack}
        >
          ← Back
        </button>
        <div class="flex gap-2">
          <button
            class="px-4 py-2 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
            onClick={() => props.onNext([])}
          >
            Skip
          </button>
          <button
            class={`px-6 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              hasIncompleteCustomUrl()
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
            onClick={() => props.onNext([...selected])}
            disabled={hasIncompleteCustomUrl()}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddAppsStep;
