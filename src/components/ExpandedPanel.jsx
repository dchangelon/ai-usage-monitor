import SubscriptionSection from "./SubscriptionSection";
import SessionsSection from "./SessionsSection";
import "./ExpandedPanel.css";

export default function ExpandedPanel({
  claudeSnapshot,
  cursorSnapshot,
  claudeError,
  cursorError,
  sessions,
  config,
}) {
  return (
    <div className="expanded-panel">
      <SubscriptionSection
        claudeSnapshot={claudeSnapshot}
        cursorSnapshot={cursorSnapshot}
        claudeError={claudeError}
        cursorError={cursorError}
        config={config}
      />
      <SessionsSection sessions={sessions} />
    </div>
  );
}
