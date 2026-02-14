use tauri::{AppHandle, Emitter, Manager, State};

use crate::config::manager::ConfigManager;
use crate::config::models::Workspace;

#[tauri::command]
pub fn get_workspaces(config_manager: State<'_, ConfigManager>) -> Result<Vec<Workspace>, String> {
    let config = config_manager.get_config();
    Ok(config.workspaces.items.clone())
}

#[tauri::command]
pub fn get_active_workspace(
    config_manager: State<'_, ConfigManager>,
) -> Result<String, String> {
    let config = config_manager.get_config();
    Ok(config.workspaces.active.clone())
}

#[tauri::command(rename_all = "snake_case")]
pub fn switch_workspace(
    workspace_id: String,
    config_manager: State<'_, ConfigManager>,
    app_handle: AppHandle,
) -> Result<(), String> {
    let mut config = config_manager.get_config();

    let target_ws = config.workspaces.items.iter().find(|w| w.id == workspace_id)
        .ok_or_else(|| format!("Workspace '{}' not found", workspace_id))?
        .clone();

    let should_auto_hibernate = config.workspaces.auto_hibernate_on_workspace_switch;

    config.workspaces.active = workspace_id.clone();
    config_manager
        .save_config(config.clone())
        .map_err(|e| e.to_string())?;

    // Auto-hibernate apps not in the new workspace
    if should_auto_hibernate && workspace_id != "default" {
        let app_manager = app_handle.state::<crate::app_manager::state::AppManager>();
        let apps_lock = app_manager.apps.lock().expect("apps lock");
        let active_ids: Vec<String> = apps_lock.iter()
            .filter(|(_, r)| matches!(r.state, crate::app_manager::state::AppRuntimeState::Active { .. }))
            .map(|(id, _)| id.clone())
            .collect();
        drop(apps_lock);

        for app_id in active_ids {
            if !target_ws.app_ids.contains(&app_id) {
                let _ = crate::app_manager::lifecycle::destroy_app_webview(&app_handle, &app_id);
                app_manager.set_state(&app_id, crate::app_manager::state::AppRuntimeState::Hibernated {
                    last_url: config.apps.iter().find(|a| a.id == app_id).map(|a| a.url.clone()).unwrap_or_default(),
                });
            }
        }
    }

    let _ = app_handle.emit("workspace-switched", &workspace_id);
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub fn create_workspace(
    name: String,
    app_ids: Vec<String>,
    config_manager: State<'_, ConfigManager>,
) -> Result<Workspace, String> {
    let mut config = config_manager.get_config();
    let id = name.to_lowercase().replace(' ', "-");

    if config.workspaces.items.iter().any(|w| w.id == id) {
        return Err(format!("Workspace '{}' already exists", id));
    }

    let workspace = Workspace {
        id,
        name,
        app_ids,
    };

    config.workspaces.items.push(workspace.clone());
    config_manager
        .save_config(config)
        .map_err(|e| e.to_string())?;
    Ok(workspace)
}

#[tauri::command]
pub fn update_workspace(
    workspace: Workspace,
    config_manager: State<'_, ConfigManager>,
) -> Result<(), String> {
    let mut config = config_manager.get_config();
    if let Some(ws) = config
        .workspaces
        .items
        .iter_mut()
        .find(|w| w.id == workspace.id)
    {
        *ws = workspace;
    } else {
        return Err("Workspace not found".into());
    }
    config_manager
        .save_config(config)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub fn delete_workspace(
    workspace_id: String,
    config_manager: State<'_, ConfigManager>,
    app_handle: AppHandle,
) -> Result<(), String> {
    if workspace_id == "default" {
        return Err("Cannot delete the default workspace".into());
    }
    let mut config = config_manager.get_config();
    config.workspaces.items.retain(|w| w.id != workspace_id);
    let was_active = config.workspaces.active == workspace_id;
    if was_active {
        config.workspaces.active = "default".to_string();
    }
    config_manager
        .save_config(config)
        .map_err(|e| e.to_string())?;
    if was_active {
        let _ = app_handle.emit("workspace-switched", "default");
    }
    Ok(())
}
