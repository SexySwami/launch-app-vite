import { useState, useEffect } from 'react';
import { T } from '../tokens.js';
import { Telemetry } from './Telemetry.jsx';

// Success palette — teal leads, cyan pairs in the bloom
const A  = T.teal;
const A2 = T.cyan;

function hexToRgba(hex, a) {
  const m = hex.replace('#', '');
  return `rgba(${parseInt(m.slice(0, 2), 16)},${parseInt(m.slice(2, 4), 16)},${parseInt(m.slice(4, 6), 16)},${a})`;
}

// ─── Static particle arrays (fixed at module load so they never re-randomize) ─

const SPARKS = Array.from({ length: 58 }).map((_, i) => {
  const streak = Math.random() > 0.58;
  return {
    a: (i / 58) * 360 + (Math.random() * 14 - 7),
    d: 80 + Math.random() * 180,
    size: streak ? (Math.random() * 1.6 + 1.5) : (Math.random() * 3 + 2),
    len: streak ? 12 + Math.random() * 18 : 0,
    streak,
    dur: 1000 + Math.random() * 950,
    delay: Math.random() * 320,
    tint: Math.random() > 0.5 ? A : (Math.random() > 0.42 ? A2 : '#FFFFFF'),
  };
});

const STAR_SPARKLES = Array.from({ length: 14 }).map(() => {
  const ang = Math.random() * Math.PI * 2;
  const rad = 70 + Math.random() * 78;
  return {
    x: Math.cos(ang) * rad,
    y: Math.sin(ang) * rad,
    size: 8 + Math.random() * 12,
    dur: 1800 + Math.random() * 2200,
    delay: -Math.random() * 4000,
    tint: Math.random() > 0.5 ? A : (Math.random() > 0.4 ? A2 : '#FFFFFF'),
  };
});

const EMBERS = Array.from({ length: 16 }).map(() => ({
  x: Math.random() * 240 - 120,
  dx: Math.random() * 30 - 15,
  dx2: Math.random() * 60 - 30,
  size: Math.random() * 2.4 + 1.4,
  dur: 3200 + Math.random() * 2600,
  delay: -Math.random() * 5000,
  tint: Math.random() > 0.5 ? A : (Math.random() > 0.45 ? A2 : '#FFFFFF'),
}));

const STARS = Array.from({ length: 44 }).map(() => ({
  left: Math.random() * 100,
  top: Math.random() * 100,
  size: Math.random() * 1.5 + 0.6,
  dur: Math.random() * 3.2 + 2.6,
  delay: -Math.random() * 6,
  tint: Math.random() > 0.7,
}));

// ─── Rotating spoke ring behind the core ─────────────────────────────────────
function Spokes() {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
      <div style={{ position: 'relative', width: 2, height: 2, animation: 'spokeSpin 26s linear infinite' }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute', left: '50%', top: '50%',
            width: 2, height: 200,
            transformOrigin: '50% 0%',
            transform: `translate(-50%, 0) rotate(${i * 30}deg)`,
            background: `linear-gradient(to bottom, ${hexToRgba(i % 2 ? A2 : A, 0.34)}, transparent 78%)`,
            filter: 'blur(0.4px)',
            animation: `gridGlow ${3.4 + (i % 4) * 0.5}s ease-in-out ${i * 0.12}s infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}

// ─── Celebration hero — ignition bloom ───────────────────────────────────────
function CelebrationCore() {
  const [burstKey, setBurstKey] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setBurstKey(k => k + 1), 3600);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ position: 'relative', width: 300, height: 300, display: 'grid', placeItems: 'center' }}>

      {/* Rotating light spokes */}
      <Spokes />

      {/* Ambient bloom behind the core */}
      <div style={{
        position: 'absolute', width: 260, height: 260, borderRadius: '50%', pointerEvents: 'none',
        background: `radial-gradient(circle, ${hexToRgba(A, 0.22)}, ${hexToRgba(A2, 0.07)} 46%, transparent 70%)`,
        filter: 'blur(6px)', animation: 'coreBreathe 4.6s ease-in-out infinite',
      }} />

      {/* Looping shockwave rings */}
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          position: 'absolute', width: 170, height: 170, borderRadius: '50%', pointerEvents: 'none',
          border: `1.5px solid ${hexToRgba(i % 2 ? A2 : A, 0.5)}`,
          boxShadow: `0 0 22px ${hexToRgba(i % 2 ? A2 : A, 0.28)}`,
          animation: `ringExpand 2.9s cubic-bezier(0.2,0.8,0.2,1) ${i * 0.95}s infinite`,
        }} />
      ))}

      {/* Continuous twinkling 4-point star-sparkles */}
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
        {STAR_SPARKLES.map((s, i) => (
          <svg key={i} width={s.size} height={s.size} viewBox="0 0 24 24" style={{
            position: 'absolute',
            left: `calc(50% + ${s.x}px)`, top: `calc(50% + ${s.y}px)`,
            transform: 'translate(-50%, -50%)', overflow: 'visible',
            filter: `drop-shadow(0 0 5px ${s.tint})`,
            animation: `sparkleTwinkle ${s.dur}ms ease-in-out ${s.delay}ms infinite`,
          }}>
            <path d="M12 0 L13.7 10.3 L24 12 L13.7 13.7 L12 24 L10.3 13.7 L0 12 L10.3 10.3 Z" fill={s.tint} />
          </svg>
        ))}
      </div>

      {/* Drifting celebratory embers */}
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
        {EMBERS.map((e, i) => (
          <span key={i} style={{
            position: 'absolute',
            left: `calc(50% + ${e.x}px)`, top: '60%',
            width: e.size, height: e.size, borderRadius: 99,
            background: e.tint, boxShadow: `0 0 ${e.size * 3}px ${e.tint}`,
            '--dx': `${e.dx}px`, '--dx2': `${e.dx2}px`,
            animation: `driftUp ${e.dur}ms linear ${e.delay}ms infinite`,
          }} />
        ))}
      </div>

      {/* Spark burst — re-keyed every 3.6 s to replay */}
      <div key={burstKey} style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
        {SPARKS.map((s, i) => (
          <span key={i} style={{
            position: 'absolute',
            width: s.streak ? s.len : s.size, height: s.size, borderRadius: 99,
            background: s.streak
              ? `linear-gradient(90deg, transparent, ${s.tint})`
              : s.tint,
            boxShadow: `0 0 ${s.size * 3}px ${s.tint}`,
            '--a': `${s.a}deg`, '--d': `${s.d}px`,
            animation: `burst ${s.dur}ms cubic-bezier(0.16,0.8,0.3,1) ${s.delay}ms both`,
          }} />
        ))}
      </div>

      {/* One-shot flash at ignition */}
      <div style={{
        position: 'absolute', width: 150, height: 150, borderRadius: '50%', pointerEvents: 'none',
        background: `radial-gradient(circle, ${hexToRgba('#FFFFFF', 0.9)}, ${hexToRgba(A, 0.4)} 40%, transparent 70%)`,
        animation: 'flash 900ms ease-out both',
      }} />

      {/* Orbiting micro-satellites */}
      {[
        { r: 96, dur: 9,   off: 0,   c: A  },
        { r: 78, dur: 6.5, off: 140, c: A2 },
      ].map((o, i) => (
        <div key={i} style={{
          position: 'absolute', width: o.r * 2, height: o.r * 2, pointerEvents: 'none',
          animation: `orbit ${o.dur}s linear ${i ? 'reverse' : ''} infinite`,
          transform: `rotate(${o.off}deg)`,
        }}>
          <span style={{
            position: 'absolute', top: -3, left: '50%',
            width: 6, height: 6, borderRadius: 99,
            transform: 'translateX(-50%)',
            background: o.c, boxShadow: `0 0 12px ${o.c}, 0 0 4px #fff`,
          }} />
        </div>
      ))}

      {/* Reactor-core medallion */}
      <div style={{ position: 'relative', width: 132, height: 132, borderRadius: '50%', display: 'grid', placeItems: 'center' }}>
        {/* Glowing face */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          animation: 'coreBreathe 4.6s ease-in-out infinite',
          background: `radial-gradient(circle at 50% 38%, ${hexToRgba(A, 0.32)}, ${hexToRgba(A2, 0.12)} 58%, ${hexToRgba(A, 0.04)} 100%)`,
          border: `1.5px solid ${hexToRgba(A, 0.62)}`,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.18), inset 0 0 26px ${hexToRgba(A, 0.3)}, 0 18px 48px rgba(0,0,0,0.55), 0 0 60px ${hexToRgba(A, 0.45)}`,
        }} />
        {/* Spinning dashed inner ring */}
        <svg width="132" height="132" viewBox="0 0 132 132"
          style={{ position: 'absolute', inset: 0, animation: 'spokeSpin 18s linear infinite' }}>
          <circle cx="66" cy="66" r="56" fill="none"
            stroke={hexToRgba(A2, 0.4)} strokeWidth="1" strokeDasharray="2 9" />
        </svg>
        {/* Checkmark */}
        <svg width="64" height="64" viewBox="0 0 64 64"
          style={{ position: 'relative', filter: `drop-shadow(0 0 10px ${hexToRgba(A, 0.85)})` }}>
          <path d="M19 33.5 L28.5 43 L46 23"
            fill="none" stroke="#fff" strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export function Reward({ onNext, onLog }) {
  const [pressNew,  setPressNew]  = useState(false);
  const [pressNext, setPressNext] = useState(false);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', minHeight: 0 }}>

      {/* Ambient triple wash */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 620px 440px at 50% 6%,   ${hexToRgba(A,         0.13)}, transparent 70%),
          radial-gradient(ellipse 520px 600px at 100% 100%, ${hexToRgba(T.purple,  0.07)}, transparent 70%),
          radial-gradient(ellipse 440px 320px at 0% 86%,   ${hexToRgba(A2,        0.08)}, transparent 70%)`,
      }} />

      {/* Starfield */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {STARS.map((s, i) => (
          <span key={i} style={{
            position: 'absolute', left: `${s.left}%`, top: `${s.top}%`,
            width: s.size, height: s.size, borderRadius: 99,
            background: s.tint ? A : '#fff',
            boxShadow: `0 0 ${s.size * 3.2}px ${s.tint ? hexToRgba(A, 0.7) : 'rgba(255,255,255,0.55)'}`,
            opacity: 0.4,
            animation: `twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
          }} />
        ))}
      </div>

      {/* Engineering grid, fading at edges */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.5,
        backgroundImage: `linear-gradient(rgba(140,200,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(140,200,255,0.04) 1px, transparent 1px)`,
        backgroundSize: '32px 32px',
        maskImage: 'radial-gradient(ellipse at 50% 34%, black 28%, transparent 78%)',
        WebkitMaskImage: 'radial-gradient(ellipse at 50% 34%, black 28%, transparent 78%)',
      }} />

      {/* Telemetry strip */}
      <div style={{ paddingTop: 8, position: 'relative', zIndex: 1 }}>
        <Telemetry time="MC-04 · COMPLETE" code="MC-04 / SUCCESS" state="COMPLETE" color={T.teal} />
      </div>

      {/* Body */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: 0, padding: '0 24px', position: 'relative', zIndex: 1,
      }}>
        {/* Eyebrow */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, marginBottom: 2 }}>
          <span style={{
            width: 6, height: 6, borderRadius: 99,
            background: A, boxShadow: `0 0 10px ${A}`,
            animation: 'pulse 1.7s ease-in-out infinite',
          }} />
          <span style={{
            fontFamily: T.mono, fontSize: 11.5, fontWeight: 500,
            letterSpacing: '0.3em', textTransform: 'uppercase', color: A, whiteSpace: 'nowrap',
          }}>
            Launch Successful
          </span>
        </div>

        {/* Celebration hero */}
        <CelebrationCore />

        {/* Copy */}
        <h1 style={{
          fontFamily: T.display, fontSize: 42, fontWeight: 700, letterSpacing: '-0.03em',
          color: T.text, margin: '4px 0 0', textAlign: 'center', lineHeight: 1.0,
          textShadow: `0 0 30px ${hexToRgba(A, 0.32)}`,
        }}>
          Mission complete.
        </h1>
        <p style={{
          fontFamily: T.display, fontSize: 16, fontWeight: 400, color: T.text2,
          margin: '14px 0 0', textAlign: 'center', lineHeight: 1.5,
          letterSpacing: '-0.005em', maxWidth: 300,
        }}>
          You did the hardest part — starting. Take the win.
        </p>
      </div>

      {/* Command row */}
      <div style={{ flexShrink: 0, display: 'flex', gap: 12, padding: '8px 24px 22px', position: 'relative', zIndex: 1 }}>

        {/* Secondary: New Mission */}
        <button
          onClick={onLog}
          onPointerDown={() => setPressNew(true)}
          onPointerUp={() => setPressNew(false)}
          onPointerLeave={() => setPressNew(false)}
          style={{
            all: 'unset', boxSizing: 'border-box', cursor: 'pointer', flex: 1, height: 60,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            borderRadius: 18, fontFamily: T.mono, fontSize: 12.5, fontWeight: 600,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: T.text,
            background: 'rgba(255,255,255,0.035)',
            border: `1px solid ${T.hairline}`,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 0 10px 24px rgba(0,0,0,0.4)`,
            transform: `scale(${pressNew ? 0.97 : 1}) translateY(${pressNew ? 1 : 0}px)`,
            transition: 'transform 140ms cubic-bezier(0.2,0.8,0.2,1)',
            WebkitTapHighlightColor: 'transparent',
          }}>
          New Mission
        </button>

        {/* Primary: Next Phase */}
        <button
          onClick={onNext}
          onPointerDown={() => setPressNext(true)}
          onPointerUp={() => setPressNext(false)}
          onPointerLeave={() => setPressNext(false)}
          style={{
            all: 'unset', boxSizing: 'border-box', cursor: 'pointer', flex: 1, height: 60,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            borderRadius: 18, fontFamily: T.mono, fontSize: 12.5, fontWeight: 600,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            color: '#04130F',
            background: `linear-gradient(180deg, ${A} 0%, ${hexToRgba(A2, 0.92)} 100%)`,
            border: `1px solid ${hexToRgba(A, 0.9)}`,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.4), 0 14px 34px rgba(0,0,0,0.5), 0 0 40px ${hexToRgba(A, 0.45)}`,
            transform: `scale(${pressNext ? 0.97 : 1}) translateY(${pressNext ? 1 : 0}px)`,
            transition: 'transform 140ms cubic-bezier(0.2,0.8,0.2,1)',
            WebkitTapHighlightColor: 'transparent',
          }}>
          Next Phase
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
