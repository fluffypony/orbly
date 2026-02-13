import { Component } from "solid-js";

const App: Component = () => {
  return (
    <div class="flex h-screen w-screen">
      <div class="w-14 bg-[#F5F5F7] dark:bg-[#1E1E1E] border-r border-gray-200 dark:border-gray-800 flex-shrink-0">
        {/* Sidebar placeholder */}
      </div>
      <div class="flex-1 flex flex-col">
        <div class="h-10 bg-white dark:bg-[#1E1E1E] border-b border-gray-200 dark:border-gray-800 flex items-center px-4">
          {/* Toolbar placeholder */}
        </div>
        <div class="flex-1 flex items-center justify-center text-gray-400">
          <p>Orbly is running</p>
        </div>
      </div>
    </div>
  );
};

export default App;
