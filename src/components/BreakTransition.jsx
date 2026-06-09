import { T } from '../tokens.js';
import { Eyebrow } from './Eyebrow.jsx';
import { Telemetry } from './Telemetry.jsx';
import { AmbientField } from './AmbientField.jsx';

export function BreakTransition({ onDone }) {
  const rgba = (a) => hexToRgba(T.teal, a);
  return (
    <div style={{
      flex: 1, position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', minHeight: 0,
    }}>
      <AmbientField seed={3} />
      <div style={{ paddingTop: 8, position: 'relative', zIndex: 1 }}>
        <Telemetry time="BRK · RITUAL" code="BRK-01 / RITUAL" state="ENGAGE" color={T.teal} />
      </div>
      <div style={{ padding: '26px 28px 0', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'inline-block' }}>
          <Eyebrow color={T.teal} style={{ marginBottom: 18 }}>Transition</Eyebrow>
        </div>
        <h1 style={{
          fontFamily: T.display, fontWeight: 600, fontSize: 30, lineHeight: 1.1,
          letterSpacing: '-0.02em', color: T.text, margin: 0,
        }}>First, do one of these.</h1>
      </div>

      {/* Cards — all four items live here so the group stays centred */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '0 24px', gap: 14,
        position: 'relative', zIndex: 1,
      }}>
        <RitualCard index="01" title="Stand up" delay={0} />
        <RitualCard index="02" title="Take a deep breath and sit forward in your chair" delay={1.4} />

        {/* "and" divider */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '0 4px',
        }}>
          <div style={{ flex: 1, height: 1, background: rgba(0.22) }} />
          <span style={{
            fontFamily: T.mono, fontSize: 11, letterSpacing: '0.22em',
            color: rgba(0.65), textTransform: 'uppercase',
          }}>and</span>
          <div style={{ flex: 1, height: 1, background: rgba(0.22) }} />
        </div>

        <RitualCard icon={<EyeIcon />} title="Visualize yourself doing the next step" delay={2.8} />
      </div>

      <div style={{ padding: '0 24px 22px', position: 'relative', zIndex: 1 }}>
        <button onClick={onDone} style={{
          all: 'unset', boxSizing: 'border-box', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          width: '100%', height: 58, borderRadius: 18,
          background: `linear-gradient(180deg, ${rgba(0.92)}, ${rgba(0.55)})`,
          border: `1px solid ${rgba(0.9)}`,
          color: '#04161A',
          fontFamily: T.display, fontSize: 15, fontWeight: 700,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          boxShadow: `0 0 0 1px ${rgba(0.25)} inset, inset 0 1px 0 rgba(255,255,255,0.32), 0 10px 30px rgba(0,0,0,0.5), 0 0 44px ${rgba(0.5)}`,
          WebkitTapHighlightColor: 'transparent',
        }}>
          Done&nbsp;&nbsp;→
        </button>
      </div>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
      <path
        d="M1 7C3.5 2.5 6.8 1 10 1C13.2 1 16.5 2.5 19 7C16.5 11.5 13.2 13 10 13C6.8 13 3.5 11.5 1 7Z"
        stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"
      />
      <circle cx="10" cy="7" r="2.6" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="10" cy="7" r="1" fill="currentColor" />
    </svg>
  );
}

function RitualCard({ index, icon, title, delay = 0 }) {
  const rgba = (a) => hexToRgba(T.teal, a);
  return (
    <div style={{
      position: 'relative',
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '22px 20px', borderRadius: 22,
      background: `linear-gradient(155deg, ${rgba(0.12)} 0%, rgba(255,255,255,0.025) 50%, ${rgba(0.04)} 100%)`,
      border: `1px solid ${rgba(0.4)}`,
      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.07), 0 12px 30px rgba(0,0,0,0.4), 0 0 36px ${rgba(0.14)}`,
    }}>
      <span aria-hidden="true" style={{
        position: 'absolute', inset: 0, borderRadius: 22, pointerEvents: 'none',
        animation: `greenPulse 4.2s ease-out ${delay}s infinite`,
      }} />
      <div style={{
        flexShrink: 0, width: 44, height: 44, borderRadius: 14,
        background: `linear-gradient(180deg, ${rgba(0.22)}, ${rgba(0.06)})`,
        border: `1px solid ${rgba(0.55)}`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.1), 0 0 16px ${rgba(0.3)}`,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: T.mono, fontSize: 15, fontWeight: 600, color: T.teal,
        textShadow: `0 0 10px ${rgba(0.6)}`,
      }}>
        {icon ?? index}
      </div>
      <div style={{
        flex: 1, fontFamily: T.display, fontSize: 18, fontWeight: 600,
        color: T.text, letterSpacing: '-0.01em', lineHeight: 1.3,
      }}>{title}</div>
    </div>
  );
}

function hexToRgba(hex, a) {
  const m = hex.replace('#', '');
  return `rgba(${parseInt(m.slice(0, 2), 16)},${parseInt(m.slice(2, 4), 16)},${parseInt(m.slice(4, 6), 16)},${a})`;
}
