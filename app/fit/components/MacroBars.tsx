"use client";

export interface MacroBarsProps {
  protein: [number, number];
  carbs: [number, number];
  fat: [number, number];
}

const ROWS: { key: keyof MacroBarsProps; name: string; color: string }[] = [
  { key: "protein", name: "Protein", color: "var(--protein)" },
  { key: "carbs", name: "Carbs", color: "var(--carbs)" },
  { key: "fat", name: "Fat", color: "var(--fat)" },
];

export default function MacroBars(props: MacroBarsProps) {
  return (
    <div className="ff-grid" style={{ gap: 12 }}>
      {ROWS.map((r) => {
        const [val, target] = props[r.key];
        const pct = target > 0 ? Math.min(100, (val / target) * 100) : 0;
        return (
          <div className="ff-macro" key={r.key}>
            <div className="top">
              <span className="name">{r.name}</span>
              <span className="val">
                {Math.round(val)} / {target} g
              </span>
            </div>
            <div className="ff-bar">
              <span style={{ width: `${pct}%`, background: r.color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
