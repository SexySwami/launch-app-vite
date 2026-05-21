import { T } from '../tokens.js';
import { Eyebrow } from './Eyebrow.jsx';

export function StandUp({ onDone }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(circle at 50% 50%, rgba(255,192,72,0.14), transparent 60%)`,
        animation: 'breathe 2.4s ease-in-out infinite',
        pointerEvents: 'none',
      }} />

      <Eyebrow color={T.amber} style={{ position: 'absolute', top: 100 }}>
        On Break
      </Eyebrow>

      <div style={{
        fontFamily: T.display, fontSize: 88, fontWeight: 700,
        letterSpacing: '-0.03em', color: T.text, lineHeight: 1,
        textShadow: `0 0 40px ${T.amber}, 0 0 90px rgba(255,192,72,0.45)`,
        animation: 'standUpPulse 2.4s ease-in-out infinite',
        position: 'relative', zIndex: 2,
        textAlign: 'center',
      }}>
        STAND UP
      </div>

      <button
        onClick={onDone}
        style={{
          all: 'unset',
          marginTop: 52,
          cursor: 'pointer',
          padding: '14px 52px',
          borderRadius: 99,
          background: 'rgba(255,192,72,0.12)',
          border: '1px solid rgba(255,192,72,0.50)',
          fontFamily: T.display,
          fontSize: 14, fontWeight: 600,
          letterSpacing: '0.10em',
          color: T.amber,
          textTransform: 'uppercase',
          boxShadow: '0 0 20px rgba(255,192,72,0.18)',
          position: 'relative', zIndex: 2,
          transition: 'all 200ms ease',
        }}
        onPointerEnter={e => {
          e.currentTarget.style.background = 'rgba(255,192,72,0.22)';
          e.currentTarget.style.boxShadow = '0 0 32px rgba(255,192,72,0.38)';
        }}
        onPointerLeave={e => {
          e.currentTarget.style.background = 'rgba(255,192,72,0.12)';
          e.currentTarget.style.boxShadow = '0 0 20px rgba(255,192,72,0.18)';
        }}
      >
        Done
      </button>
    </div>
  );
}
