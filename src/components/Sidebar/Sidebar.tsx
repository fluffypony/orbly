import { Component } from "solid-js";
import { sidebarExpanded, setSidebarExpanded } from "../../stores/uiStore";
import WorkspaceSwitcher from "./WorkspaceSwitcher";
import AppIconList from "./AppIconList";
import SidebarFooter from "./SidebarFooter";

const Sidebar: Component = () => {
  let hoverTimeout: ReturnType<typeof setTimeout> | undefined;

  const handleMouseEnter = () => {
    hoverTimeout = setTimeout(() => setSidebarExpanded(true), 300);
  };

  const handleMouseLeave = () => {
    clearTimeout(hoverTimeout);
    setSidebarExpanded(false);
  };

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
