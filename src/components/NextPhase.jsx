import { T } from '../tokens.js';
import { Telemetry } from './Telemetry.jsx';

export function NextPhase({ onKeepGoing, onSeeCompleted }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', minHeight: 0 }}>
      <Telemetry time="PHASE COMPLETE" code="MC-04 / DECISION" state="STANDBY" />

      {/* ambient glow */}
      <div style={{
        position: 'absolute', top: '18%', left: '50%', transform: 'translateX(-50%)',
        width: 440, height: 380, pointerEvents: 'none',
        background: `radial-gradient(ellipse, rgba(0,229,255,0.14), rgba(79,227,193,0.07) 45%, transparent 72%)`,
        animation: 'breathe 3.6s ease-in-out infinite',
      }} />

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '32px 22px',
        position: 'relative', zIndex: 1, gap: 20, minHeight: 0,
      }}>

        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 14,
            fontFamily: T.mono, fontSize: 10.5, letterSpacing: '0.22em',
            color: T.teal, textTransform: 'uppercase',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: 99,
              background: T.teal, boxShadow: `0 0 10px ${T.teal}`,
            }} />
            Phase Complete
          </div>
          <h1 style={{
            fontFamily: T.display, fontWeight: 700, fontSize: 44, lineHeight: 1.05,
            letterSpacing: '-0.03em', color: T.text, margin: 0,
            textShadow: `0 0 40px rgba(0,229,255,0.30)`,
          }}>
            What's next?
          </h1>
        </div>

        {/* Two cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* More Steps */}
          <button
            onClick={onKeepGoing}
            style={{
              all: 'unset', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 20,
              padding: '26px 24px',
              background: `linear-gradient(135deg, rgba(0,229,255,0.13) 0%, rgba(0,229,255,0.04) 55%, rgba(61,127,255,0.08) 100%)`,
              border: `1px solid rgba(0,229,255,0.46)`,
              borderRadius: 26,
              boxShadow: `
                0 0 0 1px rgba(255,255,255,0.06) inset,
                0 16px 48px rgba(0,229,255,0.16),
                0 4px 20px rgba(0,0,0,0.45)
              `,
              position: 'relative', overflow: 'hidden',
              transition: 'transform 180ms ease, box-shadow 180ms ease',
              WebkitTapHighlightColor: 'transparent',
            }}
            onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.978)'; e.currentTarget.style.boxShadow = `0 0 0 1px rgba(255,255,255,0.06) inset, 0 8px 28px rgba(0,229,255,0.12), 0 2px 10px rgba(0,0,0,0.45)`; }}
            onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = `0 0 0 1px rgba(255,255,255,0.06) inset, 0 16px 48px rgba(0,229,255,0.16), 0 4px 20px rgba(0,0,0,0.45)`; }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.978)'; e.currentTarget.style.boxShadow = `0 0 0 1px rgba(255,255,255,0.06) inset, 0 8px 28px rgba(0,229,255,0.12), 0 2px 10px rgba(0,0,0,0.45)`; }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = `0 0 0 1px rgba(255,255,255,0.06) inset, 0 16px 48px rgba(0,229,255,0.16), 0 4px 20px rgba(0,0,0,0.45)`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = `0 0 0 1px rgba(255,255,255,0.06) inset, 0 16px 48px rgba(0,229,255,0.16), 0 4px 20px rgba(0,0,0,0.45)`; }}
          >
            {/* corner glow */}
            <div style={{
              position: 'absolute', top: -40, right: -40, width: 160, height: 160, pointerEvents: 'none',
              background: `radial-gradient(circle, rgba(0,229,255,0.22), transparent 68%)`,
            }} />

            {/* icon */}
            <div style={{
              width: 56, height: 56, borderRadius: 18, flexShrink: 0,
              background: `rgba(0,229,255,0.12)`,
              border: `1px solid rgba(0,229,255,0.52)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 24px rgba(0,229,255,0.40)`,
              color: T.cyan,
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24">
                <path d="M13 5l7 7-7 7M5 12h15" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: T.display, fontSize: 24, fontWeight: 700,
                color: T.text, letterSpacing: '-0.02em', lineHeight: 1.1,
                marginBottom: 5,
              }}>
                More Steps
              </div>
              <div style={{
                fontFamily: T.mono, fontSize: 10, letterSpacing: '0.17em',
                color: T.cyan, textTransform: 'uppercase', opacity: 0.85,
              }}>
                Keep the momentum going
              </div>
            </div>
          </button>

          {/* Finished */}
          <button
            onClick={onSeeCompleted}
            style={{
              all: 'unset', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 20,
              padding: '26px 24px',
              background: `linear-gradient(135deg, rgba(79,227,193,0.11) 0%, rgba(79,227,193,0.03) 55%, rgba(79,227,193,0.07) 100%)`,
              border: `1px solid rgba(79,227,193,0.40)`,
              borderRadius: 26,
              boxShadow: `
                0 0 0 1px rgba(255,255,255,0.05) inset,
                0 16px 48px rgba(79,227,193,0.12),
                0 4px 20px rgba(0,0,0,0.45)
              `,
              position: 'relative', overflow: 'hidden',
              transition: 'transform 180ms ease, box-shadow 180ms ease',
              WebkitTapHighlightColor: 'transparent',
            }}
            onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.978)'; e.currentTarget.style.boxShadow = `0 0 0 1px rgba(255,255,255,0.05) inset, 0 8px 28px rgba(79,227,193,0.08), 0 2px 10px rgba(0,0,0,0.45)`; }}
            onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = `0 0 0 1px rgba(255,255,255,0.05) inset, 0 16px 48px rgba(79,227,193,0.12), 0 4px 20px rgba(0,0,0,0.45)`; }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.978)'; e.currentTarget.style.boxShadow = `0 0 0 1px rgba(255,255,255,0.05) inset, 0 8px 28px rgba(79,227,193,0.08), 0 2px 10px rgba(0,0,0,0.45)`; }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = `0 0 0 1px rgba(255,255,255,0.05) inset, 0 16px 48px rgba(79,227,193,0.12), 0 4px 20px rgba(0,0,0,0.45)`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = `0 0 0 1px rgba(255,255,255,0.05) inset, 0 16px 48px rgba(79,227,193,0.12), 0 4px 20px rgba(0,0,0,0.45)`; }}
          >
            {/* corner glow */}
            <div style={{
              position: 'absolute', top: -40, right: -40, width: 160, height: 160, pointerEvents: 'none',
              background: `radial-gradient(circle, rgba(79,227,193,0.18), transparent 68%)`,
            }} />

            {/* icon */}
            <div style={{
              width: 56, height: 56, borderRadius: 18, flexShrink: 0,
              background: `rgba(79,227,193,0.10)`,
              border: `1px solid rgba(79,227,193,0.48)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 24px rgba(79,227,193,0.36)`,
              color: T.teal,
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24">
                <path d="M4 13l5 5L20 7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: T.display, fontSize: 24, fontWeight: 700,
                color: T.text, letterSpacing: '-0.02em', lineHeight: 1.1,
                marginBottom: 5,
              }}>
                Finished
              </div>
              <div style={{
                fontFamily: T.mono, fontSize: 10, letterSpacing: '0.17em',
                color: T.teal, textTransform: 'uppercase', opacity: 0.85,
              }}>
                See what you accomplished
              </div>
            </div>
          </button>

        </div>
      </div>
    </div>
  );
}
