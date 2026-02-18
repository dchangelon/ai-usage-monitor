use crate::models::SessionTokens;
use serde_json::Value;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

const DEFAULT_CONTEXT_LIMIT: u64 = 200_000;

fn model_context_limit(_model: &str) -> u64 {
    // All current Claude models use 200k context
    DEFAULT_CONTEXT_LIMIT
}

fn extract_project_name(dir_name: &str) -> String {
    // Remove drive prefix (e.g., "c--")
    let path_part = if let Some(idx) = dir_name.find("--") {
        &dir_name[idx + 2..]
    } else {
        dir_name
    };

    // Look for common parent directory markers and take what follows
    let markers = [
        "-Desktop-",
        "-Documents-",
        "-Projects-",
        "-repos-",
        "-src-",
        "-home-",
    ];

    for marker in &markers {
        if let Some(idx) = path_part.rfind(marker) {
            return path_part[idx + marker.len()..].to_string();
        }
    }

    // Fallback: return full path after drive
    path_part.to_string()
}

fn extract_conversation_title(entry: &Value) -> Option<String> {
    let content = entry.get("message")?.get("content")?;
    if let Some(arr) = content.as_array() {
        // Skip IDE-injected context (tags like <ide_opened_file>, <ide_selection>, etc.)
        for item in arr {
            if item.get("type").and_then(|t| t.as_str()) == Some("text") {
                if let Some(text) = item.get("text").and_then(|t| t.as_str()) {
                    let trimmed = text.trim();
                    if !trimmed.is_empty() && !trimmed.starts_with('<') {
                        let truncated: String = trimmed.chars().take(80).collect();
                        return Some(truncated);
                    }
                }
            }
        }
    } else if let Some(text) = content.as_str() {
        let trimmed = text.trim();
        if !trimmed.is_empty() && !trimmed.starts_with('<') {
            let truncated: String = trimmed.chars().take(80).collect();
            return Some(truncated);
        }
    }
    None
}

fn parse_session_file(jsonl_path: &Path) -> SessionTokens {
    let session_id = jsonl_path
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let dir_name = jsonl_path
        .parent()
        .unwrap_or(jsonl_path)
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let display_name = extract_project_name(&dir_name);

    let mut tokens = SessionTokens {
        session_id: session_id.clone(),
        display_name,
        conversation_title: String::new(),
        input_tokens: 0,
        output_tokens: 0,
        cache_read_tokens: 0,
        cache_creation_tokens: 0,
        last_context_tokens: 0,
        context_limit: DEFAULT_CONTEXT_LIMIT,
        last_model: String::new(),
        message_count: 0,
    };

    let content = match std::fs::read_to_string(jsonl_path) {
        Ok(c) => c,
        Err(_) => return tokens,
    };

    let mut found_title = false;

    for line in content.lines() {
        if line.trim().is_empty() {
            continue;
        }
        let entry: Value = match serde_json::from_str(line) {
            Ok(v) => v,
            Err(_) => continue,
        };

        // Extract conversation title from first user message
        if !found_title && entry.get("type").and_then(|t| t.as_str()) == Some("user") {
            if let Some(title) = extract_conversation_title(&entry) {
                tokens.conversation_title = title;
                found_title = true;
            }
        }

        if let Some(usage) = entry.get("message").and_then(|m| m.get("usage")) {
            tokens.message_count += 1;

            let input = usage["input_tokens"].as_u64().unwrap_or(0);
            let output = usage["output_tokens"].as_u64().unwrap_or(0);
            let cache_read = usage["cache_read_input_tokens"].as_u64().unwrap_or(0);
            let cache_creation = usage["cache_creation_input_tokens"].as_u64().unwrap_or(0);

            tokens.input_tokens += input;
            tokens.output_tokens += output;
            tokens.cache_read_tokens += cache_read;
            tokens.cache_creation_tokens += cache_creation;

            if let Some(model) = entry["message"]["model"].as_str() {
                tokens.last_model = model.to_string();
            }

            // Track last message's context fill
            tokens.last_context_tokens = input + cache_read + cache_creation;
        }
    }

    tokens.context_limit = model_context_limit(&tokens.last_model);

    // Sum subagent files
    let subagents_dir = jsonl_path
        .parent()
        .unwrap_or(jsonl_path)
        .join(&session_id)
        .join("subagents");

    if subagents_dir.exists() {
        if let Ok(entries) = std::fs::read_dir(&subagents_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .starts_with("agent-")
                    && path.extension().map_or(false, |ext| ext == "jsonl")
                {
                    let sub = parse_session_file(&path);
                    tokens.input_tokens += sub.input_tokens;
                    tokens.output_tokens += sub.output_tokens;
                    tokens.cache_read_tokens += sub.cache_read_tokens;
                    tokens.cache_creation_tokens += sub.cache_creation_tokens;
                    tokens.message_count += sub.message_count;
                }
            }
        }
    }

    tokens
}

#[tauri::command]
pub async fn get_sessions(recency_minutes: Option<u64>) -> Result<Vec<SessionTokens>, String> {
    let threshold = recency_minutes.unwrap_or(30);
    let base_path = dirs::home_dir()
        .unwrap_or_default()
        .join(".claude")
        .join("projects");

    if !base_path.exists() {
        return Ok(Vec::new());
    }

    let cutoff = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
        - (threshold * 60);

    let mut candidates: Vec<PathBuf> = Vec::new();

    // Walk directory tree looking for .jsonl files, excluding subagents/
    fn find_jsonl_files(dir: &Path, candidates: &mut Vec<PathBuf>) {
        let entries = match std::fs::read_dir(dir) {
            Ok(e) => e,
            Err(_) => return,
        };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let name = path.file_name().unwrap_or_default().to_string_lossy();
                if name != "subagents" {
                    find_jsonl_files(&path, candidates);
                }
            } else if path.extension().map_or(false, |ext| ext == "jsonl") {
                candidates.push(path);
            }
        }
    }

    find_jsonl_files(&base_path, &mut candidates);

    // Filter by recency
    let recent: Vec<PathBuf> = candidates
        .into_iter()
        .filter(|p| {
            p.metadata()
                .ok()
                .and_then(|m| m.modified().ok())
                .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                .map_or(false, |d| d.as_secs() >= cutoff)
        })
        .collect();

    // Parse all recent sessions, sort by mtime, cap at 10
    let mut session_entries: Vec<(u64, SessionTokens)> = recent
        .iter()
        .map(|path| {
            let mtime = path
                .metadata()
                .ok()
                .and_then(|m| m.modified().ok())
                .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                .map_or(0, |d| d.as_secs());
            let tokens = parse_session_file(path);
            (mtime, tokens)
        })
        .collect();

    session_entries.retain(|(_, tokens)| tokens.message_count > 0);
    session_entries.sort_by(|a, b| b.0.cmp(&a.0));
    session_entries.truncate(10);

    let sessions: Vec<SessionTokens> = session_entries.into_iter().map(|(_, t)| t).collect();

    Ok(sessions)
}
