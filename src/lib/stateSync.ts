import { getConfig, getAppStates } from "./ipc";
import {
  setAppConfigs,
  setAppStates,
  setDndEnabled,
  setWorkspaces,
  setActiveWorkspaceId,
  setTheme,
} from "../stores/uiStore";

export async function initializeState() {
  try {
    const config = await getConfig();
    setAppConfigs(config.apps);
    setDndEnabled(config.general.dnd_enabled);
    setTheme(config.general.theme);
    setWorkspaces(config.workspaces.items);
    setActiveWorkspaceId(config.workspaces.active);

    const states = await getAppStates();
    setAppStates(states);
  } catch (err) {
    console.error("Failed to initialize state:", err);
  }
}

export async function refreshAppStates() {
  try {
    const states = await getAppStates();
    setAppStates(states);
  } catch (err) {
    console.error("Failed to refresh app states:", err);
  }
}

export async function refreshAppConfigs() {
  try {
    const config = await getConfig();
    setAppConfigs(config.apps);
  } catch (err) {
    console.error("Failed to refresh app configs:", err);
  }
}
