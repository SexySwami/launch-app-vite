import { useState, useRef } from 'react';
import { T } from '../tokens.js';

const STARS = Array.from({ length: 46 }).map(() => ({
  left: Math.random() * 100,
  top: Math.random() * 100,
  size: Math.random() * 1.4 + 0.6,
  dur: Math.random() * 3 + 2.5,
  delay: -(Math.random() * 6),
  cyan: Math.random() > 0.76,
}));

const rgba = (hex, a) => {
  const m = hex.replace('#', '');
  return `rgba(${parseInt(m.slice(0, 2), 16)},${parseInt(m.slice(2, 4), 16)},${parseInt(m.slice(4, 6), 16)},${a})`;
};

// ─────────────────────────────────────────────────────────────
// The three moods — a spectrum of readiness, each calibrating how
// hard the mission gets broken down:
//   Good  → four-step breakdown (full guided mission)
//   Foggy → deep focus          (single-thread, focused depth)
//   Stuck → small chunker       (one tiny step at a time)
// Each carries its own accent + a hand-drawn line-art face glyph
// (Launch icon style: 24×24, 1.6px stroke, accent-colored + glow).
// ─────────────────────────────────────────────────────────────
const MOODS = [
  {
    id: 'good', name: 'Good', mode: 'Four-step breakdown', accent: T.teal, handlerKey: 'fourStep',
    icon: (c) => (
      <g fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9.2" />
        <path d="M8.4 10.6h.01" />
        <path d="M15.6 10.6h.01" />
        <path d="M7.8 14c1.1 1.5 2.6 2.3 4.2 2.3s3.1-.8 4.2-2.3" />
      </g>
    ),
  },
  {
    id: 'foggy', name: 'Foggy', mode: 'Deep focus', accent: T.purple, handlerKey: 'deepFocus',
    icon: (c) => (
      <g fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9.2" />
        <path d="M7.7 11h1.7" />
        <path d="M14.6 11h1.7" />
        <path d="M8.3 15.1c.95-1.1 1.9 1.1 2.85 0s1.9-1.1 2.85 0" />
      </g>
    ),
  },
  {
    id: 'stuck', name: 'Stuck', mode: 'Small chunker', accent: T.amber, handlerKey: 'smallChunker',
    icon: (c) => (
      <g fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9.2" />
        <path d="M8.4 11h.01" />
        <path d="M15.6 11h.01" />
        <path d="M8.6 15.4h6.8" />
        <path d="M7.4 8.3l1.7.9" />
        <path d="M16.6 8.3l-1.7.9" />
      </g>
    ),
  },
];

// ─────────────────────────────────────────────────────────────
// Telemetry strip — mono status read-out at the top of the screen.
// ─────────────────────────────────────────────────────────────
function Telemetry({ state, color }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.text3, padding: '0 24px',
    }}>
      <span>MC-05 / CREW · {state}</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 5, height: 5, borderRadius: 99, background: color, boxShadow: `0 0 8px ${color}`, animation: 'pulse 1.6s ease-in-out infinite' }} />
        CREW CHECK
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Mood button — a rich, tappable card: glowing icon medallion +
// the mood name + a chevron that flips to a check once selected.
// The entrance animation lives on a wrapper so the button keeps
// its own press/select scale transform.
// ─────────────────────────────────────────────────────────────
function MoodButton({ mood, index, selected, anySelected, onSelect }) {
  const [hover, setHover] = useState(false);
  const [press, setPress] = useState(false);
  const a = mood.accent;
  const dimmed = anySelected && !selected; // dim the un-chosen cards once a choice is made
  const lit = hover || selected;

  return (
    <div style={{ animation: `moodCardIn 560ms cubic-bezier(0.2,0.8,0.2,1) ${0.12 + index * 0.09}s both` }}>
      <button
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => { setHover(false); setPress(false); }}
        onPointerDown={() => setPress(true)}
        onPointerUp={() => setPress(false)}
        onClick={() => onSelect(mood)}
        style={{
          all: 'unset', cursor: 'pointer', boxSizing: 'border-box', width: '100%',
          display: 'flex', alignItems: 'center', gap: 18,
          padding: '18px 22px', borderRadius: 20, position: 'relative',
          background: `linear-gradient(155deg, ${rgba(a, lit ? 0.20 : 0.11)} 0%, rgba(255,255,255,0.025) 52%, ${rgba(a, lit ? 0.06 : 0.03)} 100%)`,
          border: `1px solid ${selected ? rgba(a, 0.82) : lit ? rgba(a, 0.58) : rgba(a, 0.34)}`,
          boxShadow: selected
            ? `inset 0 1px 0 rgba(255,255,255,0.10), 0 18px 40px rgba(0,0,0,0.5), 0 0 0 4px ${rgba(a, 0.12)}, 0 0 54px ${rgba(a, 0.4)}`
            : lit
              ? `inset 0 1px 0 rgba(255,255,255,0.09), 0 16px 36px rgba(0,0,0,0.46), 0 0 40px ${rgba(a, 0.26)}`
              : `inset 0 1px 0 rgba(255,255,255,0.06), 0 12px 28px rgba(0,0,0,0.4), 0 0 22px ${rgba(a, 0.12)}`,
          opacity: dimmed ? 0.5 : 1,
          transform: `scale(${press ? 0.98 : selected ? 1.01 : 1}) translateY(${press ? 1 : 0}px)`,
          transition: 'all 320ms cubic-bezier(0.2,0.8,0.2,1)',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {/* Icon medallion — hand-drawn line glyph, accent-colored */}
        <div style={{ position: 'relative', flexShrink: 0, width: 54, height: 54 }}>
          <svg width="54" height="54" viewBox="0 0 54 54" style={{ position: 'absolute', inset: 0, animation: selected ? 'spinR 7s linear infinite' : 'none', opacity: lit ? 1 : 0.7 }}>
            <circle cx="27" cy="27" r="25" fill="none" stroke={rgba(a, 0.5)} strokeWidth="1" strokeDasharray="3 6" />
          </svg>
          <div style={{
            position: 'absolute', inset: 4, borderRadius: '50%',
            background: `radial-gradient(circle at 50% 36%, ${rgba(a, 0.32)}, ${rgba(a, 0.06)} 70%, transparent)`,
            border: `1px solid ${rgba(a, lit ? 0.6 : 0.4)}`,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.12), 0 0 ${lit ? 22 : 12}px ${rgba(a, lit ? 0.45 : 0.25)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'box-shadow 320ms ease',
          }}>
            <svg width="27" height="27" viewBox="0 0 24 24" style={{ filter: `drop-shadow(0 0 ${lit ? 7 : 3}px ${rgba(a, 0.7)})`, transition: 'filter 320ms ease' }}>{mood.icon(a)}</svg>
          </div>
        </div>

        {/* Name only */}
        <span style={{
          flex: 1, fontFamily: T.display, fontSize: 25, fontWeight: 600, letterSpacing: '-0.02em', color: T.text,
          textShadow: lit ? `0 0 22px ${rgba(a, 0.5)}` : 'none', transition: 'text-shadow 300ms',
        }}>{mood.name}</span>

        {/* Trailing chevron / check */}
        <div style={{
          flexShrink: 0, width: 30, height: 30, borderRadius: 99,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: selected ? rgba(a, 0.2) : 'transparent',
          border: `1px solid ${selected ? rgba(a, 0.6) : T.hairlineSoft}`,
          color: selected ? a : T.text3, transition: 'all 280ms ease',
        }}>
          {selected
            ? <svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 7.5l3 3 7-7" stroke="currentColor" strokeWidth="1.9" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
            : <svg width="12" height="12" viewBox="0 0 14 14"><path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
        </div>
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Mood Check screen — the execution-mode picker, reframed as an
// honest "how are you, really?" mood check. Picking a mood
// calibrates the screen to that mood's accent, shows a brief
// confirmation toast, then routes into the matching breakdown:
//   Good → four-step · Foggy → deep focus · Stuck → small chunker.
// Keeps the original ModeSelect prop signature so App wiring is
// unchanged.
// ─────────────────────────────────────────────────────────────
export function ModeSelect({ onSelectFourStep, onSelectSmallChunker, onSelectDeepFocus, onBack }) {
  const committed = useRef(false);

  const handlers = {
    fourStep: onSelectFourStep,
    deepFocus: onSelectDeepFocus,
    smallChunker: onSelectSmallChunker,
  };

  const choose = (mood) => {
    if (committed.current) return;
    committed.current = true;
    const fn = handlers[mood.handlerKey];
    if (fn) fn();
  };

  const accent = T.cyan;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}>
      {/* Twinkling starfield */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        {STARS.map((s, i) => (
          <span key={i} style={{
            position: 'absolute',
            left: `${s.left}%`, top: `${s.top}%`,
            width: s.size, height: s.size, borderRadius: 99,
            background: s.cyan ? T.cyan : '#fff',
            boxShadow: `0 0 ${s.size * 3}px ${s.cyan ? 'rgba(0,229,255,0.65)' : 'rgba(255,255,255,0.5)'}`,
            opacity: 0.3,
            animation: `twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
          }} />
        ))}
      </div>
      <div style={{ paddingTop: 8, position: 'relative', zIndex: 1 }}>
        <Telemetry state="PRE-FLIGHT" color={T.teal} />
      </div>

      {/* Title block — intimate, lowercase voice */}
      <div style={{ padding: '26px 24px 0', animation: 'moodTitleIn 520ms cubic-bezier(0.2,0.8,0.2,1) both', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          {onBack && (
            <button
              onClick={onBack}
              aria-label="Go back"
              style={{
                all: 'unset', cursor: 'pointer', flexShrink: 0,
                width: 36, height: 36, borderRadius: 99,
                background: T.surface,
                border: `1px solid ${T.hairlineSoft}`,
                color: T.text2,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 150ms ease',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14">
                <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
          <div style={{ fontFamily: T.display, fontSize: 16, fontWeight: 500, color: T.text3 }}>
            before we launch
          </div>
        </div>
        <h1 style={{ fontFamily: T.display, fontSize: 44, fontWeight: 700, color: T.text, margin: 0, letterSpacing: '-0.03em', lineHeight: 0.98 }}>
          how are you,<br />really<span style={{ color: accent, textShadow: `0 0 18px ${rgba(accent, 0.7)}`, transition: 'color 320ms, text-shadow 320ms' }}>?</span>
        </h1>
        <p style={{ fontFamily: T.display, fontSize: 14, fontWeight: 400, color: T.text3, margin: '14px 0 0', lineHeight: 1.45, letterSpacing: '-0.005em', maxWidth: 300 }}>
          No wrong answer. We&rsquo;ll match the launch to wherever you actually are.
        </p>
      </div>

      {/* Mood buttons */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 13, padding: '20px 24px', position: 'relative', zIndex: 1 }}>
        {MOODS.map((m, i) => (
          <MoodButton key={m.id} mood={m} index={i}
            selected={false} anySelected={false}
            onSelect={choose} />
        ))}
      </div>

    </div>
  );
}
