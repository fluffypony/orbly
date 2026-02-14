import { Component, For, Show, createSignal, createMemo } from "solid-js";
import { Portal } from "solid-js/web";
import { SERVICE_TEMPLATES, CATEGORIES } from "../../lib/serviceTemplates";
import { addApp, fetchFavicon } from "../../lib/ipc";
import { refreshAppConfigs } from "../../lib/stateSync";
import { appConfigs } from "../../stores/uiStore";
import type { AppConfig } from "../../types/config";

interface AddAppDialogProps {
  onClose: () => void;
}

const AddAppDialog: Component<AddAppDialogProps> = (props) => {
  const [search, setSearch] = createSignal("");
  const [activeCategory, setActiveCategory] = createSignal<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = createSignal<string | null>(null);
  const [showCustom, setShowCustom] = createSignal(false);
  const [name, setName] = createSignal("");
  const [url, setUrl] = createSignal("");
  const [sidebarSection, setSidebarSection] = createSignal("");
  const [adding, setAdding] = createSignal(false);
  const [icon, setIcon] = createSignal("🌐");
  const [fetchingIcon, setFetchingIcon] = createSignal(false);

  const filteredTemplates = createMemo(() => {
    let list = SERVICE_TEMPLATES;
    const cat = activeCategory();
    if (cat) list = list.filter((t) => t.category === cat);
    const q = search().toLowerCase().trim();
    if (q) list = list.filter((t) => t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
    return list;
  });

  const sections = createMemo(() => {
    const set = new Set(appConfigs.map((a) => a.sidebar_section).filter(Boolean));
    return [...set];
  });

  const selectTemplate = (id: string) => {
    const tmpl = SERVICE_TEMPLATES.find((t) => t.id === id);
    if (tmpl) {
      setSelectedTemplateId(id);
      setName(tmpl.name);
      setUrl(tmpl.url);
      setIcon(tmpl.icon);
      setShowCustom(false);
    }
  };

  const handleCustom = () => {
    setSelectedTemplateId(null);
    setShowCustom(true);
    setName("");
    setUrl("");
    setIcon("🌐");
  };

  const handleFetchIcon = async () => {
    const u = url().trim();
    if (!u) return;
    setFetchingIcon(true);
    try {
      const result = await fetchFavicon(u);
      if (result) setIcon(result);
    } catch (err) {
      console.error("Failed to fetch favicon:", err);
    } finally {
      setFetchingIcon(false);
    }
  };

  const handleAdd = async () => {
    const n = name().trim();
    const u = url().trim();
    if (!n || !u) return;

    setAdding(true);
    try {
      const template = SERVICE_TEMPLATES.find((t) => t.id === selectedTemplateId());
      const newApp: AppConfig = {
        id: crypto.randomUUID(),
        name: n,
        service_type: template?.id ?? "custom",
        url: u,
        icon: icon(),
        data_store_uuid: crypto.randomUUID(),
        enabled: true,
        hibernated: false,
        audio_muted: false,
        user_agent: template?.suggestedUserAgent ?? "",
        custom_css: "",
        custom_js: "",
        proxy: "",
        dark_mode: "off",
        dark_mode_brightness: 100,
        dark_mode_contrast: 90,
        dark_mode_sepia: 10,
        dark_mode_bg_color: "",
        dark_mode_text_color: "",
        dark_mode_custom_css: "",
        hibernation_timeout_minutes: 15,
        download_directory: "",
        skip_download_dialog: null,
        workspace: "default",
        sidebar_section: sidebarSection(),
        position: appConfigs.length,
        notification_style: "full",
        adblock_enabled: true,
        zoom_level: 100,
        suppress_high_usage_alert: false,
        suppress_hibernate_confirm: false,
      };
      await addApp(newApp);
      await refreshAppConfigs();
      props.onClose();
    } catch (err) {
      console.error("Failed to add app:", err);
    } finally {
      setAdding(false);
    }
  };

  return (
    <Portal>
      <div
        class="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60] flex items-center justify-center"
        onClick={(e) => { if (e.target === e.currentTarget) props.onClose(); }}
      >
        <div class="w-[550px] max-h-[600px] bg-white dark:bg-[#2D2D2D] rounded-xl shadow-2xl flex flex-col overflow-hidden">
          <div class="px-6 pt-5 pb-3">
            <div class="flex items-center justify-between mb-3">
              <h2 class="text-base font-semibold text-gray-800 dark:text-gray-200">Add App</h2>
              <button onClick={props.onClose} class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer" aria-label="Close dialog">✕</button>
            </div>
            <input
              type="text"
              placeholder="Search services..."
              value={search()}
              onInput={(e) => setSearch(e.currentTarget.value)}
              class="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500 mb-3"
            />
            <div class="flex gap-2 flex-wrap mb-2">
              <button
                class={`px-3 py-1 text-xs rounded-full cursor-pointer transition-colors ${!activeCategory() ? "bg-blue-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"}`}
                onClick={() => setActiveCategory(null)}
              >All</button>
              <For each={CATEGORIES}>
                {(cat) => (
                  <button
                    class={`px-3 py-1 text-xs rounded-full cursor-pointer transition-colors ${activeCategory() === cat.id ? "bg-blue-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"}`}
                    onClick={() => setActiveCategory(activeCategory() === cat.id ? null : cat.id)}
                  >{cat.label}</button>
                )}
              </For>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto px-6 pb-3">
            <div class="grid grid-cols-3 gap-2 mb-3">
              <For each={filteredTemplates()}>
                {(template) => (
                  <button
                    class={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all text-left ${
                      selectedTemplateId() === template.id
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                    onClick={() => selectTemplate(template.id)}
                  >
                    <span class="text-xl flex-shrink-0">{template.icon}</span>
                    <span class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{template.name}</span>
                  </button>
                )}
              </For>
            </div>
            <button
              class={`w-full flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed cursor-pointer text-sm transition-colors ${
                showCustom()
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600"
                  : "border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-400"
              }`}
              onClick={handleCustom}
            >
              <span>+</span> Custom URL
            </button>
          </div>

          <Show when={selectedTemplateId() || showCustom()}>
            <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {icon().startsWith("data:") ? (
                    <img src={icon()} class="w-8 h-8 rounded" alt="App icon" />
                  ) : (
                    <span class="text-xl">{icon()}</span>
                  )}
                </div>
                <button
                  class="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer disabled:opacity-50"
                  onClick={handleFetchIcon}
                  disabled={fetchingIcon() || !url().trim()}
                >
                  {fetchingIcon() ? "Fetching..." : "Fetch Icon"}
                </button>
                <button
                  class="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer"
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/*";
                    input.onchange = () => {
                      const file = input.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        if (typeof reader.result === "string") setIcon(reader.result);
                      };
                      reader.readAsDataURL(file);
                    };
                    input.click();
                  }}
                >
                  Upload
                </button>
              </div>
              <div class="flex gap-3">
                <div class="flex-1">
                  <label class="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Name</label>
                  <input type="text" value={name()} onInput={(e) => setName(e.currentTarget.value)} class="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div class="flex-1">
                  <label class="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Sidebar Section</label>
                  <input type="text" value={sidebarSection()} onInput={(e) => setSidebarSection(e.currentTarget.value)} placeholder="(none)" list="section-list" class="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500" />
                  <datalist id="section-list">
                    <For each={sections()}>{(s) => <option value={s} />}</For>
                  </datalist>
                </div>
              </div>
              <div>
                <label class="text-xs text-gray-500 dark:text-gray-400 mb-1 block">URL</label>
                <input type="text" value={url()} onInput={(e) => setUrl(e.currentTarget.value)} placeholder="https://..." class="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div class="flex justify-end">
                <button
                  class="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 cursor-pointer disabled:opacity-50"
                  onClick={handleAdd}
                  disabled={adding() || !name().trim() || !url().trim()}
                >
                  {adding() ? "Adding..." : "Add App"}
                </button>
              </div>
            </div>
          </Show>
        </div>
      </div>
    </Portal>
  );
};

export default AddAppDialog;
