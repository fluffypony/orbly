use tauri::{AppHandle, Emitter, Manager, State};

use crate::config::manager::ConfigManager;
use crate::config::models::Workspace;

#[tauri::command]
pub fn get_workspaces(
    webview: tauri::Webview,
    config_manager: State<'_, ConfigManager>,
) -> Result<Vec<Workspace>, String> {
    crate::commands::require_main_webview(&webview)?;
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
    webview: tauri::Webview,
    config_manager: State<'_, ConfigManager>,
    app_handle: AppHandle,
) -> Result<(), String> {
    crate::commands::require_main_webview(&webview)?;
    let current_config = config_manager.get_config();

    let target_ws = current_config.workspaces.items.iter().find(|w| w.id == workspace_id)
        .ok_or_else(|| format!("Workspace '{}' not found", workspace_id))?
        .clone();

    let should_auto_hibernate = current_config.workspaces.auto_hibernate_on_workspace_switch;

    config_manager
        .update_with(|config| {
            config.workspaces.active = workspace_id.clone();
        })
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

        let mut hibernated_ids: Vec<String> = Vec::new();
        for app_id in &active_ids {
            if !target_ws.app_ids.contains(app_id) {
                let last_url = crate::app_manager::lifecycle::destroy_app_webview(&app_handle, app_id)
                    .unwrap_or(None);
                let fallback_url = current_config.apps.iter().find(|a| a.id == *app_id)
                    .map(|a| a.url.clone()).unwrap_or_default();
                let url = last_url.unwrap_or(fallback_url);

                app_manager.set_state(app_id, crate::app_manager::state::AppRuntimeState::Hibernated {
                    last_url: url,
                });

                hibernated_ids.push(app_id.clone());

                // Remove from session state
                if let Some(session_state) = app_handle.try_state::<crate::app_manager::session_state::SessionState>() {
                    session_state.remove(app_id);
                }
            }
        }
        let _ = config_manager.update_with(|config| {
            for app in config.apps.iter_mut() {
                if hibernated_ids.iter().any(|id| id == &app.id) {
                    app.hibernated = true;
                }
            }
        });
    }

    let _ = app_handle.emit("workspace-switched", &workspace_id);
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub fn create_workspace(
    name: String,
    app_ids: Vec<String>,
    webview: tauri::Webview,
    config_manager: State<'_, ConfigManager>,
) -> Result<Workspace, String> {
    crate::commands::require_main_webview(&webview)?;
    let id = name.to_lowercase().replace(' ', "-");

    let config = config_manager.get_config();

    if config.workspaces.items.iter().any(|w| w.id == id) {
        return Err(format!("Workspace '{}' already exists", id));
    }

    let workspace = Workspace {
        id,
        name,
        app_ids,
        tiling_layout: String::new(),
        tile_assignments: vec![],
    };

    config_manager
        .update_with(|config| {
            config.workspaces.items.push(workspace.clone());
        })
        .map_err(|e| e.to_string())?;
    Ok(workspace)
}

#[tauri::command]
pub fn update_workspace(
    workspace: Workspace,
    webview: tauri::Webview,
    config_manager: State<'_, ConfigManager>,
) -> Result<(), String> {
    crate::commands::require_main_webview(&webview)?;
    let mut found = false;
    config_manager
        .update_with(|config| {
            if let Some(ws) = config
                .workspaces
                .items
                .iter_mut()
                .find(|w| w.id == workspace.id)
            {
                *ws = workspace.clone();
                found = true;
            }
        })
        .map_err(|e| e.to_string())?;
    if !found {
        return Err("Workspace not found".into());
    }
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub fn update_workspace_tiling(
    workspace_id: String,
    tiling_layout: String,
    tile_assignments: Vec<String>,
    webview: tauri::Webview,
    config_manager: State<'_, ConfigManager>,
) -> Result<(), String> {
    crate::commands::require_main_webview(&webview)?;
    let mut found = false;
    config_manager
        .update_with(|config| {
            if let Some(ws) = config.workspaces.items.iter_mut().find(|w| w.id == workspace_id) {
                ws.tiling_layout = tiling_layout.clone();
                ws.tile_assignments = tile_assignments.clone();
                found = true;
            }
        })
        .map_err(|e| e.to_string())?;
    if !found {
        return Err("Workspace not found".into());
    }
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub fn delete_workspace(
    workspace_id: String,
    webview: tauri::Webview,
    config_manager: State<'_, ConfigManager>,
    app_handle: AppHandle,
) -> Result<(), String> {
    crate::commands::require_main_webview(&webview)?;
    if workspace_id == "default" {
        return Err("Cannot delete the default workspace".into());
    }
    let mut was_active = false;
    config_manager
        .update_with(|config| {
            config.workspaces.items.retain(|w| w.id != workspace_id);
            was_active = config.workspaces.active == workspace_id;
            if was_active {
                config.workspaces.active = "default".to_string();
            }
        })
        .map_err(|e| e.to_string())?;
    if was_active {
        let _ = app_handle.emit("workspace-switched", "default");
    }
    Ok(())
}
