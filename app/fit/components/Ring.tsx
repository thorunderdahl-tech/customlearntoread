"use client";

export default function Ring({
  value,
  max,
  label,
  unit,
  color = "var(--accent)",
  size = 132,
}: {
  value: number;
  max: number;
  label: string;
  unit?: string;
  color?: string;
  size?: number;
}) {
  const stroke = 11;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const offset = c * (1 - pct);
  return (
    <div className="ff-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--card-2)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />
      </svg>
      <div className="center">
        <div>
          <div className="big">{Math.round(value)}</div>
          <div className="lbl">
            {label}
            {unit ? ` ${unit}` : ""}
          </div>
        </div>
      </div>
    </div>
  );
}
