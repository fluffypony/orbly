import { Component, onMount, onCleanup, createSignal } from "solid-js";
import { listen } from "@tauri-apps/api/event";
import { sidebarExpanded, setSidebarExpanded, sidebarManuallyExpanded, setSidebarManuallyExpanded } from "../../stores/uiStore";
import { getConfig } from "../../lib/ipc";
import WorkspaceSwitcher from "./WorkspaceSwitcher";
import AppIconList from "./AppIconList";
import SidebarFooter from "./SidebarFooter";

const Sidebar: Component = () => {
  let hoverTimeout: ReturnType<typeof setTimeout> | undefined;
  const [forceCollapsed, setForceCollapsed] = createSignal(false);
  const [hoverEnabled, setHoverEnabled] = createSignal(true);

  onMount(async () => {
    try {
      const config = await getConfig();
      setHoverEnabled(config.general.sidebar_hover_expand);
    } catch {}
  });

  const handleMouseEnter = () => {
    if (forceCollapsed() || !hoverEnabled() || sidebarManuallyExpanded()) return;
    hoverTimeout = setTimeout(() => setSidebarExpanded(true), 300);
  };

  const handleMouseLeave = () => {
    clearTimeout(hoverTimeout);
    if (!sidebarManuallyExpanded()) {
      setSidebarExpanded(false);
    }
  };

  onMount(() => {
    const checkWidth = () => {
      if (window.innerWidth < 900) {
        setForceCollapsed(true);
        setSidebarExpanded(false);
        setSidebarManuallyExpanded(false);
      } else {
        setForceCollapsed(false);
      }
    };
    checkWidth();
    window.addEventListener("resize", checkWidth);
    onCleanup(() => window.removeEventListener("resize", checkWidth));
  });

  onMount(async () => {
    const unlisten = await listen("config-updated", async () => {
      try {
        const config = await getConfig();
        setHoverEnabled(config.general.sidebar_hover_expand);
      } catch {}
    });
    onCleanup(() => {
      unlisten();
    });
  });

  return (
    <aside
      class="flex flex-col bg-[#F5F5F7] dark:bg-[#1E1E1E] border-r border-gray-200 dark:border-gray-800 flex-shrink-0 transition-[width] duration-150 ease-out overflow-hidden"
      style={{ width: sidebarExpanded() ? "200px" : "56px" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <WorkspaceSwitcher />
      <AppIconList />
      <SidebarFooter />
    </aside>
  );
};

export default Sidebar;
