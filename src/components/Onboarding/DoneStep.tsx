import { Component } from "solid-js";

interface DoneStepProps {
  onComplete: () => void;
  appCount: number;
}

const DoneStep: Component<DoneStepProps> = (props) => {
  return (
    <div class="flex flex-col items-center justify-center text-center px-8 py-16">
      <div class="text-6xl mb-6">🎉</div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
        You're All Set!
      </h1>
      <p class="text-sm text-gray-400 dark:text-gray-500 mb-10 max-w-sm">
        {props.appCount > 0
          ? `${props.appCount} app${props.appCount === 1 ? '' : 's'} configured and ready to go.`
          : "You can add apps anytime from the Settings panel."
        }
      </p>
      <button
        class="px-8 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
        onClick={props.onComplete}
      >
        Start Using Orbly
      </button>
    </div>
  );
};

export default DoneStep;
