import ProgressBar from "./ProgressBar";
import "./SessionCard.css";

function formatTokenCount(count) {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`;
  return `${count}`;
}

function formatModel(model) {
  if (!model) return "";
  // "claude-opus-4-6" → "claude-opus-4-6" (keep as-is, it's already short)
  return model;
}

export default function SessionCard({ session }) {
  const contextPercent =
    session.context_limit > 0
      ? Math.min(100, (session.last_context_tokens / session.context_limit) * 100)
      : 0;

  const title = session.conversation_title || session.display_name;

  return (
    <div className="session-card">
      <div className="session-card__header">
        <div className="session-card__titles">
          <span className="session-card__name" title={title}>{title}</span>
        </div>
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
