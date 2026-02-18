use crate::models::{UsageSnapshot, UsageWindow};
use chrono::Utc;
use serde_json::Value;
use std::path::PathBuf;

fn credentials_path() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_default()
        .join(".claude")
        .join(".credentials.json")
}

#[tauri::command]
pub async fn get_claude_usage() -> Result<UsageSnapshot, String> {
    // Read credentials fresh every call to pick up OAuth token refreshes
    let creds_path = credentials_path();
    let creds_data = std::fs::read_to_string(&creds_path)
        .map_err(|_| "Credentials not found — check ~/.claude/.credentials.json".to_string())?;

    let creds: Value =
        serde_json::from_str(&creds_data).map_err(|e| format!("Failed to parse credentials: {e}"))?;

    let access_token = creds
        .get("claudeAiOauth")
        .and_then(|o| o.get("accessToken"))
        .and_then(|v| v.as_str())
        .ok_or("No accessToken found in credentials")?;

    // Call Claude usage API
    let client = reqwest::Client::new();
    let response = client
        .get("https://api.anthropic.com/api/oauth/usage")
        .header("Authorization", format!("Bearer {access_token}"))
        .header("anthropic-beta", "oauth-2025-04-20")
        .timeout(std::time::Duration::from_secs(15))
        .send()
        .await
        .map_err(|e| format!("API unreachable: {e}"))?;

    if response.status() == 401 {
        return Err("Token expired — restart app or re-authenticate".to_string());
    }

    let data: Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {e}"))?;

    // Parse five_hour window (primary)
    let five_hour = &data["five_hour"];
    let primary = UsageWindow {
        name: "5-Hour Session".to_string(),
        utilization: five_hour["utilization"].as_f64().unwrap_or(0.0),
        resets_at: five_hour["resets_at"].as_str().map(String::from),
    };

    // Parse seven_day window (secondary)
    let seven_day = &data["seven_day"];
    let secondary = if !seven_day.is_null() {
        Some(UsageWindow {
            name: "7-Day Weekly".to_string(),
            utilization: seven_day["utilization"].as_f64().unwrap_or(0.0),
            resets_at: seven_day["resets_at"].as_str().map(String::from),
        })
    } else {
        None
    };

    // Parse seven_day_opus (extra, only if utilization > 0)
    let mut extra_windows = Vec::new();
    let opus = &data["seven_day_opus"];
    if !opus.is_null() {
        let util = opus["utilization"].as_f64().unwrap_or(0.0);
        if util > 0.0 {
            extra_windows.push(UsageWindow {
                name: "7-Day Opus".to_string(),
                utilization: util,
                resets_at: opus["resets_at"].as_str().map(String::from),
            });
        }
    }

    Ok(UsageSnapshot {
        provider: "claude".to_string(),
        primary,
        secondary,
        extra_windows,
        fetched_at: Utc::now().to_rfc3339(),
    })
}
