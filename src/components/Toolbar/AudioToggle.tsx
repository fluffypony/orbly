import { Component } from "solid-js";
import { updateApp } from "../../lib/ipc";
import { appConfigs, setAppConfigs } from "../../stores/uiStore";

interface AudioToggleProps {
  appId: string;
  audioMuted: boolean;
}

const AudioToggle: Component<AudioToggleProps> = (props) => {
  const toggle = async () => {
    const config = appConfigs.find((a) => a.id === props.appId);
    if (!config) return;
    const updated = { ...config, audio_muted: !props.audioMuted };
    setAppConfigs(
      (a) => a.id === props.appId,
      "audio_muted",
      !props.audioMuted
    );
    try {
      await updateApp(updated);
    } catch (err) {
      console.error("Failed to update audio mute:", err);
      // Revert on failure
      setAppConfigs(
        (a) => a.id === props.appId,
        "audio_muted",
        props.audioMuted
      );
    }
  };

  return (
    <button
      class={`w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800 ${
        props.audioMuted
          ? "text-red-400"
          : "text-gray-500 dark:text-gray-400"
      }`}
      onClick={toggle}
      title={props.audioMuted ? "Unmute audio" : "Mute audio"}
      aria-label={props.audioMuted ? "Unmute audio" : "Mute audio"}
    >
      {props.audioMuted ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
      )}
    </button>
  );
};

export default AudioToggle;
