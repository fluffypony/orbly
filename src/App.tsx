import { Component, onMount } from "solid-js";
import Sidebar from "./components/Sidebar/Sidebar";
import { loadMockData } from "./stores/mockData";

const App: Component = () => {
  onMount(() => {
    loadMockData();
  });

  return (
    <div class="flex h-screen w-screen bg-white dark:bg-[#121212]">
      <Sidebar />
      <div class="flex-1 flex flex-col">
        <div class="h-10 bg-white dark:bg-[#1E1E1E] border-b border-gray-200 dark:border-gray-800" />
        <div class="flex-1 flex items-center justify-center text-gray-400">
          <p>Orbly is running</p>
        </div>
      </div>
    </div>
  );
};

export default App;
