import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

const ACTIVE_REFRESH_MS = 15_000; // 15s when sessions are actively working

export default function useUsageData(config) {
  const [claude, setClaude] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({ claude: null, cursor: null });
  const intervalRef = useRef(null);
  const sessionsIntervalRef = useRef(null);

  const refresh = useCallback(async () => {
    const recencyMinutes = config?.session_recency_minutes ?? 30;

    // Fetch all three in parallel
    const [claudeResult, cursorResult, sessionsResult] = await Promise.allSettled([
      invoke("get_claude_usage"),
      invoke("get_cursor_usage"),
      invoke("get_sessions", { recencyMinutes }),
    ]);

    if (claudeResult.status === "fulfilled") {
      setClaude(claudeResult.value);
      setErrors((prev) => ({ ...prev, claude: null }));
    } else {
      setErrors((prev) => ({ ...prev, claude: claudeResult.reason?.toString() ?? "Unknown error" }));
    }

    if (cursorResult.status === "fulfilled") {
      setCursor(cursorResult.value);
      setErrors((prev) => ({ ...prev, cursor: null }));
    } else {
      setErrors((prev) => ({ ...prev, cursor: cursorResult.reason?.toString() ?? "Unknown error" }));
    }

    if (sessionsResult.status === "fulfilled") {
      setSessions(sessionsResult.value);
    }

    setLoading(false);
  }, [config?.session_recency_minutes]);

  // Lightweight sessions-only refresh for active session polling
  const refreshSessions = useCallback(async () => {
    const recencyMinutes = config?.session_recency_minutes ?? 30;
    try {
      const result = await invoke("get_sessions", { recencyMinutes });
      setSessions(result);
    } catch (_) {
      // Silently ignore -- full refresh will retry
    }
  }, [config?.session_recency_minutes]);

  // Initial fetch + auto-refresh interval
  useEffect(() => {
    refresh();

    const intervalSeconds = config?.refresh_interval_seconds ?? 120;
    if (intervalSeconds > 0) {
      intervalRef.current = setInterval(refresh, intervalSeconds * 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh, config?.refresh_interval_seconds]);

  // Adaptive sessions-only refresh when active sessions exist
  useEffect(() => {
    const hasActive = sessions.some((s) => s.status === "active");

    if (hasActive && !sessionsIntervalRef.current) {
      sessionsIntervalRef.current = setInterval(refreshSessions, ACTIVE_REFRESH_MS);
    } else if (!hasActive && sessionsIntervalRef.current) {
      clearInterval(sessionsIntervalRef.current);
      sessionsIntervalRef.current = null;
    }

    return () => {
      if (sessionsIntervalRef.current) {
        clearInterval(sessionsIntervalRef.current);
        sessionsIntervalRef.current = null;
      }
    };
  }, [sessions, refreshSessions]);

  // Listen for tray "Refresh" menu event
  useEffect(() => {
    const unlisten = listen("refresh-data", () => {
      refresh();
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [refresh]);

  return { claude, cursor, sessions, loading, errors, refresh };
}
