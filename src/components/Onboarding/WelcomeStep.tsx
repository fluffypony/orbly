import { Component } from "solid-js";

interface WelcomeStepProps {
  onNext: () => void;
}

const WelcomeStep: Component<WelcomeStepProps> = (props) => {
  return (
    <div class="flex flex-col items-center justify-center text-center px-8 py-16">
      <div class="text-6xl mb-6">🌐</div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
        Welcome to Orbly
      </h1>
      <p class="text-base text-gray-500 dark:text-gray-400 mb-2 max-w-md">
        Your lightweight, privacy-respecting app workspace.
      </p>
      <p class="text-sm text-gray-400 dark:text-gray-500 mb-10 max-w-sm">
        Run all your favorite web apps in one place with near-zero idle CPU usage, ad blocking, and full session isolation.
      </p>
      <button
        class="px-8 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
        onClick={props.onNext}
      >
        Get Started
      </button>
    </div>
  );
};

export default WelcomeStep;
