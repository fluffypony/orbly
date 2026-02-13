import { Component } from "solid-js";

interface LoadingStateProps {
  appName: string;
  message?: string;
}

const LoadingState: Component<LoadingStateProps> = (props) => {
  return (
    <div class="flex flex-col items-center justify-center h-full gap-4">
      <div class="w-16 h-16 rounded-2xl bg-blue-500 flex items-center justify-center text-white text-2xl font-bold">
        {props.appName.charAt(0).toUpperCase()}
      </div>
      <div class="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
      <p class="text-sm text-gray-400">{props.message || "Loading..."}</p>
    </div>
  );
};

export default LoadingState;
