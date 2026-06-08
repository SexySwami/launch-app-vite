import { T } from '../tokens.js';
import { Eyebrow } from './Eyebrow.jsx';
import { Telemetry } from './Telemetry.jsx';

export function BreakTransition({ onDone }) {
  const rgba = (a) => hexToRgba(T.teal, a);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ paddingTop: 8 }}>
        <Telemetry time="BRK · RITUAL" code="BRK-01 / RITUAL" state="ENGAGE" color={T.teal} />
      </div>
      <div style={{ padding: '26px 28px 0', textAlign: 'center' }}>
        <div style={{ display: 'inline-block' }}>
          <Eyebrow color={T.teal} style={{ marginBottom: 18 }}>Transition</Eyebrow>
        </div>
        <h1 style={{
          fontFamily: T.display, fontWeight: 600, fontSize: 30, lineHeight: 1.1,
          letterSpacing: '-0.02em', color: T.text, margin: 0,
        }}>First, do one of these.</h1>
      </div>
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '0 24px', gap: 14,
      }}>
        <RitualCard index="01" title="Stand up" />
        <RitualCard index="02" title="Take a deep breath and sit forward in your chair" />
      </div>
      <div style={{ padding: '0 24px 22px' }}>
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

function RitualCard({ index, title }) {
  const rgba = (a) => hexToRgba(T.teal, a);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '22px 20px', borderRadius: 22,
      background: `linear-gradient(155deg, ${rgba(0.12)} 0%, rgba(255,255,255,0.025) 50%, ${rgba(0.04)} 100%)`,
      border: `1px solid ${rgba(0.4)}`,
      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.07), 0 12px 30px rgba(0,0,0,0.4), 0 0 36px ${rgba(0.14)}`,
    }}>
      <div style={{
        flexShrink: 0, width: 44, height: 44, borderRadius: 14,
        background: `linear-gradient(180deg, ${rgba(0.22)}, ${rgba(0.06)})`,
        border: `1px solid ${rgba(0.55)}`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.1), 0 0 16px ${rgba(0.3)}`,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: T.mono, fontSize: 15, fontWeight: 600, color: T.teal,
        textShadow: `0 0 10px ${rgba(0.6)}`,
      }}>{index}</div>
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
