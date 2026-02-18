use crate::models::{UsageSnapshot, UsageWindow};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use chrono::Utc;
use serde_json::Value;
use std::path::PathBuf;

fn db_path() -> PathBuf {
    let appdata = std::env::var("APPDATA").unwrap_or_default();
    PathBuf::from(appdata)
        .join("Cursor")
        .join("User")
        .join("globalStorage")
        .join("state.vscdb")
}

fn read_cursor_credentials() -> Result<(String, String), String> {
    let path = db_path();
    if !path.exists() {
        return Err("Cursor database not found".to_string());
    }

    let conn = rusqlite::Connection::open_with_flags(
        &path,
        rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY | rusqlite::OpenFlags::SQLITE_OPEN_NO_MUTEX,
    )
    .map_err(|e| format!("Failed to open Cursor DB: {e}"))?;

    // WAL mode prevents locking conflicts when Cursor has the DB open
    conn.execute_batch("PRAGMA journal_mode=wal")
        .map_err(|e| format!("Failed to set WAL mode: {e}"))?;

    let access_token: String = conn
        .query_row(
            "SELECT value FROM ItemTable WHERE key = 'cursorAuth/accessToken'",
            [],
            |row| row.get(0),
        )
        .map_err(|_| "Cursor access token not found in database".to_string())?;

    // Decode JWT payload to extract user_id (sub claim)
    let parts: Vec<&str> = access_token.split('.').collect();
    if parts.len() < 2 {
        return Err("Invalid JWT format".to_string());
    }

    let payload_bytes = URL_SAFE_NO_PAD
        .decode(parts[1])
        .map_err(|e| format!("Failed to decode JWT payload: {e}"))?;

    let payload: Value = serde_json::from_slice(&payload_bytes)
        .map_err(|e| format!("Failed to parse JWT payload: {e}"))?;

    let user_id = payload["sub"]
        .as_str()
        .ok_or("No 'sub' claim in JWT")?
        .to_string();

    Ok((user_id, access_token))
}

#[tauri::command]
pub async fn get_cursor_usage() -> Result<UsageSnapshot, String> {
    let (user_id, access_token) = read_cursor_credentials()?;

    let cookie = format!("WorkosCursorSessionToken={user_id}::{access_token}");

    let client = reqwest::Client::new();
    let response = client
        .get("https://cursor.com/api/usage-summary")
        .header("Cookie", &cookie)
        .timeout(std::time::Duration::from_secs(15))
        .send()
        .await
        .map_err(|e| format!("API unreachable: {e}"))?;

    if response.status() == 401 {
        return Err("Token expired — restart Cursor or re-authenticate".to_string());
    }

    let data: Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {e}"))?;

    let plan = &data["individualUsage"]["plan"];
    let billing_end = data["billingCycleEnd"].as_str().map(String::from);

    let primary = UsageWindow {
        name: "Total".to_string(),
        utilization: plan["totalPercentUsed"].as_f64().unwrap_or(0.0),
        resets_at: billing_end.clone(),
    };

    let secondary = Some(UsageWindow {
        name: "Auto+Composer".to_string(),
        utilization: plan["autoPercentUsed"].as_f64().unwrap_or(0.0),
        resets_at: billing_end.clone(),
    });

    let extra_windows = vec![UsageWindow {
        name: "API".to_string(),
        utilization: plan["apiPercentUsed"].as_f64().unwrap_or(0.0),
        resets_at: billing_end,
    }];

    Ok(UsageSnapshot {
        provider: "cursor".to_string(),
        primary,
        secondary,
        extra_windows,
        fetched_at: Utc::now().to_rfc3339(),
    })
}
