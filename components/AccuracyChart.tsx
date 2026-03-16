'use client';

type DayData = { label: string; total: number; correct: number };

export function AccuracyChart({ data }: { data: DayData[] }) {
  const maxTotal = Math.max(...data.map(d => d.total), 1);

  return (
    <div className="achart">
      <div className="achart-bars">
        {data.map((d, i) => {
          const heightPct = (d.total / maxTotal) * 100;
          const accuracy  = d.total > 0 ? Math.round((d.correct / d.total) * 100) : null;
          const hue       = accuracy !== null ? Math.round((accuracy / 100) * 120) : 0;
          return (
            <div key={i} className="achart-col">
              <div className="achart-bar-wrap">
                {d.total > 0 && (
                  <div
                    className="achart-bar"
                    style={{
                      height: `${heightPct}%`,
                      background: `hsl(${hue},65%,50%)`,
                      boxShadow: `0 0 8px hsl(${hue},65%,40%)`,
                    }}
                    title={`${d.label}: ${d.correct}/${d.total} correct${accuracy !== null ? ` (${accuracy}%)` : ''}`}
                  >
                    {accuracy !== null && d.total >= 2 && (
                      <span className="achart-bar-label">{accuracy}%</span>
                    )}
                  </div>
                )}
              </div>
              <span className="achart-day-label">{d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
