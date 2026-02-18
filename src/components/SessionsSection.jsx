import SessionCard from "./SessionCard";
import "./SessionsSection.css";

export default function SessionsSection({ sessions }) {
  return (
    <div className="sessions-section">
      <div className="section-header">ACTIVE SESSIONS</div>
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
