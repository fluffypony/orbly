import { Component, createSignal, onCleanup, onMount, Show } from "solid-js";
import { appConfigs, setAppConfigs } from "../../stores/uiStore";
import { updateApp, getBlockedCount } from "../../lib/ipc";

interface AdblockToggleProps {
  appId: string;
  adblockEnabled: boolean;
}

const AdblockToggle: Component<AdblockToggleProps> = (props) => {
  const [blockedCount, setBlockedCount] = createSignal(0);
  let pollInterval: ReturnType<typeof setInterval> | undefined;

  onMount(() => {
    const fetchCount = async () => {
      try {
        const count = await getBlockedCount(props.appId);
        setBlockedCount(count);
      } catch {
        // ignore
      }
    };
    fetchCount();
    pollInterval = setInterval(fetchCount, 5000);
  });

  onCleanup(() => {
    if (pollInterval) clearInterval(pollInterval);
  });

  const toggle = async () => {
    const config = appConfigs.find((a) => a.id === props.appId);
    if (!config) return;
    setAppConfigs(
      (a) => a.id === props.appId,
      "adblock_enabled",
      !props.adblockEnabled
    );
    try {
      await updateApp({ ...config, adblock_enabled: !props.adblockEnabled });
    } catch (err) {
      console.error("Failed to update adblock:", err);
      setAppConfigs(
        (a) => a.id === props.appId,
        "adblock_enabled",
        props.adblockEnabled
      );
    }
  };

  return (
    <button
      class={`relative w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800 ${
        props.adblockEnabled
          ? "text-green-500"
          : "text-gray-500 dark:text-gray-400"
      }`}
      onClick={toggle}
      title={
        props.adblockEnabled
          ? `Ad blocker on (${blockedCount()} blocked)`
          : "Ad blocker off"
      }
      aria-label={props.adblockEnabled ? "Disable ad blocker" : "Enable ad blocker"}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill={props.adblockEnabled ? "currentColor" : "none"} stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
      <Show when={props.adblockEnabled && blockedCount() > 0}>
        <span class="absolute -top-0.5 -right-0.5 bg-green-500 text-white text-[8px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5 leading-none">
          {blockedCount() > 999 ? "999+" : blockedCount()}
        </span>
      </Show>
    </button>
  );
};

export default AdblockToggle;
