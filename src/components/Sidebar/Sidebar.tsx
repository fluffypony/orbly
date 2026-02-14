import { Component, onMount, onCleanup, createSignal } from "solid-js";
import { sidebarExpanded, setSidebarExpanded } from "../../stores/uiStore";
import WorkspaceSwitcher from "./WorkspaceSwitcher";
import AppIconList from "./AppIconList";
import SidebarFooter from "./SidebarFooter";

const Sidebar: Component = () => {
  let hoverTimeout: ReturnType<typeof setTimeout> | undefined;
  const [forceCollapsed, setForceCollapsed] = createSignal(false);

  const handleMouseEnter = () => {
    if (forceCollapsed()) return;
    hoverTimeout = setTimeout(() => setSidebarExpanded(true), 300);
  };

  const handleMouseLeave = () => {
    clearTimeout(hoverTimeout);
    setSidebarExpanded(false);
  };

  onMount(() => {
    const checkWidth = () => {
      if (window.innerWidth < 900) {
        setForceCollapsed(true);
        setSidebarExpanded(false);
      } else {
        setForceCollapsed(false);
      }
    };
    checkWidth();
    window.addEventListener("resize", checkWidth);
    onCleanup(() => window.removeEventListener("resize", checkWidth));
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
