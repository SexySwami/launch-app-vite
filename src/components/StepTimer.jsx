import { useState, useEffect } from 'react';
import { T } from '../tokens.js';

function fmt(secs) {
  if (secs < 60) return `0:${String(secs).padStart(2, '0')}`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function StepTimer({ durationSeconds = 120, accent = T.teal }) {
  const [remaining, setRemaining] = useState(durationSeconds);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    setRemaining(durationSeconds);
    setExpired(false);
  }, [durationSeconds]);

  useEffect(() => {
    if (expired) return;
    if (remaining <= 0) { setExpired(true); return; }
    const id = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining, expired]);

  const pct = expired ? 0 : remaining / durationSeconds;

  // Accent → warm orange → red as time depletes
  const barColor = expired
    ? '#FF4560'
    : pct < 0.15
      ? '#FF4560'
      : pct < 0.35
        ? '#FF8C42'
        : accent;

  const glow = expired
    ? 'rgba(255,69,96,0.65)'
    : pct < 0.15
      ? 'rgba(255,69,96,0.55)'
      : pct < 0.35
        ? 'rgba(255,140,66,0.55)'
        : `${accent}88`;

  function reset() {
    setRemaining(durationSeconds);
    setExpired(false);
  }

  return (
    <div>
      {/* ── Reset button (expired only) ── */}
      {expired && (
        <div style={{
          display: 'flex', justifyContent: 'center',
          marginBottom: 10,
          animation: 'optionIn 220ms ease',
        }}>
          <button
            onClick={reset}
            style={{
              all: 'unset', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 14px', borderRadius: 99,
              background: 'rgba(255,69,96,0.1)',
              border: '1px solid rgba(255,69,96,0.4)',
              WebkitTapHighlightColor: 'transparent',
              transition: 'background 160ms ease, border-color 160ms ease',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none"
              stroke="#FF4560" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 6a4 4 0 1 1-1.2-2.85M10 1.5V4H7.5"/>
            </svg>
            <span style={{
              fontFamily: T.mono, fontSize: 9, letterSpacing: '0.18em',
              textTransform: 'uppercase', color: '#FF4560',
            }}>Reset timer</span>
          </button>
        </div>
      )}

      {/* ── Progress bar ── */}
      <div style={{
        position: 'relative',
        height: 3,
        borderRadius: 99,
        background: `${accent}18`,
        overflow: 'visible',
      }}>

        {/* Filled drain */}
        {!expired && (
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${pct * 100}%`,
            borderRadius: 99,
            background: `linear-gradient(to right, ${accent}44 0%, ${barColor} 100%)`,
            boxShadow: `0 0 10px 2px ${glow}`,
            transition: 'width 1.05s linear, background 0.8s ease, box-shadow 0.8s ease',
            overflow: 'hidden',
          }}>
            {/* inner shimmer sweep */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.22) 50%, transparent 100%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 2.4s linear infinite',
            }} />
          </div>
        )}

        {/* Leading-edge glow dot */}
        {!expired && pct > 0.02 && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: `${pct * 100}%`,
            transform: 'translate(-50%, -50%)',
            width: 7, height: 7,
            borderRadius: '50%',
            background: barColor,
            boxShadow: `0 0 10px 5px ${glow}, 0 0 3px 1px ${barColor}`,
            transition: 'left 1.05s linear, background 0.8s ease, box-shadow 0.8s ease',
          }} />
        )}

        {/* Expired — full red pulse */}
        {expired && (
          <div style={{
            position: 'absolute', inset: 0,
            borderRadius: 99,
            background: '#FF4560',
            boxShadow: '0 0 12px 3px rgba(255,69,96,0.7)',
            animation: 'pulse 1.1s ease-in-out infinite',
          }} />
        )}
      </div>

      {/* ── Time label ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 7 }}>
        <span style={{
          fontFamily: T.mono, fontSize: 9, letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: expired ? '#FF4560' : pct < 0.25 ? barColor : T.text3,
          transition: 'color 0.8s ease',
          animation: expired ? 'pulse 1.1s ease-in-out infinite' : 'none',
        }}>
          {expired ? "time's up" : fmt(remaining)}
        </span>
      </div>
    </div>
  );
}
