interface CostBreakdownProps {
  breakdown: Record<string, number>;
  algorithm?: string;
  expanded?: number;
  totalCost?: number;
}

const LABELS: Record<string, string> = {
  distance: "Distance (α)",
  threat: "Threat (β)",
  terrain: "Terrain (γ)",
  civilian: "Civilian (δ)",
};

const COLORS: Record<string, string> = {
  distance: "#6eb5ff",
  threat: "#c45c4a",
  terrain: "#d4a24c",
  civilian: "#9b7ed8",
};

export default function CostBreakdown({
  breakdown,
  algorithm,
  expanded,
  totalCost,
}: CostBreakdownProps) {
  const keys = ["distance", "threat", "terrain", "civilian"] as const;
  const max = Math.max(...keys.map((k) => breakdown[k] ?? 0), 1);

  return (
    <section className="panel p-4 space-y-3">
      {algorithm ? (
        <p className="flex justify-between items-center text-sm m-0">
          <span className="text-battlefield-muted">Algorithm</span>
          <span className="font-mono text-battlefield-accent">{algorithm}</span>
        </p>
      ) : null}
      {totalCost !== undefined ? (
        <p className="flex justify-between items-center m-0">
          <span className="text-battlefield-muted text-sm">Route cost</span>
          <span className="font-mono text-lg text-battlefield-accent">
            {totalCost.toFixed(2)}
          </span>
        </p>
      ) : null}
      {expanded !== undefined && expanded > 0 ? (
        <p className="flex justify-between text-xs text-battlefield-muted m-0">
          <span>Nodes expanded</span>
          <span className="font-mono">{expanded}</span>
        </p>
      ) : null}
      <ul className="space-y-2 pt-1 list-none m-0 p-0">
        {keys.map((key) => {
          const val = breakdown[key] ?? 0;
          const pct = (val / max) * 100;
          return (
            <li key={key}>
              <p className="flex justify-between text-xs mb-1 m-0">
                <span className="text-battlefield-muted">{LABELS[key]}</span>
                <span className="font-mono" style={{ color: COLORS[key] }}>
                  {val.toFixed(2)}
                </span>
              </p>
              <div className="h-1.5 rounded-full bg-battlefield-border overflow-hidden">
                <span
                  className="block h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: COLORS[key] }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}


