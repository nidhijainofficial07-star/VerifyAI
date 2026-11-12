
interface TrendChartProps {
  submissions: Submission[];
}

export function TrendChart({ submissions }: TrendChartProps) {
  const width = 560;
  const height = 200;
  const padX = 28;
  const padTop = 18;
  const padBottom = 28;
  const innerW = width - padX * 2;
  const innerH = height - padTop - padBottom;
  const max = 100;
  const barW = 34;

  // Generate the current month and previous five months
  const trend = Array.from({ length: 6 }, (_, i) => {
    const date = new Date(
      new Date().getFullYear(),
      new Date().getMonth() - 5 + i,
      1
    );

    const monthSubmissions = submissions.filter((s) => {
      const created = new Date(s.createdAt);

      return (
        !Number.isNaN(created.getTime()) &&
        created.getFullYear() === date.getFullYear() &&
        created.getMonth() === date.getMonth()
      );
    });

    const compliantCount = monthSubmissions.filter(
      (s) => s.analysis.issues.length === 0
    ).length;

    return {
      month: date.toLocaleDateString("en-IN", { month: "short" }),
      compliant:
        monthSubmissions.length === 0
          ? 0
          : Math.round(
              (compliantCount / monthSubmissions.length) * 100
            ),
      total: monthSubmissions.length,
    };
  });

  const step = innerW / trend.length;

  return (
    <figure className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-48 w-full"
        role="img"
        aria-label="Actual content compliance rate over the last six months"
      >
        {[0, 50, 100].map((tick) => {
          const y = padTop + innerH - (tick / max) * innerH;

          return (
            <g key={tick}>
              <line
                x1={padX}
                x2={width - padX}
                y1={y}
                y2={y}
                stroke="var(--color-border)"
                strokeDasharray={tick === 0 ? "0" : "3 4"}
              />
              <text
                x={padX - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-muted-foreground"
                fontSize="10"
              >
                {tick}%
              </text>
            </g>
          );
        })}

        {trend.map((d, i) => {
          const h = (d.compliant / max) * innerH;
          const x = padX + step * i + (step - barW) / 2;
          const y = padTop + innerH - h;

          return (
            <g key={`${d.month}-${i}`}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={6}
                fill={
                  i === trend.length - 1
                    ? "var(--color-primary)"
                    : "var(--color-secondary)"
                }
              >
                <title>
                  {d.total === 0
                    ? "No submissions"
                    : `${d.compliant}% compliant (${d.total} submissions)`}
                </title>
              </rect>

              <text
                x={x + barW / 2}
                y={y - 6}
                textAnchor="middle"
                className="fill-foreground"
                fontSize="10"
                fontWeight="600"
              >
                {d.total === 0 ? "—" : `${d.compliant}%`}
              </text>

              <text
                x={x + barW / 2}
                y={height - 8}
                textAnchor="middle"
                className="fill-muted-foreground"
                fontSize="10"
              >
                {d.month}
              </text>
            </g>
          );
        })}
      </svg>

      <figcaption className="mt-1 text-center text-xs text-muted-foreground">
        Actual compliance rate based on your analysed content over the last six months
      </figcaption>
    </figure>
  );
}
