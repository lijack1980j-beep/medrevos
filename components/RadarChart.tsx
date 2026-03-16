'use client';

type Axis = { label: string; value: number }; // value 0–100

export function RadarChart({ axes }: { axes: Axis[] }) {
  if (axes.length < 3) return null;

  const size   = 260;
  const cx     = size / 2;
  const cy     = size / 2;
  const radius = 100;
  const levels = 4;
  const n      = axes.length;

  function polarToCart(angle: number, r: number) {
    const rad = (angle - 90) * (Math.PI / 180);
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  const angleStep = 360 / n;

  // Polygon for a given fraction (0–1)
  function polygon(frac: number) {
    return axes
      .map((_, i) => {
        const pt = polarToCart(i * angleStep, radius * frac);
        return `${pt.x},${pt.y}`;
      })
      .join(' ');
  }

  // Data polygon
  const dataPolygon = axes
    .map((a, i) => {
      const pt = polarToCart(i * angleStep, radius * (a.value / 100));
      return `${pt.x},${pt.y}`;
    })
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className="radar-svg"
    >
      {/* Grid rings */}
      {Array.from({ length: levels }, (_, l) => (
        <polygon
          key={l}
          points={polygon((l + 1) / levels)}
          fill="none"
          className="radar-grid"
        />
      ))}

      {/* Axis lines */}
      {axes.map((_, i) => {
        const outer = polarToCart(i * angleStep, radius);
        return (
          <line
            key={i}
            x1={cx} y1={cy}
            x2={outer.x} y2={outer.y}
            className="radar-axis"
          />
        );
      })}

      {/* Data fill */}
      <polygon
        points={dataPolygon}
        className="radar-data-fill"
      />
      {/* Data stroke */}
      <polygon
        points={dataPolygon}
        fill="none"
        className="radar-data-stroke"
      />

      {/* Dots on data points */}
      {axes.map((a, i) => {
        const pt = polarToCart(i * angleStep, radius * (a.value / 100));
        return (
          <circle key={i} cx={pt.x} cy={pt.y} r={4} className="radar-dot">
            <title>{a.label}: {a.value}%</title>
          </circle>
        );
      })}

      {/* Labels */}
      {axes.map((a, i) => {
        const labelR = radius + 22;
        const pt     = polarToCart(i * angleStep, labelR);
        const anchor = pt.x < cx - 4 ? 'end' : pt.x > cx + 4 ? 'start' : 'middle';
        return (
          <text
            key={i}
            x={pt.x}
            y={pt.y}
            textAnchor={anchor}
            dominantBaseline="middle"
            className="radar-label"
          >
            {a.label.length > 14 ? a.label.slice(0, 13) + '…' : a.label}
          </text>
        );
      })}
    </svg>
  );
}
