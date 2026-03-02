import "./ProgressBar.css";

function getColors(percent) {
  if (percent >= 80) {
    return {
      color: "var(--color-red)",
      gradient: "linear-gradient(90deg, var(--color-yellow), var(--color-red))",
    };
  }
  if (percent >= 50) {
    return {
      color: "var(--color-yellow)",
      gradient: "linear-gradient(90deg, var(--color-green), var(--color-yellow))",
    };
  }
  return {
    color: "var(--color-green)",
    gradient: "linear-gradient(90deg, var(--color-green), var(--accent-claude))",
  };
}

export default function ProgressBar({ percent, label, sublabel, size = "md", accentColor }) {
  const clampedPercent = Math.min(100, Math.max(0, percent ?? 0));
  const { color, gradient } = accentColor
    ? { color: accentColor, gradient: accentColor }
    : getColors(clampedPercent);
  const isHigh = clampedPercent >= 80;

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
          className={`progress-bar__fill${isHigh ? " progress-bar__fill--glow" : ""}`}
          style={{
            width: `${clampedPercent}%`,
            "--fill-color": color,
            "--fill-gradient": gradient,
          }}
        />
      </div>
    </div>
  );
}
