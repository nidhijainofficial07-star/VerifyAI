// Small dependency-free SVG chart — deterministic SSR-safe demo data.
const TREND = [
  { month: "May", compliant: 62 },
  { month: "Jun", compliant: 68 },
  { month: "Jul", compliant: 64 },
  { month: "Aug", compliant: 76 },
  { month: "Sep", compliant: 83 },
  { month: "Oct", compliant: 91 },
];

export function TrendChart() {
  const width = 560;
  const height = 200;
  const padX = 28;
  const padTop = 18;
  const padBottom = 28;
  const innerW = width - padX * 2;
  const innerH = height - padTop - padBottom;
  const max = 100;
  const barW = 34;
  const step = innerW / TREND.length;

  return (
    <figure className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-48 w-full" role="img" aria-label="Compliance rate trend over the last six months">
        {[0, 50, 100].map((tick) => {
          const y = padTop + innerH - (tick / max) * innerH;
          return (
            <g key={tick}>
              <line x1={padX} x2={width - padX} y1={y} y2={y} stroke="var(--color-border)" strokeDasharray={tick === 0 ? "0" : "3 4"} />
              <text x={padX - 8} y={y + 4} textAnchor="end" className="fill-muted-foreground" fontSize="10">
                {tick}%
              </text>
            </g>
          );
        })}
        {TREND.map((d, i) => {
          const h = (d.compliant / max) * innerH;
          const x = padX + step * i + (step - barW) / 2;
          const y = padTop + innerH - h;
          return (
            <g key={d.month}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={6}
                fill={i === TREND.length - 1 ? "var(--color-primary)" : "var(--color-secondary)"}
              />
              <text x={x + barW / 2} y={y - 6} textAnchor="middle" className="fill-foreground" fontSize="10" fontWeight="600">
                {d.compliant}%
              </text>
              <text x={x + barW / 2} y={height - 8} textAnchor="middle" className="fill-muted-foreground" fontSize="10">
                {d.month}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-1 text-center text-xs text-muted-foreground">
        Share of analysed content with zero compliance issues (demo data, last 6 months)
      </figcaption>
    </figure>
  );
}
