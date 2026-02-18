use crate::models::AppConfig;
use std::path::PathBuf;
use tauri::Manager;

fn config_path(app: &tauri::AppHandle) -> PathBuf {
    let data_dir = app.path().app_data_dir().unwrap_or_else(|_| {
        dirs::data_dir()
            .unwrap_or_default()
            .join("com.ai-usage-monitor.app")
    });
    std::fs::create_dir_all(&data_dir).ok();
    data_dir.join("config.json")
}

#[tauri::command]
pub fn get_config(app: tauri::AppHandle) -> Result<AppConfig, String> {
    let path = config_path(&app);

    if !path.exists() {
        let default = AppConfig::default();
        // Write defaults so the file exists for future use
        let json = serde_json::to_string_pretty(&default)
            .map_err(|e| format!("Failed to serialize config: {e}"))?;
        std::fs::write(&path, json).ok();
        return Ok(default);
    }

    let data =
        std::fs::read_to_string(&path).map_err(|e| format!("Failed to read config: {e}"))?;

    // Merge with defaults: parse as Value, apply defaults for missing fields
    let user_val: serde_json::Value =
        serde_json::from_str(&data).map_err(|e| format!("Failed to parse config: {e}"))?;

    let default_val = serde_json::to_value(AppConfig::default())
        .map_err(|e| format!("Failed to serialize defaults: {e}"))?;

    let merged = merge_json(default_val, user_val);

    serde_json::from_value(merged).map_err(|e| format!("Failed to deserialize config: {e}"))
}

#[tauri::command]
pub fn save_config(app: tauri::AppHandle, config: AppConfig) -> Result<(), String> {
    let path = config_path(&app);
    let json = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize config: {e}"))?;
    std::fs::write(&path, json).map_err(|e| format!("Failed to write config: {e}"))
}

/// Deep merge: user values override defaults, but missing keys get defaults
fn merge_json(default: serde_json::Value, user: serde_json::Value) -> serde_json::Value {
    match (default, user) {
        (serde_json::Value::Object(mut def), serde_json::Value::Object(usr)) => {
            for (key, usr_val) in usr {
                let def_val = def.remove(&key).unwrap_or(serde_json::Value::Null);
                def.insert(key, merge_json(def_val, usr_val));
            }
            serde_json::Value::Object(def)
        }
        (_, user) => user,
    }
}
