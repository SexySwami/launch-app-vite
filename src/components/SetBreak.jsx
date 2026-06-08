import { T } from '../tokens.js';
import { Eyebrow } from './Eyebrow.jsx';
import { Telemetry } from './Telemetry.jsx';

const MIN = 5, MAX = 60, TICKS = [5, 15, 30, 60];

export function SetBreak({ duration, onDurationChange, onStart, onQuick5 }) {
  const clamped = Math.max(MIN, Math.min(MAX, duration));
  const pos = ((clamped - MIN) / (MAX - MIN)) * 100;

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0,
    }}>
      <div style={{ paddingTop: 8 }}>
        <Telemetry time="BRK · STANDBY" code="BRK-01 / BREAK" state="READY" color={T.cyan} />
      </div>

      <div style={{ padding: '22px 24px 0' }}>
        <Eyebrow style={{ marginBottom: 14 }}>Break Mode</Eyebrow>
        <h1 style={{
          fontFamily: T.display, fontWeight: 600, fontSize: 34, lineHeight: 1.04,
          letterSpacing: '-0.02em', color: T.text, margin: '0 0 8px',
        }}>Set your break.</h1>
        <p style={{ fontFamily: T.display, fontSize: 15, color: T.text2, margin: 0 }}>
          How long do you need?
        </p>
      </div>

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '0 24px', minHeight: 0,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <span style={{
            fontFamily: T.display, fontSize: 92, fontWeight: 600, color: T.text,
            letterSpacing: '-0.04em', lineHeight: 0.9, fontVariantNumeric: 'tabular-nums',
            textShadow: `0 0 40px rgba(0,229,255,0.6), 0 0 90px rgba(0,229,255,0.3)`,
          }}>{clamped}</span>
          <span style={{
            fontFamily: T.mono, fontSize: 22, fontWeight: 500, color: T.cyan,
            letterSpacing: '0.18em', marginLeft: 10, verticalAlign: 'middle',
            textShadow: `0 0 18px rgba(0,229,255,0.6)`,
          }}>MIN</span>
        </div>

        <div style={{ position: 'relative', padding: '0 4px' }}>
          <div style={{
            position: 'relative', height: 6, borderRadius: 99,
            background: 'rgba(255,255,255,0.08)',
          }}>
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pos}%`,
              borderRadius: 99,
              background: `linear-gradient(90deg, rgba(0,229,255,0.5), ${T.cyan})`,
              boxShadow: `0 0 14px rgba(0,229,255,0.6)`,
              pointerEvents: 'none',
            }} />
            <div style={{
              position: 'absolute', top: '50%', left: `${pos}%`,
              transform: 'translate(-50%,-50%)',
              width: 24, height: 24, borderRadius: '50%', pointerEvents: 'none',
              background: `radial-gradient(circle at 40% 35%, #fff, ${T.cyan} 70%)`,
              border: `2px solid ${T.cyan}`,
              boxShadow: `0 0 0 5px rgba(0,229,255,0.14), 0 0 22px rgba(0,229,255,0.8)`,
            }} />
            <input
              type="range"
              min={MIN}
              max={MAX}
              step={1}
              value={clamped}
              onChange={(e) => onDurationChange(parseInt(e.target.value, 10))}
              aria-label="Break duration in minutes"
              style={{
                position: 'absolute', top: -14, left: 0, width: '100%', height: 34,
                opacity: 0, cursor: 'pointer',
                WebkitAppearance: 'none', appearance: 'none',
                margin: 0, padding: 0, background: 'transparent',
              }}
            />
          </div>
          <div style={{ position: 'relative', height: 22, marginTop: 10 }}>
            {TICKS.map(t => {
              const p = ((t - MIN) / (MAX - MIN)) * 100;
              const active = t === clamped;
              return (
                <div key={t} style={{
                  position: 'absolute', left: `${p}%`, transform: 'translateX(-50%)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                }}>
                  <span style={{ width: 1, height: 6, background: T.hairline }} />
                  <span style={{
                    fontFamily: T.mono, fontSize: 10, letterSpacing: '0.1em',
                    color: active ? T.cyan : T.text3,
                  }}>{t}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{
        padding: '0 24px 22px', display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <PrimaryButton accent={T.cyan} dark onClick={onStart}>Start Break</PrimaryButton>
        <GhostButton onClick={onQuick5}>Quick 5 Min</GhostButton>
      </div>
    </div>
  );
}

function PrimaryButton({ children, accent = T.cyan, dark = false, onClick }) {
  const rgba = (a) => hexToRgba(accent, a);
  return (
    <button onClick={onClick} style={{
      all: 'unset', boxSizing: 'border-box', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      width: '100%', height: 58, borderRadius: 18,
      background: `linear-gradient(180deg, ${rgba(0.92)}, ${rgba(0.55)})`,
      border: `1px solid ${rgba(0.9)}`,
      color: dark ? '#04121A' : T.text,
      fontFamily: T.display, fontSize: 15, fontWeight: 700,
      letterSpacing: '0.12em', textTransform: 'uppercase',
      textShadow: dark ? 'none' : `0 0 18px ${rgba(0.7)}`,
      boxShadow: `0 0 0 1px ${rgba(0.25)} inset, inset 0 1px 0 rgba(255,255,255,0.28), 0 10px 30px rgba(0,0,0,0.5), 0 0 44px ${rgba(0.5)}`,
      WebkitTapHighlightColor: 'transparent',
    }}>
      {children}
    </button>
  );
}

function GhostButton({ children, onClick, color = T.text2 }) {
  return (
    <button onClick={onClick} style={{
      all: 'unset', boxSizing: 'border-box', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      width: '100%', height: 52, borderRadius: 16,
      background: T.surface,
      border: `1px solid ${T.hairline}`,
      color,
      fontFamily: T.display, fontSize: 13, fontWeight: 600,
      letterSpacing: '0.12em', textTransform: 'uppercase',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
      WebkitTapHighlightColor: 'transparent',
    }}>
      {children}
    </button>
  );
}

function hexToRgba(hex, a) {
  const m = hex.replace('#', '');
  return `rgba(${parseInt(m.slice(0, 2), 16)},${parseInt(m.slice(2, 4), 16)},${parseInt(m.slice(4, 6), 16)},${a})`;
}
