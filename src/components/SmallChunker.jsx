import { T } from '../tokens.js';

export function SmallChunker({ onBack }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      minHeight: 0, position: 'relative',
    }}>
      <div style={{ padding: '8px 16px 0' }}>
        <button
          onClick={onBack}
          aria-label="Back"
          style={{
            all: 'unset', cursor: 'pointer', boxSizing: 'border-box',
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '8px 12px 8px 8px', borderRadius: 99,
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${T.hairline}`,
            color: T.text2,
            fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em',
            textTransform: 'uppercase',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <svg width="11" height="11" viewBox="0 0 11 11">
            <path d="M7.5 1.5L3.5 5.5L7.5 9.5" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </button>
      </div>

      <div style={{
        flex: 1, minHeight: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '20px',
        gap: 14,
      }}>
        <div style={{
          fontFamily: T.mono, fontSize: 10, letterSpacing: '0.22em',
          textTransform: 'uppercase', color: T.amber,
          textShadow: `0 0 8px rgba(255,192,72,0.5)`,
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: 99, background: T.amber,
            boxShadow: `0 0 8px ${T.amber}`,
          }} />
          MD-02 · Granular
        </div>
        <h1 style={{
          fontFamily: T.display, fontWeight: 600, fontSize: 36,
          letterSpacing: '-0.02em', color: T.text, margin: 0,
          textAlign: 'center',
        }}>
          Small Chunker
        </h1>
        <p style={{
          fontFamily: T.display, fontSize: 13, color: T.text3,
          margin: 0, letterSpacing: '-0.005em', textAlign: 'center',
          maxWidth: 280,
        }}>
          Coming soon.
        </p>
      </div>
    </div>
  );
}
