'use client';

export function StatCard({ title, value, helper, trend, gradient = 'blue' }: { title: string; value: string | number; helper: string; trend?: 'up' | 'down' | 'neutral'; gradient?: 'blue' | 'purple' | 'green' | 'orange' }) {
  const trendColor = trend === 'up' ? '#34d399' : trend === 'down' ? '#f87171' : 'var(--muted)';
  const trendArrow = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';

  const gradients = {
    blue: 'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(139,92,246,0.08) 50%, rgba(34,211,238,0.05) 100%)',
    purple: 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(236,72,153,0.08) 50%, rgba(251,146,60,0.05) 100%)',
    green: 'linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(34,211,238,0.08) 50%, rgba(59,130,246,0.05) 100%)',
    orange: 'linear-gradient(135deg, rgba(251,146,60,0.12) 0%, rgba(236,72,153,0.08) 50%, rgba(139,92,246,0.05) 100%)',
  };

  const glowColors = {
    blue: 'rgba(59,130,246,0.4)',
    purple: 'rgba(139,92,246,0.4)',
    green: 'rgba(34,197,94,0.4)',
    orange: 'rgba(251,146,60,0.4)',
  };

  const borderColors = {
    blue: 'rgba(59,130,246,0.3)',
    purple: 'rgba(139,92,246,0.3)',
    green: 'rgba(34,197,94,0.3)',
    orange: 'rgba(251,146,60,0.3)',
  };

  return (
    <div
      className="metric"
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: gradients[gradient],
        borderColor: borderColors[gradient],
      }}
    >
      {/* Animated glow orb */}
      <div style={{
        position: 'absolute',
        top: '-30%',
        right: '-10%',
        width: '120px',
        height: '120px',
        background: glowColors[gradient],
        filter: 'blur(50px)',
        borderRadius: '50%',
        opacity: 0.6,
        animation: 'pulseOrb 4s ease-in-out infinite',
      }} />

      {/* Secondary glow */}
      <div style={{
        position: 'absolute',
        bottom: '-20%',
        left: '-10%',
        width: '80px',
        height: '80px',
        background: glowColors[gradient],
        filter: 'blur(40px)',
        borderRadius: '50%',
        opacity: 0.3,
        animation: 'pulseOrb 4s ease-in-out infinite 2s',
      }} />

      <style jsx>{`
        @keyframes pulseOrb {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.2); opacity: 0.4; }
        }
        @keyframes glow {
          0%, 100% { filter: drop-shadow(0 0 4px #34d399); }
          50% { filter: drop-shadow(0 0 12px #34d399) brightness(1.4); }
        }
      `}</style>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{
            fontSize: 12,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.6))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            {title}
          </span>
          {trend && (
            <span style={{
              color: trendColor,
              fontSize: 14,
              fontWeight: 700,
              textShadow: `0 0 15px ${trendColor}`,
              animation: trend === 'up' ? 'glow 2s ease-in-out infinite' : 'none',
            }}>
              {trendArrow}
            </span>
          )}
        </div>

        <div style={{
          fontSize: 48,
          fontWeight: 700,
          letterSpacing: '-0.03em',
          marginBottom: 12,
          lineHeight: 1,
          background: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0.7) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          textShadow: '0 0 30px rgba(255,255,255,0.1)',
        }}>
          {value}
        </div>

        <div className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>{helper}</div>
      </div>
    </div>
  );
}
