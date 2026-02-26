import SessionCard from "./SessionCard";
import "./SessionsSection.css";

export default function SessionsSection({ sessions }) {
  const activeCount = sessions?.filter((s) => s.status === "active").length ?? 0;

  return (
    <div className="sessions-section">
      <div className="section-header">
        ACTIVE SESSIONS
        {activeCount > 0 && (
          <span className="sessions-section__active-count">
            {activeCount} working
          </span>
        )}
      </div>
      {!sessions || sessions.length === 0 ? (
        <div className="sessions-section__empty">No active sessions</div>
      ) : (
        <div className="sessions-section__list">
          {sessions.map((session) => (
            <SessionCard key={session.session_id} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}
