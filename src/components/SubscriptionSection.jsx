import ProgressBar from "./ProgressBar";
import "./SubscriptionSection.css";

function formatResetTime(resetsAt) {
  if (!resetsAt) return null;
  const reset = new Date(resetsAt);
  const now = new Date();
  const diffMs = reset - now;

  if (diffMs <= 0) return "Resetting...";

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `Resets in ${days}d ${remainingHours}h`;
  }
  return `Resets in ${hours}h ${minutes}m`;
}

function formatBillingDate(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return `Resets ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

function UsageWindowRow({ window: win, isBillingDate }) {
  const resetText = isBillingDate
    ? formatBillingDate(win.resets_at)
    : formatResetTime(win.resets_at);

  const sublabel = resetText
    ? `${Math.round(win.utilization)}% · ${resetText}`
    : `${Math.round(win.utilization)}%`;

  return (
    <div className="usage-window">
      <ProgressBar percent={win.utilization} label={win.name} sublabel={sublabel} />
    </div>
  );
}

function ProviderCard({ snapshot, planName, accent, isBillingDate, error }) {
  const providerLabel =
    snapshot?.provider === "claude" ? "Claude" : "Cursor";

  return (
    <div className="provider-card" style={{ "--provider-accent": accent }}>
      <div className="provider-card__header">
        <div className="provider-card__title">
          <span className="provider-card__name">{providerLabel}</span>
          <span className="provider-card__plan">{planName}</span>
        </div>
        {error && <span className="provider-card__error">{error}</span>}
      </div>

      {error && !snapshot ? (
        <div className="provider-card__error-body">
          <p>{error}</p>
        </div>
      ) : snapshot ? (
        <div className="provider-card__windows">
          <UsageWindowRow
            window={snapshot.primary}
            isBillingDate={isBillingDate}
          />
          {snapshot.secondary && (
            <UsageWindowRow
              window={snapshot.secondary}
              isBillingDate={isBillingDate}
            />
          )}
          {snapshot.extra_windows?.map((win, i) => (
            <UsageWindowRow key={i} window={win} isBillingDate={isBillingDate} />
          ))}
        </div>
      ) : (
        <div className="provider-card__loading">Loading...</div>
      )}
    </div>
  );
}

export default function SubscriptionSection({
  claudeSnapshot,
  cursorSnapshot,
  claudeError,
  cursorError,
  config,
}) {
  return (
    <div className="subscription-section">
      <div className="section-header">SUBSCRIPTION USAGE</div>
      <ProviderCard
        snapshot={claudeSnapshot}
        planName={config?.providers?.claude?.plan_name ?? "Max ($100/mo)"}
        accent="var(--accent-claude)"
        isBillingDate={false}
        error={claudeError}
      />
      <ProviderCard
        snapshot={cursorSnapshot}
        planName={config?.providers?.cursor?.plan_name ?? "Pro ($20/mo)"}
        accent="var(--accent-cursor)"
        isBillingDate={true}
        error={cursorError}
      />
    </div>
  );
}
