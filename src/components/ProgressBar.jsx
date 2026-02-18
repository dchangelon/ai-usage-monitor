import "./ProgressBar.css";

function getBarColor(percent) {
  if (percent >= 80) return "var(--color-red)";
  if (percent >= 50) return "var(--color-yellow)";
  return "var(--color-green)";
}

export default function ProgressBar({ percent, label, sublabel, size = "md" }) {
  const clampedPercent = Math.min(100, Math.max(0, percent));
  const color = getBarColor(clampedPercent);

  return (
    <div className={`progress-bar progress-bar--${size}`}>
      {(label || sublabel) && (
        <div className="progress-bar__header">
          {label && <span className="progress-bar__label">{label}</span>}
          {sublabel && (
            <span className="progress-bar__sublabel">{sublabel}</span>
          )}
        </div>
      )}
      <div className="progress-bar__track">
        <div
          className="progress-bar__fill"
          style={{
            width: `${clampedPercent}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}
