import { Component, onMount, onCleanup } from "solid-js";
import Sidebar from "./components/Sidebar/Sidebar";
import Toolbar from "./components/Toolbar/Toolbar";
import ContentArea from "./components/ContentArea/ContentArea";
import { initializeState } from "./lib/stateSync";
import { setupEventListeners, teardownEventListeners } from "./lib/events";

const App: Component = () => {
  onMount(async () => {
    await initializeState();
    await setupEventListeners();
  });

  onCleanup(() => {
    teardownEventListeners();
  });

  return (
    <div class="flex h-screen w-screen bg-white dark:bg-[#121212] select-none">
      <Sidebar />
      <div class="flex-1 flex flex-col min-w-0">
        <Toolbar />
        <ContentArea />
      </div>
    </div>
  );
};

export default App;
