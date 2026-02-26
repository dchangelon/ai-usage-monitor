import { useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import ProgressBar from "./ProgressBar";
import "./CollapsedBar.css";

function MiniUsage({ label, percent, accent }) {
  return (
    <div className="mini-usage">
      <span className="mini-usage__dot" style={{ backgroundColor: accent }} />
      <span className="mini-usage__label">{label}</span>
      <span className="mini-usage__percent">
        {percent != null ? `${Math.round(percent)}%` : "--"}
      </span>
      <div className="mini-usage__bar">
        <ProgressBar percent={percent ?? 0} size="sm" />
      </div>
    </div>
  );
}

export default function CollapsedBar({
  claudeUsage,
  cursorUsage,
  onToggle,
  expanded,
  theme,
  onToggleTheme,
}) {
  const claudePercent = claudeUsage?.primary?.utilization ?? null;
  const cursorPercent = cursorUsage?.primary?.utilization ?? null;
  const mouseDownPos = useRef(null);

  const handleMouseDown = (e) => {
    if (e.button === 0) {
      mouseDownPos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e) => {
    if (!mouseDownPos.current || e.buttons !== 1) return;
    const dx = e.clientX - mouseDownPos.current.x;
    const dy = e.clientY - mouseDownPos.current.y;
    if (dx * dx + dy * dy > 9) { // 3px threshold
      mouseDownPos.current = null;
      getCurrentWindow().startDragging();
    }
  };

  const handleClick = () => {
    onToggle();
  };

  const handleExit = (e) => {
    e.stopPropagation();
    invoke("quit_app");
  };

  return (
    <div className="collapsed-bar" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onClick={handleClick}>
      <div className="collapsed-bar__providers">
        <MiniUsage
          label="Claude"
          percent={claudePercent}
          accent="var(--accent-claude)"
        />
        <div className="collapsed-bar__divider" />
        <MiniUsage
          label="Cursor"
          percent={cursorPercent}
          accent="var(--accent-cursor)"
        />
      </div>
      <div className="collapsed-bar__actions">
        <button
          className="collapsed-bar__theme-toggle"
          onClick={(e) => {
            e.stopPropagation();
            onToggleTheme();
          }}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? "\u2600" : "\u263E"}
        </button>
        <span className="collapsed-bar__chevron">
          {expanded ? "\u25B2" : "\u25BC"}
        </span>
        <button
          className="collapsed-bar__exit"
          onClick={handleExit}
          title="Quit"
        >
          {"\u2715"}
        </button>
      </div>
    </div>
  );
}
