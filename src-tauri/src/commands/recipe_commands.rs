use tauri::{AppHandle, Manager, State};

use crate::recipes::{RecipeManager, RecipeStatus};

#[tauri::command]
pub fn update_recipes(app_handle: AppHandle) -> Result<(), String> {
    let handle = app_handle.clone();
    tauri::async_runtime::spawn(async move {
        let rm = handle.state::<RecipeManager>();
        if let Err(e) = rm.update().await {
            log::warn!("Failed to update recipes: {}", e);
            rm.set_error(e.to_string());
        }
    });
    Ok(())
}

#[tauri::command]
pub fn get_recipe_status(
    recipe_manager: State<'_, RecipeManager>,
) -> RecipeStatus {
    recipe_manager.get_status()
}
