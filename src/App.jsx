import { useState, useEffect, useRef, useCallback } from "react";
import {
  getCurrentWindow,
  LogicalSize,
  LogicalPosition,
} from "@tauri-apps/api/window";
import CollapsedBar from "./components/CollapsedBar";
import ExpandedPanel from "./components/ExpandedPanel";
import useUsageData from "./hooks/useUsageData";
import useConfig from "./hooks/useConfig";
import "./App.css";

const COLLAPSED_HEIGHT = 48;
const PANEL_WIDTH = 340;

export default function App() {
  const { config, saveConfig } = useConfig();
  const { claude, cursor, sessions, loading, errors } = useUsageData(config);
  const [expanded, setExpanded] = useState(false);
  const expandedRef = useRef(null);
  const autoCollapseRef = useRef(null);

  // Set initial expanded state from config
  useEffect(() => {
    if (config?.start_expanded) {
      setExpanded(true);
    }
  }, [config?.start_expanded]);

  // Apply theme to document
  useEffect(() => {
    if (config?.theme) {
      document.documentElement.setAttribute("data-theme", config.theme);
    }
  }, [config?.theme]);

  const handleToggleTheme = useCallback(() => {
    if (!config) return;
    const newTheme = config.theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    saveConfig({ ...config, theme: newTheme });
  }, [config, saveConfig]);

  // Apply saved position on startup (once only)
  const positionAppliedRef = useRef(false);
  useEffect(() => {
    if (
      !positionAppliedRef.current &&
      config?.position &&
      config.position.x >= 0 &&
      config.position.y >= 0
    ) {
      positionAppliedRef.current = true;
      const appWindow = getCurrentWindow();
      appWindow.setPosition(
        new LogicalPosition(config.position.x, config.position.y)
      );
    }
  }, [config?.position?.x, config?.position?.y]);

  // Save position when window is moved (convert physical → logical)
  useEffect(() => {
    const appWindow = getCurrentWindow();
    let saveTimeout;

    const unlisten = appWindow.onMoved(({ payload }) => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(async () => {
        if (config) {
          const scaleFactor = await appWindow.scaleFactor();
          const logicalX = Math.round(payload.x / scaleFactor);
          const logicalY = Math.round(payload.y / scaleFactor);
          saveConfig({
            ...config,
            position: { x: logicalX, y: logicalY },
          });
        }
      }, 500);
    });

    return () => {
      clearTimeout(saveTimeout);
      unlisten.then((fn) => fn());
    };
  }, [config, saveConfig]);

  // Resize window when expand/collapse changes
  useEffect(() => {
    const appWindow = getCurrentWindow();

    if (!expanded) {
      appWindow.setSize(new LogicalSize(PANEL_WIDTH, COLLAPSED_HEIGHT));
      return;
    }

    // Wait a frame for the DOM to render, then measure
    const timer = setTimeout(() => {
      if (expandedRef.current) {
        const contentHeight =
          COLLAPSED_HEIGHT + expandedRef.current.scrollHeight;
        const clampedHeight = Math.min(contentHeight, 600);
        appWindow.setSize(new LogicalSize(PANEL_WIDTH, clampedHeight));
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [expanded, claude, cursor, sessions]);

  // Auto-collapse after inactivity
  const resetAutoCollapse = useCallback(() => {
    if (autoCollapseRef.current) clearTimeout(autoCollapseRef.current);
    const seconds = config?.auto_collapse_seconds ?? 0;
    if (seconds > 0 && expanded) {
      autoCollapseRef.current = setTimeout(() => {
        setExpanded(false);
      }, seconds * 1000);
    }
  }, [config?.auto_collapse_seconds, expanded]);

  useEffect(() => {
    resetAutoCollapse();
    return () => {
      if (autoCollapseRef.current) clearTimeout(autoCollapseRef.current);
    };
  }, [resetAutoCollapse]);

  const handleToggle = () => {
    setExpanded((prev) => !prev);
  };

  if (loading && !claude && !cursor) {
    return (
      <div className="app" data-tauri-drag-region>
        <div className="collapsed-bar loading-bar" data-tauri-drag-region>
          <span className="label">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <CollapsedBar
        claudeUsage={claude}
        cursorUsage={cursor}
        onToggle={handleToggle}
        expanded={expanded}
        theme={config?.theme ?? "dark"}
        onToggleTheme={handleToggleTheme}
      />
      {expanded && (
        <div ref={expandedRef}>
          <ExpandedPanel
            claudeSnapshot={claude}
            cursorSnapshot={cursor}
            claudeError={errors.claude}
            cursorError={errors.cursor}
            sessions={sessions}
            config={config}
          />
        </div>
      )}
    </div>
  );
}
