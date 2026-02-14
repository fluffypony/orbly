import { Component, Show, Switch, Match, For, onMount, onCleanup, createSignal, createEffect, on } from "solid-js";
import { activeAppId, appConfigs, appStates, layoutMode, tileAssignments, setTileAssignments, setActiveTileId, activeTileId, visibleApps, splitRatio, setSplitRatio, setLayoutMode } from "../../stores/uiStore";
import { setContentAreaBounds, enableApp, reloadApp, applyLayout, ensureWebviewExists } from "../../lib/ipc";
import type { AppLayoutInfo } from "../../lib/ipc";
import EmptyState from "./EmptyState";
import LoadingState from "./LoadingState";
import ErrorState from "./ErrorState";
import CrashedState from "./CrashedState";
import CertificateWarning from "./CertificateWarning";
import FindBar from "./FindBar";
import { showToast } from "../Toast/ToastContainer";

interface ContentAreaProps {
  findBarVisible: boolean;
  onCloseFindBar: () => void;
}

const ContentArea: Component<ContentAreaProps> = (props) => {
  const activeApp = () => appConfigs.find((a) => a.id === activeAppId());
  const activeState = () => appStates.find((a) => a.id === activeAppId());
  const [fadingOut, setFadingOut] = createSignal(false);
  let containerRef: HTMLDivElement | undefined;
  let prevState: string | undefined;

  // Track state transitions for hibernate fade-out.
  // When the backend destroys the webview (active → hibernated), the native
  // child webview disappears. We show a brief opaque overlay that then fades
  // out to smooth the visual transition.
  createEffect(on(
    () => activeState()?.state,
    (currentState) => {
      if (prevState === "active" && currentState === "hibernated") {
        setFadingOut(true);
        setTimeout(() => setFadingOut(false), 300);
      }
      prevState = currentState;
    },
    { defer: true }
  ));

  onMount(() => {
    if (containerRef) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const rect = entry.target.getBoundingClientRect();
          setContentAreaBounds(rect.x, rect.y, rect.width, rect.height).catch(
            (err) => console.error("Failed to set content area bounds:", err)
          );
          setContainerSize({ width: rect.width, height: rect.height });
        }
      });
      observer.observe(containerRef);
      onCleanup(() => observer.disconnect());
    }
  });

  const handleEnable = async () => {
    const id = activeAppId();
    if (id) {
      try {
        await enableApp(id);
      } catch (err) {
        console.error("Failed to enable app:", err);
      }
    }
  };

  const handleReload = async () => {
    const id = activeAppId();
    if (id) {
      try {
        await reloadApp(id);
      } catch (err) {
        console.error("Failed to reload app:", err);
      }
    }
  };

  // Compute tile rectangles based on layout mode and container size
  const [containerSize, setContainerSize] = createSignal({ width: 0, height: 0 });

  const tileRects = () => {
    const { width, height } = containerSize();
    if (width === 0 || height === 0) return [];
    const mode = layoutMode();
    const ratio = Math.max(0.1, Math.min(0.9, splitRatio()));
    switch (mode) {
      case "split-vertical":
        return [
          { x: 0, y: 0, width: width * ratio, height },
          { x: width * ratio, y: 0, width: width * (1 - ratio), height },
        ];
      case "split-horizontal":
        return [
          { x: 0, y: 0, width, height: height * ratio },
          { x: 0, y: height * ratio, width, height: height * (1 - ratio) },
        ];
      case "three-column":
        return [
          { x: 0, y: 0, width: width / 3, height },
          { x: width / 3, y: 0, width: width / 3, height },
          { x: (width * 2) / 3, y: 0, width: width / 3, height },
        ];
      case "two-thirds-left":
        return [
          { x: 0, y: 0, width: width * ratio, height },
          { x: width * ratio, y: 0, width: width * (1 - ratio), height },
        ];
      case "two-thirds-right":
        return [
          { x: 0, y: 0, width: width * (1 - ratio), height },
          { x: width * (1 - ratio), y: 0, width: width * ratio, height },
        ];
      case "grid":
        return [
          { x: 0, y: 0, width: width / 2, height: height / 2 },
          { x: width / 2, y: 0, width: width / 2, height: height / 2 },
          { x: 0, y: height / 2, width: width / 2, height: height / 2 },
          { x: width / 2, y: height / 2, width: width / 2, height: height / 2 },
        ];
      default:
        return [{ x: 0, y: 0, width, height }];
    }
  };

  // Apply tiling layout when layout mode or assignments change
  createEffect(on(
    () => [layoutMode(), JSON.stringify(tileAssignments), containerSize(), splitRatio()],
    () => {
      if (layoutMode() === "single") return;
      const currentMode = layoutMode();
      const minPerTile = currentMode === "three-column" ? 600 : 500;
      if (containerSize().width < minPerTile) {
        if (layoutMode() !== "single") {
          showToast("Window too narrow for tiling layout", "warning");
        }
        setLayoutMode("single");
        return;
      }
      const rects = tileRects();
      const rect = containerRef?.getBoundingClientRect();
      if (!rect) return;

      const layoutInfos: AppLayoutInfo[] = [];
      for (let i = 0; i < rects.length; i++) {
        const appId = tileAssignments[i];
        if (appId) {
          layoutInfos.push({
            app_id: appId,
            x: rect.x + rects[i].x,
            y: rect.y + rects[i].y,
            width: rects[i].width,
            height: rects[i].height,
          });
        }
      }
      if (layoutInfos.length > 0) {
        applyLayout(layoutInfos).catch(console.error);
      }
    },
    { defer: true },
  ));

  const enabledApps = () => visibleApps().filter(a => a.enabled);

  const handleDrag = (e: MouseEvent) => {
    const rect = containerRef?.getBoundingClientRect();
    if (!rect) return;
    if (layoutMode() === "split-vertical" || layoutMode() === "two-thirds-left" || layoutMode() === "two-thirds-right") {
      const newRatio = (e.clientX - rect.left) / rect.width;
      setSplitRatio(Math.max(0.1, Math.min(0.9, newRatio)));
    } else if (layoutMode() === "split-horizontal") {
      const newRatio = (e.clientY - rect.top) / rect.height;
      setSplitRatio(Math.max(0.1, Math.min(0.9, newRatio)));
    }
  };

  const handleAssignApp = async (tileIndex: number, appId: string) => {
    setTileAssignments(tileIndex, appId);
    setActiveTileId(tileIndex);
    // Ensure the app webview exists without changing visibility.
    try {
      await ensureWebviewExists(appId);
    } catch (err) {
      console.error("Failed to prepare app webview for tile:", err);
    }

    // Re-apply tiling layout after ensuring the webview exists.
    const rects = tileRects();
    const rect = containerRef?.getBoundingClientRect();
    if (rect && rects.length > 0) {
      const layoutInfos: AppLayoutInfo[] = [];
      const assignments = tileAssignments;
      for (let i = 0; i < rects.length; i++) {
        const aid = i === tileIndex ? appId : assignments[i];
        if (aid) {
          layoutInfos.push({
            app_id: aid,
            x: rect.x + rects[i].x,
            y: rect.y + rects[i].y,
            width: rects[i].width,
            height: rects[i].height,
          });
        }
      }
      if (layoutInfos.length > 0) {
        try {
          await applyLayout(layoutInfos);
        } catch (err) {
          console.error("Failed to apply tiling layout:", err);
        }
      }
    }
  };

  return (
    <div ref={containerRef} role="main" aria-label="Content area" class="flex-1 relative bg-white dark:bg-[#121212] overflow-hidden">
      <FindBar
        visible={props.findBarVisible}
        onClose={props.onCloseFindBar}
      />

      {/* Hibernate fade-out overlay */}
      <Show when={fadingOut()}>
        <div
          class="absolute inset-0 z-50 bg-white dark:bg-[#121212] pointer-events-none animate-[fadeOut_300ms_ease-out_forwards]"
        />
      </Show>

      <Show when={layoutMode() !== "single"}>
        {/* Tiling overlay: slot selectors and dividers */}
        <div class="absolute inset-0 z-30 pointer-events-none">
          <For each={tileRects()}>
            {(rect, index) => (
              <div
                class={`absolute ${activeTileId() === index()
                  ? 'border-2 border-blue-500'
                  : 'border border-gray-300/30 dark:border-gray-600/30'} group`}
                style={{
                  left: `${rect.x}px`,
                  top: `${rect.y}px`,
                  width: `${rect.width}px`,
                  height: `${rect.height}px`,
                }}
              >
                <Show when={!tileAssignments[index()]}>
                  <div class="absolute inset-0 flex items-center justify-center pointer-events-auto bg-gray-50/80 dark:bg-gray-900/80">
                    <select
                      aria-label={`Assign app to tile ${index() + 1}`}
                      class="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-pointer"
                      onChange={(e) => {
                        if (e.currentTarget.value) handleAssignApp(index(), e.currentTarget.value);
                      }}
                    >
                      <option value="">Select app...</option>
                      <For each={enabledApps()}>
                        {(app) => (
                          <option value={app.id}>{app.name}</option>
                        )}
                      </For>
                    </select>
                  </div>
                </Show>
                <Show when={tileAssignments[index()]}>
                  <div
                    class={`absolute top-1 left-1 px-1.5 py-0.5 text-[10px] rounded pointer-events-auto cursor-pointer ${
                      activeTileId() === index()
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200/80 dark:bg-gray-700/80 text-gray-600 dark:text-gray-300"
                    } transition-opacity opacity-70 group-hover:opacity-0`}
                    onClick={() => setActiveTileId(index())}
                  >
                    {appConfigs.find(a => a.id === tileAssignments[index()])?.name ?? "App"}
                  </div>
                </Show>
              </div>
            )}
          </For>
          <Show when={layoutMode() !== "single" && layoutMode() !== "grid" && layoutMode() !== "three-column"}>
            <div
              class={`absolute z-40 bg-gray-300 dark:bg-gray-600 hover:bg-blue-500 transition-all duration-200 ease-out ${
                layoutMode() === "split-horizontal"
                  ? "h-1 w-full cursor-row-resize -mt-0.5"
                  : "w-1 h-full cursor-col-resize -ml-0.5"
              }`}
              style={{
                left: layoutMode() !== "split-horizontal"
                  ? `${containerSize().width * splitRatio()}px` : "0",
                top: layoutMode() === "split-horizontal"
                  ? `${containerSize().height * splitRatio()}px` : "0",
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                const stop = () => {
                  window.removeEventListener("mousemove", handleDrag);
                  window.removeEventListener("mouseup", stop);
                };
                window.addEventListener("mousemove", handleDrag);
                window.addEventListener("mouseup", stop);
              }}
              onDblClick={() => setSplitRatio(0.5)}
            />
          </Show>
        </div>
      </Show>

      <Show when={layoutMode() === "single"}>
        <Show when={activeApp()} fallback={<EmptyState hasApps={appConfigs.length > 0} />}>
          {(app) => (
            <Switch fallback={<LoadingState appName={app().name} icon={app().icon} />}>
              <Match when={activeState()?.state === "active"}>
                <div id="webview-container" class="absolute inset-0" />
              </Match>
              <Match when={activeState()?.state === "loading"}>
                <LoadingState appName={app().name} icon={app().icon} message="Loading..." />
              </Match>
              <Match when={activeState()?.state === "hibernated"}>
                <LoadingState appName={app().name} icon={app().icon} message="Waking up..." />
              </Match>
              <Match when={activeState()?.state === "disabled"}>
                <div class="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
                  <div class="text-4xl">⏸️</div>
                  <p class="text-lg">This app is disabled</p>
                  <button
                    class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                    onClick={handleEnable}
                  >
                    Enable App
                  </button>
                </div>
              </Match>
              <Match when={activeState()?.state === "error"}>
                <ErrorState appName={app().name} message={activeState()?.error_message} />
              </Match>
              <Match when={activeState()?.state === "crashed"}>
                <CrashedState appName={app().name} onReload={handleReload} />
              </Match>
              <Match when={activeState()?.state === "certificate_error"}>
                <CertificateWarning
                  appId={app().id}
                  appName={app().name}
                  message={activeState()?.error_message}
                />
              </Match>
            </Switch>
          )}
        </Show>
      </Show>
    </div>
  );
};

export default ContentArea;
