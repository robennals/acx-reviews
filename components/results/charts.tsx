// Presentational, server-renderable chart pieces for the results report.
// No chart library: CSS-width bars plus an inline-SVG smoothing curve.

export interface DistPoint {
  label: number; // x-axis integer (vote count or score)
  value: number; // bar height (count)
  smooth: number; // smoothing-curve value
}

export function DistributionChart({
  points,
  xLabel,
  yLabel,
}: {
  points: DistPoint[];
  xLabel: string;
  yLabel: string;
}) {
  const maxVal = Math.max(1, ...points.map((p) => Math.max(p.value, p.smooth)));
  const W = 640;
  const H = 200;
  const n = points.length;
  const step = n > 1 ? W / (n - 1) : W;
  const curve = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${H - (p.smooth / maxVal) * H}`)
    .join(' ');

  return (
    <div className="my-4">
      <div className="text-xs text-muted-foreground mb-1">{yLabel}</div>
      <div className="relative" style={{ height: H }}>
        {/* bars */}
        <div className="absolute inset-0 flex items-end gap-[2px]">
          {points.map((p) => (
            <div
              key={p.label}
              className="flex-1 bg-foreground/20"
              style={{ height: `${(p.value / maxVal) * 100}%` }}
              title={`${p.label}: ${p.value}`}
            />
          ))}
        </div>
        {/* smoothing curve */}
        <svg
          className="absolute inset-0 w-full h-full overflow-visible"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          aria-hidden
        >
          <path d={curve} fill="none" stroke="currentColor" strokeWidth={2} className="text-primary" />
        </svg>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>{points[0]?.label}</span>
        <span>{xLabel}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </div>
  );
}

export function RankBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="h-2 bg-muted rounded">
      <div className="h-2 bg-primary rounded" style={{ width: `${pct}%` }} />
    </div>
  );
}
