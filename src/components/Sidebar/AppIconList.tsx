import { Component, For, Show, createSignal, createMemo } from "solid-js";
import {
  DragDropProvider,
  DragDropSensors,
  DragOverlay,
  SortableProvider,
  createSortable,
  closestCenter,
  useDragDropContext,
} from "@thisbeyond/solid-dnd";
import type { DragEvent } from "@thisbeyond/solid-dnd";

declare module "solid-js" {
  namespace JSX {
    interface Directives {
      sortable: true;
    }
  }
}
import AppIcon from "./AppIcon";
import SidebarSection from "./SidebarSection";
import ContextMenu from "./ContextMenu";
import {
  appConfigs,
  setAppConfigs,
  appStates,
  visibleApps,
} from "../../stores/uiStore";
import { activateApp, updateApp } from "../../lib/ipc";

interface SortableAppIconProps {
  app: {
    id: string;
    name: string;
    state: "active" | "hibernated" | "disabled";
    badgeCount: number | null;
    icon?: string;
    audioMuted: boolean;
  };
  onClick: (id: string) => void;
  onContextMenu: (e: MouseEvent, id: string) => void;
}

const SortableAppIcon: Component<SortableAppIconProps> = (props) => {
  const sortable = createSortable(props.app.id);
  const [state] = useDragDropContext()!;
  return (
    <div
      use:sortable
      classList={{
        "opacity-25": sortable.isActiveDraggable,
        "transition-transform": !!state.active.draggable,
      }}
    >
      <AppIcon
        id={props.app.id}
        name={props.app.name}
        icon={props.app.icon}
        state={props.app.state}
        badgeCount={props.app.badgeCount}
        audioMuted={props.app.audioMuted}
        onClick={props.onClick}
        onContextMenu={props.onContextMenu}
      />
    </div>
  );
};

const AppIconList: Component = () => {
  const [contextMenuPos, setContextMenuPos] = createSignal<{
    x: number;
    y: number;
    appId: string;
  } | null>(null);
  const [activeItem, setActiveItem] = createSignal<string | null>(null);

  const sortedApps = createMemo(() => {
    return [...visibleApps()]
      .sort((a, b) => a.position - b.position)
      .map((config) => {
        const state = appStates.find((s) => s.id === config.id);
        return {
          id: config.id,
          name: config.name,
          state: (state?.state ?? "active") as
            | "active"
            | "hibernated"
            | "disabled",
          badgeCount: state?.badge_count ?? null,
          audioMuted: config.audio_muted,
          icon: config.icon,
          sidebarSection: config.sidebar_section,
        };
      });
  });

  const sections = createMemo(() => {
    const apps = sortedApps();
    const sectionMap = new Map<
      string,
      (typeof apps)[number][]
    >();
    for (const app of apps) {
      const section = app.sidebarSection || "default";
      if (!sectionMap.has(section)) {
        sectionMap.set(section, []);
      }
      sectionMap.get(section)!.push(app);
    }
    return sectionMap;
  });

  // Build IDs in the same order as the DOM (flattened from section groups)
  const renderedIds = createMemo(() => {
    const result: string[] = [];
    for (const [, apps] of sections().entries()) {
      for (const app of apps) {
        result.push(app.id);
      }
    }
    return result;
  });

  const handleClick = async (id: string) => {
    try {
      await activateApp(id);
    } catch (err) {
      console.error("Failed to activate app:", err);
    }
  };

  const handleContextMenu = (e: MouseEvent, id: string) => {
    setContextMenuPos({ x: e.clientX, y: e.clientY, appId: id });
  };

  const onDragStart = ({ draggable }: DragEvent) => {
    setActiveItem(draggable.id as string);
  };

  const onDragEnd = ({ draggable, droppable }: DragEvent) => {
    setActiveItem(null);
    if (draggable && droppable) {
      const ids = renderedIds();
      const fromIndex = ids.indexOf(draggable.id as string);
      const toIndex = ids.indexOf(droppable.id as string);
      if (fromIndex !== toIndex) {
        // Determine the target section from the droppable app
        const droppableApp = sortedApps().find((a) => a.id === droppable.id);
        const targetSection = droppableApp?.sidebarSection || "default";

        const reordered = ids.slice();
        reordered.splice(toIndex, 0, ...reordered.splice(fromIndex, 1));
        reordered.forEach((id, index) => {
          const configIndex = appConfigs.findIndex((c) => c.id === id);
          if (configIndex !== -1) {
            setAppConfigs(configIndex, "position", index);
            // Update sidebar_section if the dragged app moved to a different section
            if (id === draggable.id) {
              setAppConfigs(configIndex, "sidebar_section", targetSection);
            }
          }
        });
        // Persist updated positions and section to backend
        reordered.forEach((id, index) => {
          const app = appConfigs.find((c) => c.id === id);
          if (app) {
            const updates = { ...app, position: index };
            if (id === draggable.id) {
              updates.sidebar_section = targetSection;
            }
            updateApp(updates).catch((err) =>
              console.error("Failed to persist position:", err)
            );
          }
        });
      }
    }
  };

  const activeApp = () => {
    const id = activeItem();
    return id ? sortedApps().find((a) => a.id === id) : null;
  };

  return (
    <div class="flex-1 overflow-y-auto px-1.5 py-2 space-y-0.5">
      <DragDropProvider
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        collisionDetector={closestCenter}
      >
        <DragDropSensors />
        <SortableProvider ids={renderedIds()}>
          <For each={[...sections().entries()]}>
            {([sectionName, apps], index) => (
              <>
                <Show when={index() > 0}>
                  <SidebarSection label={sectionName} />
                </Show>
                <For each={apps}>
                  {(app) => (
                    <SortableAppIcon
                      app={app}
                      onClick={handleClick}
                      onContextMenu={handleContextMenu}
                    />
                  )}
                </For>
              </>
            )}
          </For>
        </SortableProvider>
        <DragOverlay>
          <Show when={activeApp()}>
            {(app) => (
              <div class="bg-white dark:bg-[#1E1E1E] rounded-lg shadow-lg">
                <AppIcon
                  id={app().id}
                  name={app().name}
                  icon={app().icon}
                  state={app().state}
                  badgeCount={app().badgeCount}
                  audioMuted={app().audioMuted}
                  onClick={() => {}}
                  onContextMenu={() => {}}
                />
              </div>
            )}
          </Show>
        </DragOverlay>
      </DragDropProvider>

      <Show when={contextMenuPos()}>
        {(pos) => (
          <ContextMenu
            position={pos()}
            appId={pos().appId}
            onClose={() => setContextMenuPos(null)}
          />
        )}
      </Show>
    </div>
  );
};

export default AppIconList;
