use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageSnapshot {
    pub provider: String,
    pub primary: UsageWindow,
    pub secondary: Option<UsageWindow>,
    #[serde(default)]
    pub extra_windows: Vec<UsageWindow>,
    pub fetched_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageWindow {
    pub name: String,
    pub utilization: f64,
    pub resets_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionTokens {
    pub session_id: String,
    pub display_name: String,
    pub conversation_title: String,
    pub input_tokens: u64,
    pub output_tokens: u64,
    pub cache_read_tokens: u64,
    pub cache_creation_tokens: u64,
    pub last_context_tokens: u64,
    pub context_limit: u64,
    pub last_model: String,
    pub message_count: u64,
    pub status: String,
    pub last_activity_epoch: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderConfig {
    pub enabled: bool,
    pub plan_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub refresh_interval_seconds: u64,
    pub position: Position,
    pub start_expanded: bool,
    pub auto_collapse_seconds: u64,
    pub opacity: f64,
    pub session_recency_minutes: u64,
    pub theme: String,
    pub providers: Providers,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Position {
    pub x: i32,
    pub y: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Providers {
    pub claude: ProviderConfig,
    pub cursor: ProviderConfig,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            refresh_interval_seconds: 120,
            position: Position { x: -1, y: -1 },
            start_expanded: true,
            auto_collapse_seconds: 0,
            opacity: 0.85,
            session_recency_minutes: 30,
            theme: "dark".to_string(),
            providers: Providers {
                claude: ProviderConfig {
                    enabled: true,
                    plan_name: "Max ($100/mo)".to_string(),
                },
                cursor: ProviderConfig {
                    enabled: true,
                    plan_name: "Pro ($20/mo)".to_string(),
                },
            },
        }
    }
}
