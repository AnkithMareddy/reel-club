type BarChartRow = { label: string; value: number; sublabel?: string };

/** Minimal horizontal bar chart — no charting library, just flexbox. */
export function BarChart({
  rows,
  valueFormatter = (v) => v.toFixed(1),
  max,
}: {
  rows: BarChartRow[];
  valueFormatter?: (value: number) => string;
  /** Defaults to the largest value in `rows`. */
  max?: number;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Not enough data yet.</p>;
  }
  const maxValue = max ?? Math.max(...rows.map((r) => r.value), 1);

  return (
    <div className="space-y-2.5">
      {rows.map((row) => (
        <div key={row.label} className="space-y-1">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="font-medium">{row.label}</span>
            <span className="shrink-0 text-muted-foreground">
              {valueFormatter(row.value)}
              {row.sublabel ? ` · ${row.sublabel}` : ""}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.max(4, (row.value / maxValue) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
