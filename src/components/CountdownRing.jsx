import { T } from '../tokens.js';

// Concentric ring with a single progress arc + tick marks + center label.
// When `done`, shows a checkmark instead of the time.
export function CountdownRing({ time, fraction = 1, accent = T.cyan, done = false }) {
  const size = 236, r = 104, C = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, fraction));
  const off = C * (1 - clamped);
  const rgba = (a) => hexToRgba(accent, a);

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <div style={{
        position: 'absolute', inset: -30, borderRadius: '50%',
        background: `radial-gradient(circle, ${rgba(done ? 0.26 : 0.20)}, transparent 65%)`,
        animation: 'breathe 3.4s ease-in-out infinite', pointerEvents: 'none',
      }} />
      {[0, 1].map(i => (
        <div key={i} style={{
          position: 'absolute', inset: -8 - i * 14, borderRadius: '50%',
          border: `1px solid ${rgba(0.10 - i * 0.04)}`,
        }} />
      ))}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={T.hairlineSoft} strokeWidth="8" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={accent} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={done ? 0 : off}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{
            filter: `drop-shadow(0 0 10px ${accent})`,
            transition: 'stroke-dashoffset 800ms linear',
          }} />
        {Array.from({ length: 60 }).map((_, i) => {
          const a = (i / 60) * Math.PI * 2;
          const ri = r - 22, ro = r - (i % 5 === 0 ? 30 : 26);
          return (
            <line key={i}
              x1={size / 2 + Math.cos(a) * ri} y1={size / 2 + Math.sin(a) * ri}
              x2={size / 2 + Math.cos(a) * ro} y2={size / 2 + Math.sin(a) * ro}
              stroke={rgba(i % 5 === 0 ? 0.4 : 0.16)}
              strokeWidth={i % 5 === 0 ? 1.4 : 0.8} />
          );
        })}
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        {done ? (
          <svg width="64" height="64" viewBox="0 0 64 64"
            style={{ filter: `drop-shadow(0 0 16px ${accent})` }}>
            <path d="M16 33l11 11 22-25" stroke={accent} strokeWidth="5" fill="none"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <>
            <div style={{
              fontFamily: T.display, fontSize: 50, fontWeight: 600,
              letterSpacing: '-0.02em', color: T.text, lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
              textShadow: `0 0 30px ${rgba(0.7)}, 0 0 70px ${rgba(0.35)}`,
            }}>{time}</div>
            <div style={{
              fontFamily: T.mono, fontSize: 9.5, letterSpacing: '0.28em',
              color: T.text3, textTransform: 'uppercase', marginTop: 12,
            }}>Remaining</div>
          </>
        )}
      </div>
    </div>
  );
}

function hexToRgba(hex, a) {
  const m = hex.replace('#', '');
  return `rgba(${parseInt(m.slice(0, 2), 16)},${parseInt(m.slice(2, 4), 16)},${parseInt(m.slice(4, 6), 16)},${a})`;
}
