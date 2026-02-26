import ProgressBar from "./ProgressBar";
import "./SessionCard.css";

function formatTokenCount(count) {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`;
  return `${count}`;
}

function formatModel(model) {
  if (!model) return "";
  // "claude-opus-4-6" → "opus-4-6" (strip claude- prefix to save space)
  return model.replace(/^claude-/, "");
}

const STATUS_CONFIG = {
  active: { label: "Working", className: "session-card--active" },
  review: { label: "Review", className: "session-card--review" },
  idle: { label: "Idle", className: "session-card--idle" },
};

export default function SessionCard({ session }) {
  const contextPercent =
    session.context_limit > 0
      ? Math.min(100, (session.last_context_tokens / session.context_limit) * 100)
      : 0;

  const title = session.conversation_title || session.display_name;
  const statusInfo = STATUS_CONFIG[session.status] || STATUS_CONFIG.idle;

  return (
    <div className={`session-card ${statusInfo.className}`}>
      <div className="session-card__header">
        <div className="session-card__titles">
          <span className="session-card__name" title={title}>{title}</span>
        </div>
        <span className={`session-card__status-badge ${statusInfo.className}`}>
          <span className="session-card__dot" />
          {statusInfo.label}
        </span>
        <span className="session-card__model">{formatModel(session.last_model)}</span>
      </div>

      <ProgressBar
        percent={contextPercent}
        label="Context"
        sublabel={`${formatTokenCount(session.last_context_tokens)}/${formatTokenCount(session.context_limit)} \u00B7 ${formatTokenCount(session.input_tokens)} in \u00B7 ${formatTokenCount(session.output_tokens)} out \u00B7 ${formatTokenCount(session.cache_read_tokens)} cache`}
      />
    </div>
  );
}
