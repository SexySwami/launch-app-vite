import { useState, useEffect, useRef, useCallback } from 'react';
import { useSignIn } from '@clerk/clerk-react';
import { T } from '../tokens.js';

export const ONBOARDING_KEY = 'launch:onboarding-done';

// ─── helpers ─────────────────────────────────────────────────────────────────
export const rgba = (hex, a) => {
  const m = hex.replace('#', '');
  return `rgba(${parseInt(m.slice(0,2),16)},${parseInt(m.slice(2,4),16)},${parseInt(m.slice(4,6),16)},${a})`;
};

// Fixed starfield so it doesn't re-randomise on every render
export const STARS = Array.from({ length: 46 }, () => ({
  left: Math.random() * 100, top: Math.random() * 100,
  size: Math.random() * 1.5 + 0.6,
  dur: Math.random() * 3.2 + 2.6,
  delay: -Math.random() * 6,
  cyan: Math.random() > 0.74,
}));

export const ACCENTS = [T.cyan, T.purple, T.cyan, T.purple, T.teal, T.cyan, T.blue, T.cyan];

// ─── onboarding-specific CSS (injected on mount, removed on unmount) ──────────
export const OB_CSS = `
  @keyframes ob-riseIn {
    0%   { transform: translateY(16px); opacity: 0; filter: blur(7px) }
    100% { transform: translateY(0);    opacity: 1; filter: blur(0)   }
  }
  @keyframes ob-rocketBob    { 0%,100% { transform: translateY(2.5px)  } 50% { transform: translateY(-4.5px) } }
  @keyframes ob-flameFlicker {
    0%,100% { transform: scaleY(1) scaleX(1);      opacity: 0.92 }
    30%     { transform: scaleY(1.24) scaleX(0.86); opacity: 1    }
    62%     { transform: scaleY(0.8)  scaleX(1.1);  opacity: 0.78 }
  }
  @keyframes ob-flameInner {
    0%,100% { transform: scaleY(0.9);  opacity: 0.85 }
    40%     { transform: scaleY(1.3);  opacity: 1    }
    72%     { transform: scaleY(0.68); opacity: 0.68 }
  }
  @keyframes ob-exhaust {
    0%   { transform: translateY(0)    scale(1);   opacity: 0   }
    18%  {                                          opacity: 0.9 }
    100% { transform: translateY(32px) scale(0.2); opacity: 0   }
  }
  @keyframes ob-tileFloat { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-5px) } }
  @keyframes ob-ringPulse {
    0%   { transform: translate(-50%,-50%) scale(0.85); opacity: 0.55 }
    100% { transform: translate(-50%,-50%) scale(1.9);  opacity: 0    }
  }
  @keyframes ob-beamScan {
    0%   { transform: translateY(-12%);  opacity: 0    }
    14%  {                               opacity: 0.85 }
    86%  {                               opacity: 0.85 }
    100% { transform: translateY(112%);  opacity: 0    }
  }
  @keyframes ob-caret    { 0%,48% { opacity: 1 } 52%,100% { opacity: 0 } }
  @keyframes ob-eqBar    { 0%,100% { transform: scaleY(0.35) } 50% { transform: scaleY(1) } }
  @keyframes ob-ringGlow {
    0%,100% { filter: drop-shadow(0 0 8px  rgba(79,227,193,0.5)); }
    50%     { filter: drop-shadow(0 0 42px rgba(79,227,193,1)) drop-shadow(0 0 80px rgba(79,227,193,0.45)); }
  }
  @keyframes ob-spark    { 0%,100% { opacity: 0 } 25% { opacity: 1 } 65% { opacity: 0.9 } }
  @keyframes ob-dash     { to { stroke-dashoffset: -20; } }
  @keyframes ob-scanY {
    0%   { transform: translateY(-40px);  opacity: 0   }
    12%  {                                opacity: 0.9 }
    88%  {                                opacity: 0.9 }
    100% { transform: translateY(720px);  opacity: 0   }
  }

  /* entrance animation: fires only when the slide is .ob-active */
  .ob-s { opacity: 1; }
  .ob-slide.ob-active .ob-s {
    animation: ob-riseIn 620ms cubic-bezier(0.2,0.8,0.2,1) both;
    animation-delay: var(--d, 0s);
  }
  .ob-slide.ob-active .ob-ring-glow {
    animation: ob-ringGlow 2.6s ease-in-out 0.5s infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    .ob-s { animation: none !important; opacity: 1 !important; transform: none !important; filter: none !important; }
    .ob-ring-glow { animation: none !important; }
  }
`;

// ─── Telemetry strip ──────────────────────────────────────────────────────────
function Telemetry({ code, state, color = T.teal }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8,
      fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em', color: T.text3, padding: '0 24px' }}>
      <span style={{ width: 5, height: 5, borderRadius: 99, background: color,
        boxShadow: `0 0 8px ${color}`, animation: 'pulse 1.6s ease-in-out infinite', flexShrink: 0 }} />
      <span>{code} · {state}</span>
    </div>
  );
}

// ─── RocketMark — bobbing rocket in orbital rings ─────────────────────────────
// uid prevents SVG gradient-ID collisions when two instances share the DOM
const EXHAUST = [
  { x: 0,    r: 1.9, c: '#00E5FF', delay: 0    },
  { x: -4,   r: 1.4, c: '#3D7FFF', delay: 0.35 },
  { x: 4,    r: 1.4, c: '#3D7FFF', delay: 0.6  },
  { x: -1.5, r: 1.1, c: '#A876FF', delay: 0.9  },
  { x: 2,    r: 1.1, c: '#4FE3C1', delay: 1.15 },
];
function RocketMark({ uid = 'a' }) {
  const SIZE = 132;
  const g = { ring: `rk-ring-${uid}`, glow: `rk-glow-${uid}`, flame: `rk-flame-${uid}`, body: `rk-body-${uid}` };
  return (
    <div style={{ position: 'relative', width: SIZE, height: SIZE }}>
      {/* halo */}
      <div style={{ position: 'absolute', left: '50%', top: '50%', width: 230, height: 230,
        transform: 'translate(-50%,-50%)', borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(0,229,255,0.20) 0%, rgba(61,127,255,0.10) 32%, rgba(168,118,255,0.06) 56%, transparent 74%)',
        animation: 'haloPulse 4.5s ease-in-out infinite' }} />
      {/* orbital rings — static relative to rocket */}
      <svg width={SIZE} height={SIZE} viewBox="-66 -66 132 132" style={{ overflow: 'visible', position: 'absolute', inset: 0 }}>
        <defs>
          <linearGradient id={g.ring} x1="0" y1="-1" x2="0" y2="1">
            <stop offset="0%"   stopColor="#00E5FF" stopOpacity="0.9" />
            <stop offset="50%"  stopColor="#3D7FFF" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#A876FF" stopOpacity="0.7" />
          </linearGradient>
          <filter id={g.glow} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="1.4" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {/* outer tick ring */}
        <g style={{ animation: 'spinR 54s linear infinite', transformOrigin: 'center', transformBox: 'fill-box' }}>
          <circle r="62" fill="none" stroke="rgba(140,200,255,0.28)" strokeWidth="0.6" strokeDasharray="2 7" />
          {Array.from({ length: 12 }).map((_, i) => {
            const a = i / 12 * Math.PI * 2;
            return <line key={i}
              x1={Math.cos(a)*58} y1={Math.sin(a)*58}
              x2={Math.cos(a)*62.5} y2={Math.sin(a)*62.5}
              stroke={i%3===0 ? '#00E5FF' : 'rgba(140,200,255,0.5)'}
              strokeWidth={i%3===0 ? 1.1 : 0.6}
              opacity={i%3===0 ? 0.9 : 0.5} />;
          })}
        </g>
        {/* inner orbit + accent dots */}
        <g style={{ animation: 'spinL 34s linear infinite', transformOrigin: 'center', transformBox: 'fill-box' }}>
          <circle r="50" fill="none" stroke={`url(#${g.ring})`} strokeWidth="1" opacity="0.55"
            style={{ filter: 'drop-shadow(0 0 4px rgba(0,229,255,0.5))' }} />
          <circle cx="50"  cy="0" r="2.4" fill="#00E5FF" opacity="0.9"  filter={`url(#${g.glow})`} />
          <circle cx="-50" cy="0" r="1.9" fill="#A876FF" opacity="0.85" filter={`url(#${g.glow})`} />
        </g>
      </svg>
      {/* rocket body — bobs independently of rings */}
      <svg width={SIZE} height={SIZE} viewBox="-66 -66 132 132"
        style={{ overflow: 'visible', position: 'absolute', inset: 0, animation: 'ob-rocketBob 3.2s ease-in-out infinite' }}>
        <defs>
          <linearGradient id={g.flame} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="38%"  stopColor="#00E5FF" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#3D7FFF" stopOpacity="0"    />
          </linearGradient>
          <linearGradient id={g.body} x1="0" y1="-1" x2="0" y2="1">
            <stop offset="0%"   stopColor="#00E5FF" stopOpacity="0.20" />
            <stop offset="100%" stopColor="#030610" stopOpacity="0.92" />
          </linearGradient>
        </defs>
        {/* exhaust particles */}
        {EXHAUST.map((p, i) => (
          <circle key={i} cx={p.x} cy={20} r={p.r} fill={p.c}
            style={{ filter: `drop-shadow(0 0 4px ${p.c})`, transformBox: 'fill-box', transformOrigin: 'center',
              animation: `ob-exhaust 1.1s ease-in ${p.delay}s infinite` }} />
        ))}
        {/* outer flame */}
        <g style={{ transformBox: 'fill-box', transformOrigin: 'center top', animation: 'ob-flameFlicker 0.32s ease-in-out infinite' }}>
          <path d="M-7.5 13 Q-3 30 0 36 Q3 30 7.5 13 Q0 19 -7.5 13 Z" fill={`url(#${g.flame})`} />
        </g>
        {/* inner flame */}
        <g style={{ transformBox: 'fill-box', transformOrigin: 'center top', animation: 'ob-flameInner 0.27s ease-in-out infinite' }}>
          <path d="M-3.6 13 Q0 25 0 29 Q0 25 3.6 13 Q0 17 -3.6 13 Z" fill="#ffffff"
            style={{ filter: 'drop-shadow(0 0 5px #00E5FF)' }} />
        </g>
        {/* body */}
        <g style={{ filter: 'drop-shadow(0 0 8px rgba(0,229,255,0.7))' }}
          fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
          <path d="M-9 1 L-18.5 15 L-9 11.5" fill="rgba(0,229,255,0.10)" />
          <path d="M9 1 L18.5 15 L9 11.5"    fill="rgba(0,229,255,0.10)" />
          <path d="M-9 12 L-9 -6 Q-9 -21 0 -29 Q9 -21 9 -6 L9 12 Q0 18 -9 12 Z" fill={`url(#${g.body})`} />
          <path d="M-9 1 Q0 5 9 1" stroke="rgba(0,229,255,0.55)" strokeWidth="1.1" />
          <circle cx="0" cy="-10" r="4.6" fill="rgba(0,229,255,0.14)" />
        </g>
        {/* porthole glow */}
        <circle cx="0" cy="-10" r="2.3" fill="#00E5FF"
          style={{ filter: 'drop-shadow(0 0 6px #00E5FF)', transformBox: 'fill-box', transformOrigin: 'center',
            animation: 'coreInnerPulse 1.6s ease-in-out infinite' }} />
      </svg>
    </div>
  );
}

// ─── NeuraMark — neural-network for the "dopamine gap" slide ─────────────────
const NEURA_NODES = [
  { r: 30, a: 15,  sz: 3.0, c: T.cyan,   dur: 2.1, delay: 0   },
  { r: 26, a: 87,  sz: 2.5, c: T.purple, dur: 2.6, delay: 0.5 },
  { r: 35, a: 148, sz: 2.8, c: T.blue,   dur: 1.9, delay: 0.9 },
  { r: 28, a: 210, sz: 2.6, c: T.purple, dur: 2.3, delay: 0.3 },
  { r: 33, a: 280, sz: 2.4, c: T.cyan,   dur: 1.7, delay: 0.7 },
  { r: 46, a: 45,  sz: 2.0, c: T.blue,   dur: 2.8, delay: 1.2 },
  { r: 42, a: 165, sz: 1.8, c: T.teal,   dur: 2.0, delay: 0.4 },
  { r: 48, a: 240, sz: 2.2, c: T.purple, dur: 2.4, delay: 1.0 },
];
const NEURA_LINKS = [[0,1],[1,2],[2,3],[3,4],[4,0],[5,6],[6,7],[7,5]];
function NeuraMark() {
  const SIZE = 128;
  const px = n => Math.cos(n.a * Math.PI / 180) * n.r;
  const py = n => Math.sin(n.a * Math.PI / 180) * n.r;
  return (
    <div style={{ position: 'relative', width: SIZE, height: SIZE, animation: 'reactorBreathe 5.5s ease-in-out infinite' }}>
      <div style={{ position: 'absolute', left: '50%', top: '50%', width: 220, height: 220,
        transform: 'translate(-50%,-50%)', borderRadius: '50%', pointerEvents: 'none',
        background: `radial-gradient(circle, ${rgba(T.purple,0.24)} 0%, ${rgba(T.blue,0.08)} 44%, transparent 70%)`,
        animation: 'haloPulse 5s ease-in-out infinite' }} />
      <svg width={SIZE} height={SIZE} viewBox="-64 -64 128 128" style={{ overflow: 'visible', position: 'relative' }}>
        <defs>
          <filter id="ng" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="1.4" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <radialGradient id="ncg" cx="0.5" cy="0.4" r="0.7">
            <stop offset="0%"   stopColor="#A876FF" stopOpacity="0.55" />
            <stop offset="40%"  stopColor="#3D7FFF" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#030610" stopOpacity="0.97" />
          </radialGradient>
        </defs>
        {/* outer tick ring */}
        <g style={{ animation: 'spinR 55s linear infinite', transformOrigin: 'center', transformBox: 'fill-box' }}>
          <circle r="60" fill="none" stroke="rgba(140,200,255,0.18)" strokeWidth="0.6" strokeDasharray="2 7" />
          {Array.from({ length: 12 }).map((_, i) => {
            const a = i / 12 * Math.PI * 2;
            return <line key={i}
              x1={Math.cos(a)*57} y1={Math.sin(a)*57}
              x2={Math.cos(a)*61} y2={Math.sin(a)*61}
              stroke={i%3===0 ? T.purple : 'rgba(140,200,255,0.4)'}
              strokeWidth={i%3===0 ? 1.1 : 0.6}
              opacity={i%3===0 ? 0.85 : 0.45} />;
          })}
        </g>
        {/* counter-spin orbit */}
        <g style={{ animation: 'spinL 38s linear infinite', transformOrigin: 'center', transformBox: 'fill-box' }}>
          <circle r="50" fill="none" stroke={rgba(T.purple,0.32)} strokeWidth="0.9" strokeDasharray="4 10"
            style={{ filter: 'drop-shadow(0 0 4px rgba(168,118,255,0.45))' }} />
          <circle cx="50"  cy="0" r="2.2" fill={T.purple} opacity="0.9" filter="url(#ng)" />
          <circle cx="-50" cy="0" r="1.8" fill={T.blue}   opacity="0.8" filter="url(#ng)" />
        </g>
        {/* center-to-node lines */}
        {NEURA_NODES.map((n, i) => (
          <line key={`cl-${i}`} x1="0" y1="0" x2={px(n)} y2={py(n)}
            stroke={n.c} strokeWidth="0.8" opacity="0.45" strokeDasharray="3 4"
            style={{ filter: `drop-shadow(0 0 3px ${rgba(n.c,0.6)})`,
              animation: `ob-dash ${1.6 + i * 0.28}s linear ${i * 0.2}s infinite` }} />
        ))}
        {/* inter-node links */}
        {NEURA_LINKS.map(([a, b], i) => (
          <line key={`nl-${i}`}
            x1={px(NEURA_NODES[a])} y1={py(NEURA_NODES[a])}
            x2={px(NEURA_NODES[b])} y2={py(NEURA_NODES[b])}
            stroke="rgba(168,118,255,0.22)" strokeWidth="0.5" strokeDasharray="2 5"
            style={{ animation: `ob-dash ${2.4 + i * 0.22}s linear ${i * 0.28}s infinite` }} />
        ))}
        {/* nodes */}
        {NEURA_NODES.map((n, i) => (
          <circle key={`n-${i}`} cx={px(n)} cy={py(n)} r={n.sz} fill={n.c}
            style={{ filter: `drop-shadow(0 0 10px ${rgba(n.c,1)})`,
              transformBox: 'fill-box', transformOrigin: 'center',
              animation: `pulse ${n.dur}s ease-in-out ${n.delay}s infinite` }} />
        ))}
        {/* core */}
        <circle r="20" fill="none" stroke={rgba(T.purple,0.22)} strokeWidth="3" style={{ filter: 'blur(5px)' }} />
        <circle r="18" fill="url(#ncg)" stroke={rgba(T.purple,0.68)} strokeWidth="1.1"
          style={{ filter: 'drop-shadow(0 0 20px rgba(168,118,255,0.7))' }} />
        <g filter="url(#ng)" stroke={T.purple} strokeWidth="1.6" strokeLinecap="round" fill="none">
          <path d="M-7 1 Q-4 -5 0 1 Q4 7 7 1" />
        </g>
        <circle r="3" fill={T.purple}
          style={{ filter: `drop-shadow(0 0 8px ${T.purple})`, transformBox: 'fill-box', transformOrigin: 'center',
            animation: 'coreInnerPulse 1.8s ease-in-out infinite' }} />
      </svg>
    </div>
  );
}

// ─── FrictionSparkMark — radiating sparks for "every time you feel friction" ─
const RAYS = Array.from({ length: 8 }, (_, i) => {
  const angle = (i / 8) * Math.PI * 2;
  const inner = 36, outer = inner + (i % 2 === 0 ? 22 : 15);
  const colors = [T.cyan, T.blue, T.teal, T.purple, T.cyan, T.blue, T.teal, T.purple];
  return { x1: Math.cos(angle)*inner, y1: Math.sin(angle)*inner,
           x2: Math.cos(angle)*outer, y2: Math.sin(angle)*outer,
           c: colors[i], delay: i * 0.19, dur: 1.6 + (i % 3) * 0.35 };
});
function FrictionSparkMark() {
  const SIZE = 132;
  return (
    <div style={{ position: 'relative', width: SIZE, height: SIZE, animation: 'reactorBreathe 3.8s ease-in-out infinite' }}>
      <div style={{ position: 'absolute', left: '50%', top: '50%', width: 230, height: 230,
        transform: 'translate(-50%,-50%)', borderRadius: '50%', pointerEvents: 'none',
        background: `radial-gradient(circle, ${rgba(T.blue,0.30)} 0%, ${rgba(T.cyan,0.12)} 42%, transparent 68%)`,
        animation: 'haloPulse 3.8s ease-in-out infinite' }} />
      <svg width={SIZE} height={SIZE} viewBox="-66 -66 132 132" style={{ overflow: 'visible', position: 'relative' }}>
        <defs>
          <linearGradient id="fsg" x1="0" y1="-1" x2="0" y2="1">
            <stop offset="0%"   stopColor="#00E5FF" stopOpacity="0.95" />
            <stop offset="55%"  stopColor="#3D7FFF" stopOpacity="0.6"  />
            <stop offset="100%" stopColor="#A876FF" stopOpacity="0.8"  />
          </linearGradient>
          <radialGradient id="fscg" cx="0.5" cy="0.4" r="0.7">
            <stop offset="0%"   stopColor="#3D7FFF" stopOpacity="0.55" />
            <stop offset="45%"  stopColor="#00E5FF" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#030610" stopOpacity="0.98" />
          </radialGradient>
          <filter id="fsgf" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="1.5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {/* outer tick ring */}
        <g style={{ animation: 'spinR 50s linear infinite', transformOrigin: 'center', transformBox: 'fill-box' }}>
          <circle r="62" fill="none" stroke="rgba(140,200,255,0.25)" strokeWidth="0.6" strokeDasharray="2 7" />
          {Array.from({ length: 12 }).map((_, i) => {
            const a = i / 12 * Math.PI * 2;
            return <line key={i}
              x1={Math.cos(a)*58} y1={Math.sin(a)*58}
              x2={Math.cos(a)*62.5} y2={Math.sin(a)*62.5}
              stroke={i%3===0 ? T.blue : 'rgba(140,200,255,0.45)'}
              strokeWidth={i%3===0 ? 1.1 : 0.6}
              opacity={i%3===0 ? 0.85 : 0.45} />;
          })}
        </g>
        {/* counter-spin orbit */}
        <g style={{ animation: 'spinL 30s linear infinite', transformOrigin: 'center', transformBox: 'fill-box' }}>
          <circle r="50" fill="none" stroke="url(#fsg)" strokeWidth="1" opacity="0.7"
            style={{ filter: 'drop-shadow(0 0 5px rgba(61,127,255,0.55))' }} />
          <circle cx="50"  cy="0" r="2.4" fill={T.cyan} opacity="0.9"  filter="url(#fsgf)" />
          <circle cx="-50" cy="0" r="1.9" fill={T.blue} opacity="0.85" filter="url(#fsgf)" />
        </g>
        {/* radiating sparks */}
        {RAYS.map((ray, i) => (
          <line key={i} x1={ray.x1} y1={ray.y1} x2={ray.x2} y2={ray.y2}
            stroke={ray.c} strokeWidth={i%2===0 ? 1.6 : 1.0} strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 5px ${rgba(ray.c,0.9)})`,
              animation: `ob-spark ${ray.dur}s ease-in-out ${ray.delay}s infinite` }} />
        ))}
        {/* core */}
        <circle r="36" fill="none" stroke={rgba(T.blue,0.22)} strokeWidth="3" style={{ filter: 'blur(5px)' }} />
        <circle r="34" fill="url(#fscg)" stroke={rgba(T.blue,0.68)} strokeWidth="1.1"
          style={{ filter: 'drop-shadow(0 0 24px rgba(61,127,255,0.7))' }} />
        <g style={{ filter: 'drop-shadow(0 0 11px rgba(0,229,255,0.98))' }}>
          <path d="M5 -19 L-6 -1.5 h7.5 L-4.5 19 L14 -2 h-9 Z"
            fill="url(#fsg)" stroke="rgba(255,255,255,0.82)" strokeWidth="0.8" strokeLinejoin="round" />
        </g>
        <circle r="4.2" fill={T.cyan}
          style={{ filter: `drop-shadow(0 0 8px ${T.cyan})`, transformBox: 'fill-box', transformOrigin: 'center',
            animation: 'coreInnerPulse 1.4s ease-in-out infinite' }} />
      </svg>
    </div>
  );
}

// ─── IconTile — floating square with halo ─────────────────────────────────────
function IconTile({ accent, children, size = 76 }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, animation: 'ob-tileFloat 4s ease-in-out infinite' }}>
      <div style={{ position: 'absolute', left: '50%', top: '50%',
        width: size * 2.1, height: size * 2.1, transform: 'translate(-50%,-50%)',
        borderRadius: '50%', pointerEvents: 'none',
        background: `radial-gradient(circle, ${rgba(accent,0.22)} 0%, ${rgba(accent,0.06)} 45%, transparent 72%)`,
        animation: 'haloPulse 4.5s ease-in-out infinite' }} />
      <div style={{ position: 'relative', width: size, height: size, borderRadius: 22,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `linear-gradient(158deg, ${rgba(accent,0.16)}, ${rgba(accent,0.03)} 70%, rgba(255,255,255,0.015))`,
        border: `1px solid ${rgba(accent,0.45)}`,
        boxShadow: `0 14px 30px rgba(0,0,0,0.5), 0 0 32px ${rgba(accent,0.24)}, inset 0 1px 0 rgba(255,255,255,0.12)` }}>
        <div style={{ position: 'absolute', top: 0, left: '22%', right: '22%', height: 1,
          background: `linear-gradient(90deg, transparent, ${rgba(accent,0.75)}, transparent)` }} />
        {children}
      </div>
    </div>
  );
}
const BoltIcon = ({ c }) => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7"
    strokeLinejoin="round" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 8px ${rgba(c,0.8)})` }}>
    <path d="M13 2 L4 13.5 h6 l-1 8.5 9-12 h-6 z" fill={rgba(c,0.14)} />
  </svg>
);
const FocusIcon = ({ c }) => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6"
    strokeLinejoin="round" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 8px ${rgba(c,0.8)})` }}>
    <rect x="3" y="4.5" width="18" height="12" rx="2.4" fill={rgba(c,0.1)} />
    <path d="M9.5 20 h5 M12 16.5 V20" />
    <path d="M10.6 8 L14.4 10.5 L10.6 13 Z" fill={c} stroke="none" />
  </svg>
);
const ListIcon = ({ c }) => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7"
    strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 8px ${rgba(c,0.8)})` }}>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <path d="M4 6l1.2 1.8L7 5M4 12l1.2 1.8L7 10.5M4 18l1.2 1.8L7 16.5" />
  </svg>
);

// ─── VideoCard ────────────────────────────────────────────────────────────────
function VideoCard() {
  const [h, setH] = useState(false);
  const corners = [
    { top: '12px', left: '12px', rot: 0 },
    { top: '12px', right: '12px', rot: 90 },
    { bottom: '12px', right: '12px', rot: 180 },
    { bottom: '12px', left: '12px', rot: 270 },
  ];
  return (
    <div onPointerEnter={() => setH(true)} onPointerLeave={() => setH(false)}
      style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', borderRadius: 22, overflow: 'hidden',
        background: `linear-gradient(158deg, ${rgba(T.purple,0.16)}, ${rgba(T.blue,0.05)} 50%, rgba(255,255,255,0.015))`,
        border: `1px solid ${rgba(T.purple, h ? 0.6 : 0.4)}`, cursor: 'pointer',
        boxShadow: `0 18px 44px rgba(0,0,0,0.55), 0 0 ${h ? 52 : 38}px ${rgba(T.purple,0.22)}, inset 0 1px 0 rgba(255,255,255,0.08)`,
        transition: 'all 260ms ease' }}>
      {/* faint scanlines */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.5,
        backgroundImage: `repeating-linear-gradient(0deg, ${rgba(T.purple,0.08)} 0px, ${rgba(T.purple,0.08)} 1px, transparent 1px, transparent 7px)` }} />
      {/* travelling scan beam */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 60, pointerEvents: 'none',
        background: `linear-gradient(180deg, ${rgba(T.purple,0.28)}, transparent)`,
        animation: 'ob-beamScan 4.2s ease-in-out infinite' }} />
      {/* corner brackets */}
      {corners.map((pos, i) => (
        <svg key={i} width="15" height="15" viewBox="0 0 16 16"
          style={{ position: 'absolute', ...pos, transform: `rotate(${pos.rot}deg)`, opacity: 0.55 }}>
          <path d="M1 6 V1 H6" fill="none" stroke={rgba(T.purple,0.8)} strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      ))}
      {/* play button + pulse ring */}
      <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}>
        <div style={{ position: 'absolute', left: '50%', top: '50%',
          width: 64, height: 64, borderRadius: '50%',
          border: `1px solid ${rgba(T.purple,0.7)}`,
          animation: 'ob-ringPulse 2.4s ease-out infinite' }} />
        <div style={{ position: 'relative', width: 64, height: 64, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `radial-gradient(circle at 50% 35%, ${rgba(T.purple,0.5)}, ${rgba(T.purple,0.16)} 70%)`,
          border: `1px solid ${rgba(T.purple,0.7)}`,
          transform: h ? 'scale(1.06)' : 'scale(1)', transition: 'transform 220ms cubic-bezier(0.2,0.8,0.2,1)',
          boxShadow: `0 0 28px ${rgba(T.purple,0.5)}, inset 0 1px 0 rgba(255,255,255,0.18)` }}>
          <svg width="22" height="22" viewBox="0 0 24 24" style={{ marginLeft: 3, filter: 'drop-shadow(0 0 6px rgba(168,118,255,0.8))' }}>
            <path d="M8 5 L19 12 L8 19 Z" fill="#fff" />
          </svg>
        </div>
      </div>
      {/* now-playing equalizer + label */}
      <div style={{ position: 'absolute', left: 18, bottom: 16, display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2.5, height: 13 }}>
          {[0,1,2,3].map(i => (
            <span key={i} style={{ width: 2.5, height: 13, borderRadius: 2, background: T.purple,
              transformOrigin: 'bottom', boxShadow: `0 0 6px ${rgba(T.purple,0.7)}`,
              animation: `ob-eqBar ${0.7 + i * 0.18}s ease-in-out ${i * 0.12}s infinite` }} />
          ))}
        </div>
        <span style={{ fontFamily: T.mono, fontSize: 10.5, letterSpacing: '0.24em',
          color: rgba(T.purple,0.92), textTransform: 'uppercase' }}>Body Double</span>
      </div>
    </div>
  );
}

// ─── BreakRing ────────────────────────────────────────────────────────────────
function BreakRing({ accent = T.teal }) {
  const size = 152, r = 63, C = 2 * Math.PI * r, frac = 0.72;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <div style={{ position: 'absolute', inset: -24, borderRadius: '50%', pointerEvents: 'none',
        background: `radial-gradient(circle, ${rgba(accent,0.24)}, ${rgba(accent,0.06)} 48%, transparent 68%)`,
        animation: 'haloPulse 4s ease-in-out infinite' }} />
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'relative' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(140,200,255,0.08)" strokeWidth="6" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={accent} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - frac)}
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ filter: `drop-shadow(0 0 8px ${accent})` }} />
        {Array.from({ length: 60 }).map((_, i) => {
          const a = (i / 60) * Math.PI * 2;
          const ri = r - 14, ro = r - (i % 5 === 0 ? 20 : 17);
          return <line key={i}
            x1={size/2 + Math.cos(a)*ri} y1={size/2 + Math.sin(a)*ri}
            x2={size/2 + Math.cos(a)*ro} y2={size/2 + Math.sin(a)*ro}
            stroke={rgba(accent, i%5===0 ? 0.4 : 0.16)} strokeWidth={i%5===0 ? 1.2 : 0.7} />;
        })}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: T.display, fontSize: 34, fontWeight: 600, color: T.text, lineHeight: 1,
          fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
          textShadow: `0 0 24px ${rgba(accent,0.6)}` }}>05:00</div>
        <div style={{ fontFamily: T.mono, fontSize: 8, letterSpacing: '0.26em',
          color: T.text3, textTransform: 'uppercase', marginTop: 7 }}>Break</div>
      </div>
    </div>
  );
}

// ─── MiniChecklist ────────────────────────────────────────────────────────────
const CL_ROWS = [
  { t: 'Ship redesign to staging',    done: true  },
  { t: 'Reply to Asha about copy',    done: true  },
  { t: 'Review pull request #482',    done: false, n: '3' },
  { t: 'Renew TLS cert before Friday', done: false, n: '4' },
];
function MiniChecklist() {
  return (
    <div style={{ width: '100%', borderRadius: 18, padding: '14px 14px 13px',
      background: `linear-gradient(158deg, ${rgba(T.cyan,0.10)}, ${rgba(T.cyan,0.03)} 60%, rgba(255,255,255,0.015))`,
      border: `1px solid ${rgba(T.cyan,0.4)}`,
      boxShadow: `0 14px 34px rgba(0,0,0,0.5), 0 0 40px ${rgba(T.cyan,0.14)}, inset 0 1px 0 rgba(255,255,255,0.08)` }}>
      {/* folder header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: `linear-gradient(180deg, ${rgba(T.cyan,0.2)}, ${rgba(T.cyan,0.05)})`,
          border: `1px solid ${rgba(T.cyan,0.55)}`, boxShadow: `0 0 14px ${rgba(T.cyan,0.3)}` }}>
          <svg width="17" height="17" viewBox="0 0 24 24">
            <g stroke={T.cyan} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4.5" y="7.5" width="15" height="11" rx="1.5" />
              <path d="M9 7.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v1.5" />
              <path d="M4.5 12h15" />
            </g>
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: T.mono, fontSize: 8.5, letterSpacing: '0.2em',
            color: T.cyan, textTransform: 'uppercase', textShadow: `0 0 8px ${rgba(T.cyan,0.5)}` }}>RT-01 · Mission Ops</div>
          <div style={{ fontFamily: T.display, fontSize: 16, fontWeight: 600,
            color: T.text, letterSpacing: '-0.01em', lineHeight: 1.1 }}>Work</div>
        </div>
        <div style={{ fontFamily: T.mono, fontSize: 9.5, letterSpacing: '0.14em', color: T.text2,
          padding: '4px 9px', borderRadius: 99, whiteSpace: 'nowrap', flexShrink: 0,
          background: rgba(T.cyan,0.1), border: `1px solid ${rgba(T.cyan,0.32)}` }}>2 / 4</div>
      </div>
      {/* rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {CL_ROWS.map((row, i) => (
          <div key={i} className="ob-s" style={{ '--d': `${0.32 + i * 0.1}s`,
            display: 'flex', alignItems: 'center', gap: 11, padding: '9px 11px', borderRadius: 12,
            background: 'rgba(255,255,255,0.04)', border: `1px solid rgba(140,200,255,0.14)` }}>
            {row.done ? (
              <span style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: rgba(T.teal,0.18), border: `1px solid ${rgba(T.teal,0.6)}`,
                boxShadow: `0 0 10px ${rgba(T.teal,0.3)}` }}>
                <svg width="11" height="11" viewBox="0 0 12 12">
                  <path d="M1.5 6l2.6 2.6L10.5 2.5" stroke={T.teal} strokeWidth="1.8"
                    fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            ) : (
              <span style={{ minWidth: 22, height: 22, borderRadius: 7, flexShrink: 0,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: rgba(T.cyan,0.12), border: `1px solid ${rgba(T.cyan,0.5)}`,
                color: T.cyan, fontFamily: T.mono, fontSize: 10, fontWeight: 600 }}>{row.n}</span>
            )}
            <span style={{ flex: 1, minWidth: 0, fontFamily: T.display, fontSize: 13.5,
              color: row.done ? T.text3 : T.text, letterSpacing: '-0.005em',
              textDecoration: row.done ? 'line-through' : 'none',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── GoogleButton ─────────────────────────────────────────────────────────────
function GoogleButton({ onClick, busy }) {
  const [h, setH] = useState(false);
  const [press, setPress] = useState(false);
  return (
    <button onClick={onClick}
      onPointerEnter={() => setH(true)} onPointerLeave={() => { setH(false); setPress(false); }}
      onPointerDown={() => setPress(true)} onPointerUp={() => setPress(false)}
      disabled={busy}
      style={{ all: 'unset', cursor: busy ? 'wait' : 'pointer', width: '100%', height: 60, borderRadius: 18,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, boxSizing: 'border-box',
        background: h
          ? 'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(0,229,255,0.05) 70%, rgba(255,255,255,0.03))'
          : 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.025))',
        border: `1px solid ${h ? rgba(T.cyan,0.55) : 'rgba(140,200,255,0.14)'}`,
        boxShadow: h
          ? `0 0 0 4px rgba(0,229,255,0.10), 0 14px 30px rgba(0,0,0,0.5), 0 0 38px rgba(0,229,255,0.22), inset 0 1px 0 rgba(255,255,255,0.14)`
          : '0 10px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.10)',
        transform: press ? 'scale(0.975)' : 'scale(1)',
        transition: 'all 220ms cubic-bezier(0.2,0.8,0.2,1)',
        opacity: busy ? 0.65 : 1 }}>
      <span style={{ width: 26, height: 26, borderRadius: 99, background: '#fff',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/>
          <path fill="#FBBC05" d="M3.97 10.72A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3.01-2.33z"/>
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/>
        </svg>
      </span>
      <span style={{ fontFamily: T.display, fontSize: 16.5, fontWeight: 600,
        letterSpacing: '0.005em', color: T.text }}>
        {busy ? 'Redirecting…' : 'Continue with Google'}
      </span>
    </button>
  );
}

// ─── Navigation components ────────────────────────────────────────────────────
export function Arrow({ dir, disabled, onClick }) {
  const [h, setH] = useState(false);
  const side = dir === 'left' ? { left: 6 } : { right: 6 };
  return (
    <button onClick={onClick} disabled={disabled}
      onPointerEnter={() => setH(true)} onPointerLeave={() => setH(false)}
      aria-label={dir === 'left' ? 'Previous' : 'Next'}
      style={{ all: 'unset', position: 'absolute', top: '42%', ...side,
        transform: 'translateY(-50%)', zIndex: 60,
        width: 42, height: 42, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.22 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
        background: h ? 'rgba(0,229,255,0.10)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${h ? rgba(T.cyan,0.55) : 'rgba(140,200,255,0.14)'}`,
        boxShadow: h ? `0 0 26px ${rgba(T.cyan,0.3)}, inset 0 1px 0 rgba(255,255,255,0.12)` : 'inset 0 1px 0 rgba(255,255,255,0.06)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        transition: 'all 200ms ease' }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke={h ? T.cyan : T.text2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {dir === 'left'
          ? <path d="M15 5 L8 12 L15 19" />
          : <path d="M9 5 L16 12 L9 19" />}
      </svg>
    </button>
  );
}

function SkipButton({ onClick }) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick} onPointerEnter={() => setH(true)} onPointerLeave={() => setH(false)}
      aria-label="Skip onboarding"
      style={{ all: 'unset', position: 'absolute',
        top: 'calc(max(12px, env(safe-area-inset-top)) + 2px)',
        right: 18, zIndex: 80,
        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '7px 13px', borderRadius: 99, boxSizing: 'border-box',
        fontFamily: T.mono, fontSize: 10, letterSpacing: '0.22em',
        textTransform: 'uppercase', fontWeight: 500,
        color: h ? T.cyan : T.text3,
        background: h ? 'rgba(0,229,255,0.09)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${h ? rgba(T.cyan,0.5) : 'rgba(140,200,255,0.14)'}`,
        boxShadow: h ? `0 0 22px ${rgba(T.cyan,0.28)}, inset 0 1px 0 rgba(255,255,255,0.1)` : 'inset 0 1px 0 rgba(255,255,255,0.05)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        transition: 'all 200ms ease',
        WebkitTapHighlightColor: 'transparent' }}>
      Skip
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
        stroke={h ? T.cyan : T.text3} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 5 L13 12 L6 19" /><path d="M14 5 L21 12 L14 19" />
      </svg>
    </button>
  );
}

export function Dots({ n, index, accent, onJump }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
      {Array.from({ length: n }).map((_, i) => {
        const on = i === index;
        return (
          <button key={i} onClick={() => onJump(i)} aria-label={`Slide ${i + 1}`}
            style={{ all: 'unset', cursor: 'pointer', height: 7,
              width: on ? 24 : 7, borderRadius: 99,
              background: on ? accent : 'rgba(255,255,255,0.18)',
              boxShadow: on ? `0 0 12px ${rgba(accent,0.85)}` : 'none',
              transition: 'all 320ms cubic-bezier(0.2,0.8,0.2,1)',
              WebkitTapHighlightColor: 'transparent' }} />
        );
      })}
    </div>
  );
}

// ─── Slide 1: Brand ───────────────────────────────────────────────────────────
function SlideBrand() {
  return (
    <>
      <div style={{ paddingTop: 8 }}><Telemetry code="MC-01 / BRIEFING" state="WELCOME ABOARD" color={T.teal} /></div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '0 28px', minHeight: 0, textAlign: 'center' }}>
        <div className="ob-s" style={{ '--d': '0s' }}><RocketMark uid="brand" /></div>
        <h1 className="ob-s" style={{ '--d': '0.08s', fontFamily: T.display, fontSize: 64, fontWeight: 700,
          color: T.text, margin: '14px 0 0', letterSpacing: '-0.04em', lineHeight: 1,
          textShadow: '0 0 40px rgba(0,229,255,0.28)' }}>
          Help Me Start<span style={{ color: T.cyan, textShadow: '0 0 22px rgba(0,229,255,0.75)' }}>.</span>
        </h1>
        <div className="ob-s" style={{ '--d': '0.16s', fontFamily: T.mono, fontSize: 11.5, letterSpacing: '0.3em',
          color: T.purple, textTransform: 'uppercase', marginTop: 16, lineHeight: 1.7, textAlign: 'center',
          textShadow: `0 0 14px ${rgba(T.purple,0.6)}` }}>
          Beat your task initiation<br />problems for good
        </div>
      </div>
    </>
  );
}

// ─── Slide 2: Dopamine gap ────────────────────────────────────────────────────
function SlideBrandTwo() {
  return (
    <>
      <div style={{ paddingTop: 8 }}><Telemetry code="MC-01 / SCIENCE" state="UNDERSTANDING" color={T.purple} /></div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '0 30px', minHeight: 0, textAlign: 'center' }}>
        <div className="ob-s" style={{ '--d': '0s' }}><NeuraMark /></div>
        <h2 className="ob-s" style={{ '--d': '0.09s', fontFamily: T.display, fontSize: 30, fontWeight: 700,
          color: T.text, margin: '20px 0 0', letterSpacing: '-0.03em', lineHeight: 1.18 }}>
          You're not lazy.<br />
          <span style={{ color: T.purple, textShadow: `0 0 18px ${rgba(T.purple,0.7)}` }}>
            You have a dopamine gap.
          </span>
        </h2>
        <p className="ob-s" style={{ '--d': '0.2s', fontFamily: T.display, fontSize: 15.5, fontWeight: 400,
          color: T.text2, margin: '18px 0 0', lineHeight: 1.58, letterSpacing: '-0.005em', maxWidth: 340 }}>
          ADHD brains struggle to initiate tasks not from laziness, but because the dopamine needed to trigger
          action simply doesn't fire the way it does in neurotypical brains.
        </p>
      </div>
    </>
  );
}

// ─── Slide 3: AI steps ────────────────────────────────────────────────────────
const STEPS = [
  { n: '01', t: 'Open your inbox',              c: T.cyan   },
  { n: '02', t: 'Find the email',               c: T.blue   },
  { n: '03', t: 'Just read it',                 c: T.purple },
  { n: '04', t: "Type one sentence — you got this!", c: T.teal   },
];
function SlideSteps() {
  return (
    <>
      <div style={{ paddingTop: 8 }}><Telemetry code="MC-02 / BREAKDOWN" state="GUIDED" color={T.cyan} /></div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '0 24px', minHeight: 0 }}>
        <div className="ob-s" style={{ '--d': '0s' }}><IconTile accent={T.cyan}><BoltIcon c={T.cyan} /></IconTile></div>
        <h2 className="ob-s" style={{ '--d': '0.08s', fontFamily: T.display, fontSize: 30, fontWeight: 700,
          color: T.text, margin: '22px 0 0', letterSpacing: '-0.025em', textAlign: 'center' }}>
          AI breaks it into steps
        </h2>
        <p className="ob-s" style={{ '--d': '0.15s', fontFamily: T.display, fontSize: 16, color: T.text2,
          margin: '12px 0 0', lineHeight: 1.45, textAlign: 'center', maxWidth: 320 }}>
          Smaller steps need less dopamine to start.
        </p>
        {/* mock mission input */}
        <div className="ob-s" style={{ '--d': '0.24s', width: '100%', maxWidth: 312, marginTop: 18,
          borderRadius: 18, padding: '12px 15px',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.09), rgba(0,229,255,0.035) 65%, rgba(255,255,255,0.02))',
          border: `1px solid ${rgba(T.cyan,0.5)}`,
          boxShadow: `0 0 0 4px ${rgba(T.cyan,0.10)}, 0 0 40px ${rgba(T.cyan,0.16)}, inset 0 1px 0 rgba(255,255,255,0.1)` }}>
          <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.24em',
            color: T.text3, textTransform: 'uppercase', marginBottom: 6 }}>Mission</div>
          <div style={{ fontFamily: T.display, fontSize: 15.5, fontWeight: 500, color: T.text,
            letterSpacing: '-0.01em', lineHeight: 1.35, whiteSpace: 'nowrap', overflow: 'hidden' }}>
            That email I've been avoiding
            <span style={{ display: 'inline-block', width: 2, height: '1.05em', verticalAlign: '-0.16em',
              marginLeft: 4, background: T.cyan, boxShadow: `0 0 8px ${T.cyan}`,
              animation: 'ob-caret 1.1s step-end infinite' }} />
          </div>
        </div>
        {/* generated steps */}
        <div style={{ width: '100%', maxWidth: 312, marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {STEPS.map((s, i) => (
            <div key={s.n} className="ob-s" style={{ '--d': `${0.42 + i * 0.11}s`,
              display: 'flex', alignItems: 'center', gap: 13, padding: '11px 14px', borderRadius: 14,
              background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
              border: `1px solid rgba(140,200,255,0.14)`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
              <span style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 600, color: s.c,
                letterSpacing: '0.08em', flexShrink: 0, textShadow: `0 0 10px ${rgba(s.c,0.6)}` }}>{s.n}</span>
              <span style={{ fontFamily: T.display, fontSize: 14.5, fontWeight: 500, color: T.text2 }}>{s.t}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Slide 4: Work With Me ────────────────────────────────────────────────────
function SlideFocus() {
  return (
    <>
      <div style={{ paddingTop: 8 }}><Telemetry code="MC-03 / FOCUS" state="BODY DOUBLE" color={T.purple} /></div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '0 clamp(16px, 5vw, 48px)', minHeight: 0, gap: 0 }}>
        <div className="ob-s" style={{ '--d': '0s' }}><IconTile accent={T.purple}><FocusIcon c={T.purple} /></IconTile></div>
        <h2 className="ob-s" style={{ '--d': '0.08s', fontFamily: T.display,
          fontSize: 'clamp(22px, 3.5vw, 30px)', fontWeight: 700,
          color: T.text, margin: 'clamp(12px, 2.5vh, 22px) 0 0', letterSpacing: '-0.025em', textAlign: 'center' }}>
          Body double with a focus partner
        </h2>
        <p className="ob-s" style={{ '--d': '0.15s', fontFamily: T.display,
          fontSize: 'clamp(14px, 1.8vw, 16px)', color: T.text2,
          margin: 'clamp(8px, 1.5vh, 12px) 0 0', lineHeight: 1.45, textAlign: 'center', maxWidth: 320 }}>
          AI picks a "Body Double" video matched to your task — virtual body doubling that actually helps you start tasks and keep going.
        </p>
        {/* VideoCard: capped at 520px wide so it never gets taller than ~295px */}
        <div className="ob-s" style={{ '--d': '0.26s',
          width: '100%', maxWidth: 520,
          marginTop: 'clamp(14px, 2.5vh, 28px)' }}>
          <VideoCard />
        </div>
      </div>
    </>
  );
}

// ─── Slide 5: Breaks ──────────────────────────────────────────────────────────
function SlideBreak() {
  return (
    <>
      <div style={{ paddingTop: 8 }}><Telemetry code="BRK-01 / BREAK" state="STANDBY" color={T.teal} /></div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '0 28px', minHeight: 0, textAlign: 'center' }}>
        <div className="ob-s ob-ring-glow" style={{ '--d': '0s' }}><BreakRing accent={T.teal} /></div>
        <h2 className="ob-s" style={{ '--d': '0.1s', fontFamily: T.display, fontSize: 28, fontWeight: 700,
          color: T.text, margin: '26px 0 0', letterSpacing: '-0.025em', maxWidth: 300 }}>
          Transition from breaks
        </h2>
        <p className="ob-s" style={{ '--d': '0.18s', fontFamily: T.display, fontSize: 15.5, color: T.text2,
          margin: '14px 0 0', lineHeight: 1.55, maxWidth: 300 }}>
          ADHD brains have trouble getting back into tasks after a break. 'Help me start' helps you transition back in.
        </p>
      </div>
    </>
  );
}

// ─── Slide 6: Checklists ──────────────────────────────────────────────────────
function SlideChecklist() {
  return (
    <>
      <div style={{ paddingTop: 8 }}><Telemetry code="MC-04 / CHECKLISTS" state="ORGANIZED" color={T.cyan} /></div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '0 clamp(16px, 5vw, 48px)', minHeight: 0 }}>
        <div className="ob-s" style={{ '--d': '0s' }}><IconTile accent={T.cyan}><ListIcon c={T.cyan} /></IconTile></div>
        <h2 className="ob-s" style={{ '--d': '0.08s', fontFamily: T.display,
          fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 700,
          color: T.text, margin: 'clamp(14px, 2.5vh, 20px) 0 0', letterSpacing: '-0.025em', textAlign: 'center',
          lineHeight: 1.18, maxWidth: 300 }}>
          Store all your tasks in one place
        </h2>
        {/* Checklist: max 480px so it reads as a card, not a full-width spreadsheet */}
        <div className="ob-s" style={{ '--d': '0.2s',
          width: '100%', maxWidth: 480,
          marginTop: 'clamp(14px, 2.5vh, 22px)', boxSizing: 'border-box' }}>
          <MiniChecklist />
        </div>
      </div>
    </>
  );
}

// ─── Slide 7: Last call ───────────────────────────────────────────────────────
function SlideLastCall() {
  return (
    <>
      <div style={{ paddingTop: 8 }}><Telemetry code="MC-05 / FRICTION" state="LAUNCH READY" color={T.blue} /></div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '0 30px', minHeight: 0, textAlign: 'center' }}>
        <div className="ob-s" style={{ '--d': '0s' }}><FrictionSparkMark /></div>
        <h2 className="ob-s" style={{ '--d': '0.1s', fontFamily: T.display, fontSize: 29, fontWeight: 700,
          color: T.text, margin: '22px 0 0', letterSpacing: '-0.03em', lineHeight: 1.2, maxWidth: 310 }}>
          Every time you feel mental friction...
        </h2>
        <div className="ob-s" style={{ '--d': '0.26s', marginTop: 18, display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            style={{ filter: `drop-shadow(0 0 8px ${rgba(T.cyan,0.9)})`, flexShrink: 0 }}>
            <path d="M13 2 L4 13.5 h6 l-1 8.5 9-12 h-6 z" fill={T.cyan} strokeLinejoin="round" />
          </svg>
          <span style={{ fontFamily: T.display, fontSize: 22, fontWeight: 700, color: T.cyan,
            letterSpacing: '-0.025em', textShadow: `0 0 28px ${rgba(T.cyan,0.9)}` }}>
            Launch this app
          </span>
        </div>
      </div>
    </>
  );
}

// ─── Slide 8: Sign in ─────────────────────────────────────────────────────────
function SlideLaunch({ onGoogle, signingIn, isLoaded }) {
  return (
    <>
      <div style={{ paddingTop: 8 }}><Telemetry code="MC-00 / PREFLIGHT" state="STANDBY" color={T.teal} /></div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '0 clamp(16px, 5vw, 48px)', minHeight: 0, textAlign: 'center' }}>
        <div className="ob-s" style={{ '--d': '0s' }}><RocketMark uid="launch" /></div>
        <h2 className="ob-s" style={{ '--d': '0.08s', fontFamily: T.display,
          fontSize: 'clamp(26px, 3.5vw, 34px)', fontWeight: 700,
          color: T.text, margin: 'clamp(12px, 2.5vh, 18px) 0 0', letterSpacing: '-0.03em',
          textShadow: '0 0 36px rgba(0,229,255,0.22)' }}>
          Ready to stop procrastinating<span style={{ color: T.cyan, textShadow: '0 0 18px rgba(0,229,255,0.7)' }}>?</span>
        </h2>
        <p className="ob-s" style={{ '--d': '0.15s', fontFamily: T.display,
          fontSize: 'clamp(14px, 1.8vw, 16.5px)', color: T.text2,
          margin: 'clamp(10px, 1.8vh, 14px) 0 0', lineHeight: 1.45, maxWidth: 300 }}>
          Beat your ADHD task paralysis with 'Help me start'.
        </p>
        {/* Button + lock line capped at 440px so it never stretches across a wide screen */}
        <div className="ob-s" style={{ '--d': '0.26s',
          width: '100%', maxWidth: 440,
          marginTop: 'clamp(20px, 3.5vh, 32px)' }}>
          <GoogleButton onClick={onGoogle} busy={!isLoaded || signingIn} />
        </div>
        <div className="ob-s" style={{ '--d': '0.34s', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 8, marginTop: 'clamp(10px, 1.8vh, 16px)',
          fontFamily: T.mono, fontSize: 9.5, letterSpacing: '0.2em', color: T.text3, textTransform: 'uppercase' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
            stroke={T.teal} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ filter: `drop-shadow(0 0 4px ${rgba(T.teal,0.7)})` }}>
            <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          Encrypted handshake · OAuth 2.0
        </div>
        {signingIn && (
          <div style={{ position: 'absolute', bottom: 26, left: '50%', transform: 'translateX(-50%)',
            padding: '10px 16px', borderRadius: 99, background: 'rgba(11,16,24,0.94)',
            border: `1px solid ${rgba(T.cyan,0.4)}`, color: T.cyan,
            fontFamily: T.mono, fontSize: 10.5, letterSpacing: '0.22em', textTransform: 'uppercase',
            boxShadow: `0 12px 32px rgba(0,0,0,0.55), 0 0 24px ${rgba(T.cyan,0.3)}`,
            zIndex: 150, whiteSpace: 'nowrap' }}>
            ▸ Authorizing · Booting mission control
          </div>
        )}
      </div>
    </>
  );
}

// ─── Slide registry ───────────────────────────────────────────────────────────
// SlideLaunch is last — it receives auth props; all others are plain components
export const PLAIN_SLIDES = [SlideBrand, SlideBrandTwo, SlideSteps, SlideFocus, SlideBreak, SlideChecklist, SlideLastCall];
const N = PLAIN_SLIDES.length + 1; // +1 for SlideLaunch

// ─── Main Onboarding component ────────────────────────────────────────────────
export function Onboarding({ onDone }) {
  const { signIn, isLoaded } = useSignIn();
  const [index, setIndex] = useState(0);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState(null);
  const drag = useRef(null);

  // Inject + clean up onboarding-specific CSS
  useEffect(() => {
    const el = document.createElement('style');
    el.id = 'ob-css';
    el.textContent = OB_CSS;
    document.head.appendChild(el);
    return () => el.remove();
  }, []);

  const go   = useCallback(i => setIndex(Math.min(N - 1, Math.max(0, i))), []);
  const next = useCallback(() => setIndex(i => Math.min(N - 1, i + 1)), []);
  const prev = useCallback(() => setIndex(i => Math.max(0, i - 1)), []);

  // Keyboard navigation
  useEffect(() => {
    const h = e => { if (e.key === 'ArrowRight') next(); else if (e.key === 'ArrowLeft') prev(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [next, prev]);

  // Pointer swipe
  const onDown = e => { drag.current = { x: e.clientX }; };
  const onUp   = e => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    if (Math.abs(dx) > 44) { dx < 0 ? next() : prev(); }
    drag.current = null;
  };

  const skip = () => {
    try { localStorage.setItem(ONBOARDING_KEY, '1'); } catch {}
    onDone();
  };

  const handleGoogle = async () => {
    if (!isLoaded || signingIn) return;
    setSigningIn(true);
    setError(null);
    try { localStorage.setItem(ONBOARDING_KEY, '1'); } catch {}
    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: `${window.location.origin}/sso-callback`,
        redirectUrlComplete: window.location.origin,
      });
    } catch {
      setError('Something went wrong. Please try again.');
      setSigningIn(false);
    }
  };

  const accent = ACCENTS[index];

  return (
    <div style={{ position: 'fixed', inset: 0, background: T.bg, overflow: 'hidden', fontFamily: T.display }}
      onPointerDown={onDown} onPointerUp={onUp}>

      {/* ambient glow washes */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `
        radial-gradient(ellipse 600px 420px at 50% 0%,   rgba(0,229,255,0.11),  transparent 70%),
        radial-gradient(ellipse 520px 600px at 100% 100%, rgba(168,118,255,0.09), transparent 70%),
        radial-gradient(ellipse 400px 320px at 0%   82%,  rgba(61,127,255,0.07),  transparent 70%)` }} />

      {/* twinkling starfield */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {STARS.map((s, i) => (
          <span key={i} style={{ position: 'absolute', left: `${s.left}%`, top: `${s.top}%`,
            width: s.size, height: s.size, borderRadius: 99,
            background: s.cyan ? T.cyan : '#fff',
            boxShadow: `0 0 ${s.size * 3.2}px ${s.cyan ? rgba(T.cyan,0.7) : 'rgba(255,255,255,0.55)'}`,
            opacity: 0.4, animation: `twinkle ${s.dur}s ease-in-out ${s.delay}s infinite` }} />
        ))}
      </div>

      {/* base static grid */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.5,
        backgroundImage: `linear-gradient(rgba(140,200,255,0.04) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(140,200,255,0.04) 1px, transparent 1px)`,
        backgroundSize: '32px 32px',
        maskImage: 'radial-gradient(ellipse at 50% 30%, black 28%, transparent 78%)',
        WebkitMaskImage: 'radial-gradient(ellipse at 50% 30%, black 28%, transparent 78%)' }} />

      {/* reactive accent grid — shifts colour with active slide */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', animation: 'gridGlow 4.6s ease-in-out infinite' }}>
        <div style={{ position: 'absolute', inset: 0,
          backgroundImage: `linear-gradient(${rgba(accent,0.06)} 1px, transparent 1px),
                            linear-gradient(90deg, ${rgba(accent,0.06)} 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
          maskImage: 'radial-gradient(circle at 50% 36%, black 0%, rgba(0,0,0,0.5) 26%, transparent 56%)',
          WebkitMaskImage: 'radial-gradient(circle at 50% 36%, black 0%, rgba(0,0,0,0.5) 26%, transparent 56%)',
          transition: 'background-image 500ms ease' }} />
      </div>

      {/* horizontal scanline */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, pointerEvents: 'none',
        background: 'linear-gradient(90deg, transparent, rgba(0,229,255,0.5), transparent)',
        animation: 'ob-scanY 7s linear infinite', zIndex: 1 }} />

      {/* safe-area top pad */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5,
        height: 'max(12px, env(safe-area-inset-top))' }} />

      {/* ── slide track ── */}
      <div style={{ position: 'absolute', inset: 0, paddingTop: 'max(12px, env(safe-area-inset-top))',
        paddingBottom: 'max(64px, calc(env(safe-area-inset-bottom) + 56px))', boxSizing: 'border-box',
        overflow: 'hidden', zIndex: 2 }}>
        <div style={{ display: 'flex', height: '100%', width: `${N * 100}%`,
          transform: `translateX(-${index * (100 / N)}%)`,
          transition: 'transform 480ms cubic-bezier(0.2,0.8,0.2,1)' }}>
          {PLAIN_SLIDES.map((S, i) => (
            <div key={i} className={`ob-slide${i === index ? ' ob-active' : ''}`}
              style={{ width: `${100 / N}%`, height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
              <S />
            </div>
          ))}
          {/* last slide — sign in */}
          <div className={`ob-slide${index === N - 1 ? ' ob-active' : ''}`}
            style={{ width: `${100 / N}%`, height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <SlideLaunch onGoogle={handleGoogle} signingIn={signingIn} isLoaded={isLoaded} />
            {error && (
              <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, textAlign: 'center',
                fontFamily: T.mono, fontSize: 12, color: '#ff6b6b', padding: '0 24px' }}>{error}</div>
            )}
          </div>
        </div>
      </div>

      {/* flanking arrows */}
      <Arrow dir="left"  disabled={index === 0}     onClick={prev} />
      <Arrow dir="right" disabled={index === N - 1}  onClick={next} />

      {/* skip (hidden on last slide) */}
      {index < N - 1 && <SkipButton onClick={skip} />}

      {/* progress dots */}
      <div style={{ position: 'absolute', bottom: 'max(20px, calc(env(safe-area-inset-bottom) + 14px))',
        left: 0, right: 0, zIndex: 20 }}>
        <Dots n={N} index={index} accent={accent} onJump={go} />
      </div>
    </div>
  );
}
