import { Component, createSignal } from "solid-js";

interface UrlDisplayProps {
  url: string | null;
}

const UrlDisplay: Component<UrlDisplayProps> = (props) => {
  const [copied, setCopied] = createSignal(false);

  const copyUrl = async () => {
    const url = props.url;
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <button
      onClick={copyUrl}
      class="flex-1 text-[13px] font-mono text-gray-500 dark:text-gray-400 truncate text-left px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 min-w-0"
      title={copied() ? "Copied!" : "Click to copy URL"}
      disabled={!props.url}
    >
      {props.url || ""}
    </button>
  );
};

export default UrlDisplay;
