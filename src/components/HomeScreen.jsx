import { useState, useEffect, useRef } from 'react';
import { T } from '../tokens.js';
import { Telemetry } from './Telemetry.jsx';

const DEFAULT_FOLDERS = [
  { id: 'work',     name: 'Work',     accent: T.cyan,   iconKey: 'work' },
  { id: 'personal', name: 'Personal', accent: T.purple, iconKey: 'personal' },
  { id: 'health',   name: 'Health',   accent: T.teal,   iconKey: 'health' },
];

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Flatten the queue into a priority-ordered list. Folders contribute their
// children in the order they appear inside the folder; loose items appear
// at their top-level position. Empty/invalid items are dropped.
function flattenQueue(items) {
  const out = [];
  if (!Array.isArray(items)) return out;
  for (const item of items) {
    if (!item) continue;
    if (item.type === 'folder') {
      for (const child of (item.children || [])) {
        if (child && typeof child.text === 'string' && child.text.trim()) {
          out.push(child);
        }
      }
    } else if (typeof item.text === 'string' && item.text.trim()) {
      out.push(item);
    }
  }
  return out;
}

function CategoryIcon({ iconKey, color }) {
  if (iconKey === 'work') return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
      <rect x="1.5" y="4.5" width="9" height="6" rx="1.2" stroke={color} strokeWidth="1.2"/>
      <path d="M4 4.5V3.5a2 2 0 0 1 4 0v1" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
  if (iconKey === 'personal') return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="6" cy="4" r="2" stroke={color} strokeWidth="1.2"/>
      <path d="M1.5 11c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
  if (iconKey === 'health') return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
      <path d="M6 9.5C4 8 1.5 6.5 1.5 4.5A2.2 2.2 0 0 1 6 3.2 2.2 2.2 0 0 1 10.5 4.5C10.5 6.5 8 8 6 9.5z" stroke={color} strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  );
  // dailies = sun
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="6" cy="6" r="2" stroke={color} strokeWidth="1.2"/>
      <path d="M6 1v1.2M6 9.8V11M1 6h1.2M9.8 6H11M2.4 2.4l.85.85M8.75 8.75l.85.85M9.6 2.4l-.85.85M3.25 8.75l-.85.85" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function MissionField({ mission, setMission, inputFocused, setInputFocused }) {
  const [listening, setListening] = useState(false);
  const missionInputRef = useRef(null);

  useEffect(() => {
    const el = missionInputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const scrollH = el.scrollHeight;
    const lineH = parseFloat(getComputedStyle(el).lineHeight) || 22;
    el.style.height = (scrollH > lineH + 4 ? scrollH : lineH) + 'px';
  }, [mission]);

  const hot = inputFocused || mission.length > 0;
  const borderColor = hot ? 'rgba(0,229,255,0.65)' : T.hairline;

  return (
    <div style={{ padding: '36px 24px 0', position: 'relative' }}>
      <div style={{
        fontFamily: T.display, fontSize: 15, fontWeight: 500,
        color: T.text3, letterSpacing: '0.01em', marginBottom: 8,
      }}>
        Getting started is hard...
      </div>
      <h1 style={{
        fontFamily: T.display, fontSize: 42, fontWeight: 700,
        color: T.text, margin: '0 0 22px',
        letterSpacing: '-0.03em', lineHeight: 0.98,
        textShadow: hot ? '0 0 30px rgba(0,229,255,0.28)' : 'none',
        transition: 'text-shadow 400ms',
      }}>
        Help me<br />start<span style={{ color: T.cyan, textShadow: '0 0 18px rgba(0,229,255,0.7)' }}>.</span>
      </h1>

      <div style={{
        position: 'relative',
        background: hot
          ? `linear-gradient(180deg, rgba(255,255,255,0.10), rgba(0,229,255,0.04) 60%, rgba(255,255,255,0.02))`
          : 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
        border: `1px solid ${borderColor}`,
        borderRadius: 18, padding: '14px 12px 14px 18px',
        display: 'flex', alignItems: 'center', gap: 10,
        transition: 'all 300ms ease',
        boxShadow: hot
          ? `0 0 0 4px rgba(0,229,255,0.14),
             0 0 50px rgba(0,229,255,0.22),
             0 0 100px rgba(61,127,255,0.12),
             inset 0 0 40px rgba(0,229,255,0.06),
             inset 0 1px 0 rgba(255,255,255,0.12)`
          : 'inset 0 1px 0 rgba(255,255,255,0.05), 0 0 20px rgba(0,229,255,0.04)',
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: 99,
          background: hot ? T.cyan : T.text3,
          boxShadow: hot ? `0 0 10px ${T.cyan}` : 'none',
          flexShrink: 0,
          animation: hot ? 'pulse 1.6s ease-in-out infinite' : 'none',
        }} />
        <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
          <textarea
            ref={missionInputRef}
            value={mission}
            onChange={e => setMission(e.target.value)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
            placeholder="Enter your mission"
            rows={1}
            style={{
              width: '100%', background: 'transparent', border: 'none', outline: 'none',
              fontFamily: T.display, fontSize: 17, fontWeight: 500,
              color: T.text, letterSpacing: '-0.005em', padding: 0,
              minWidth: 0, display: 'block',
              resize: 'none', overflow: 'hidden',
              lineHeight: '1.3',
            }}
          />
        </div>
        <button
          aria-label="Voice input"
          onClick={() => setListening(l => !l)}
          style={{
            all: 'unset', cursor: 'pointer',
            width: 34, height: 34, borderRadius: 99,
            background: listening
              ? `linear-gradient(180deg, ${T.teal}, ${T.cyan})`
              : 'rgba(255,255,255,0.05)',
            border: `1px solid ${listening ? 'transparent' : T.hairlineSoft}`,
            color: listening ? '#001018' : T.text2,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 240ms ease',
            boxShadow: listening ? `0 0 16px ${T.teal}99` : 'none',
            flexShrink: 0,
          }}>
          <svg width="14" height="14" viewBox="0 0 14 14">
            <path d="M7 1.8a1.9 1.9 0 0 0-1.9 1.9v3.2a1.9 1.9 0 1 0 3.8 0V3.7A1.9 1.9 0 0 0 7 1.8z" fill="currentColor"/>
            <path d="M3.5 7a3.5 3.5 0 0 0 7 0M7 10.5V12.4M5 12.4h4" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

function AssistPills({ onAction, historyDisabled, generateEmpty, activeCat, onCategoryTap }) {
  const accent = activeCat?.accent || T.cyan;
  const stdPills = [
    { id: 'generate', icon: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
        <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ), dimmed: !!generateEmpty },
    { id: 'history', icon: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
        <path d="M7.5 2.5L4 6L7.5 9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ), disabled: !!historyDisabled },
  ];
  return (
    <div className="assist-pills-scroll" style={{
      paddingTop: 10,
      position: 'relative', zIndex: 2,
      overflowX: 'auto',
      WebkitOverflowScrolling: 'touch',
      scrollbarWidth: 'none',
    }}>
      <div style={{
        display: 'flex', gap: 8,
        width: 'max-content',
        margin: '0 auto',
        padding: '0 24px',
      }}>
        {/* Category cycling pill */}
        <button
          onClick={onCategoryTap}
          style={{
            all: 'unset', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 99,
            background: hexToRgba(accent, 0.12),
            border: `1px solid ${hexToRgba(accent, 0.45)}`,
            fontFamily: T.display, fontSize: 11.5, fontWeight: 500,
            color: accent, letterSpacing: '0.005em', whiteSpace: 'nowrap',
            boxShadow: `0 0 10px ${hexToRgba(accent, 0.18)}`,
            transition: 'all 200ms ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = hexToRgba(accent, 0.22);
            e.currentTarget.style.boxShadow = `0 0 18px ${hexToRgba(accent, 0.38)}`;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = hexToRgba(accent, 0.12);
            e.currentTarget.style.boxShadow = `0 0 10px ${hexToRgba(accent, 0.18)}`;
          }}
        >
          <CategoryIcon iconKey={activeCat?.iconKey || 'work'} color={accent} />
          {activeCat?.name || 'Work'}
        </button>

        {/* Generate & History pills */}
        {stdPills.map(p => (
          <button
            key={p.id}
            onClick={() => { if (!p.disabled) onAction(p.id); }}
            disabled={p.disabled}
            aria-disabled={p.disabled || p.dimmed || undefined}
            style={{
              all: 'unset',
              cursor: p.disabled ? 'not-allowed' : 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 99,
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${T.hairlineSoft}`,
              fontFamily: T.display, fontSize: 11.5, fontWeight: 500,
              color: (p.disabled || p.dimmed) ? T.text3 : T.text2, letterSpacing: '0.005em',
              whiteSpace: 'nowrap',
              opacity: (p.disabled || p.dimmed) ? 0.42 : 1,
              transition: 'all 200ms ease',
            }}
            onMouseEnter={e => {
              if (p.disabled) return;
              e.currentTarget.style.background = 'rgba(0,229,255,0.08)';
              e.currentTarget.style.borderColor = 'rgba(0,229,255,0.45)';
              e.currentTarget.style.color = T.text;
              e.currentTarget.style.boxShadow = '0 0 14px rgba(0,229,255,0.18)';
            }}
            onMouseLeave={e => {
              if (p.disabled) return;
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              e.currentTarget.style.borderColor = T.hairlineSoft;
              e.currentTarget.style.color = T.text2;
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {p.icon}
          </button>
        ))}
      </div>
    </div>
  );
}

function EnergyBeam({ energy, state }) {
  const armed = state === 'armed';
  const warming = state === 'warming';
  const active = armed || warming;
  const flowSpeed = armed ? 1.0 : warming ? 1.6 : 2.4;

  return (
    <div style={{
      position: 'absolute',
      left: '50%', top: 0, height: 130,
      width: 3, transform: 'translateX(-50%)',
      pointerEvents: 'none', zIndex: 0,
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(180deg,
          transparent 0%,
          rgba(0,229,255,${0.18 + energy * 0.55}) 18%,
          rgba(0,229,255,${0.10 + energy * 0.40}) 82%,
          transparent 100%)`,
        boxShadow: active
          ? `0 0 ${6 + energy * 22}px rgba(0,229,255,${0.30 + energy * 0.45}), 0 0 ${12 + energy * 30}px rgba(61,127,255,${energy * 0.25})`
          : 'none',
        opacity: 0.25 + energy * 0.75,
        animation: armed ? 'beamShimmer 1.6s ease-in-out infinite' : 'none',
        transition: 'opacity 500ms ease, box-shadow 500ms ease',
        borderRadius: 99,
      }} />
      {active && [0, 1, 2].map(i => (
        <div key={i} style={{
          position: 'absolute',
          left: '50%', transform: 'translateX(-50%)',
          width: armed ? 7 : 5, height: armed ? 7 : 5, borderRadius: 99,
          background: T.cyan,
          boxShadow: `0 0 10px ${T.cyan}, 0 0 20px rgba(0,229,255,0.6), 0 0 30px rgba(61,127,255,0.3)`,
          animation: `beamFlow ${flowSpeed}s linear ${i * (flowSpeed / 3)}s infinite`,
        }} />
      ))}
    </div>
  );
}

function describeArc(r, startDeg, endDeg) {
  const startRad = (startDeg - 90) * Math.PI / 180;
  const endRad = (endDeg - 90) * Math.PI / 180;
  const x1 = Math.cos(startRad) * r, y1 = Math.sin(startRad) * r;
  const x2 = Math.cos(endRad) * r,   y2 = Math.sin(endRad) * r;
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

function ReactorCore({ state, intensity, onLaunch }) {
  const [pressing, setPressing] = useState(false);
  const armed = state === 'armed';
  const warming = state === 'warming';
  const idle = state === 'idle';

  const speed1 = idle ? 60 : warming ? 42 : 28;
  const speed2 = idle ? 36 : warming ? 24 : 16;
  const speed3 = idle ? 20 : warming ? 14 : 10;

  const glow = 0.25 + intensity * 0.75;

  const stateLabel = armed ? 'MISSION LOCKED' : warming ? 'CHARGING' : 'STANDBY';
  const stateColor = armed ? T.cyan : warming ? T.teal : T.text3;
  const caption = idle ? 'Enter a mission' : armed ? 'Tap to launch' : 'Building energy';

  const ring2Particles = idle ? 1 : warming ? 2 : 3;
  const ring3Particles = idle ? 1 : warming ? 2 : 4;

  const handleDown = () => !idle && setPressing(true);
  const handleUp = () => setPressing(false);
  const handleClick = () => {
    if (idle) return;
    onLaunch && onLaunch();
  };

  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', padding: '8px 0', minHeight: 320,
    }}>
      <div style={{
        position: 'absolute', width: 460, height: 460, borderRadius: '50%',
        background: `radial-gradient(circle,
          rgba(0,229,255,${0.22 * glow}) 0%,
          rgba(61,127,255,${0.10 * glow}) 30%,
          rgba(168,118,255,${0.06 * glow}) 55%,
          transparent 75%)`,
        animation: armed ? 'haloPulse 2.6s ease-in-out infinite' : 'haloPulse 4.5s ease-in-out infinite',
        pointerEvents: 'none',
        transition: 'opacity 600ms ease',
      }} />

      <div style={{
        position: 'absolute', width: 320, height: 320, borderRadius: '50%',
        background: `radial-gradient(circle, rgba(168,118,255,${0.18 * glow}), transparent 70%)`,
        filter: 'blur(8px)',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'relative', width: 340, height: 340,
        animation: armed ? 'reactorBreatheArmed 2.6s ease-in-out infinite' : 'reactorBreathe 4.2s ease-in-out infinite',
        transform: pressing ? 'scale(0.96)' : 'scale(1)',
        transition: 'transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1)',
      }}>
        <svg width="340" height="340" viewBox="-170 -170 340 340" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="rxRingGrad" x1="0" y1="-1" x2="0" y2="1">
              <stop offset="0%" stopColor={T.cyan} stopOpacity="0.9" />
              <stop offset="50%" stopColor={T.blue} stopOpacity="0.5" />
              <stop offset="100%" stopColor={T.purple} stopOpacity="0.7" />
            </linearGradient>
            <linearGradient id="rxRingGradFaint" x1="0" y1="-1" x2="0" y2="1">
              <stop offset="0%" stopColor={T.cyan} stopOpacity="0.45" />
              <stop offset="100%" stopColor={T.purple} stopOpacity="0.35" />
            </linearGradient>
            <radialGradient id="rxCoreGrad" cx="0.5" cy="0.42" r="0.65">
              <stop offset="0%"  stopColor={T.cyan} stopOpacity={armed ? 0.85 : warming ? 0.50 : 0.20} />
              <stop offset="35%" stopColor={T.blue} stopOpacity={armed ? 0.45 : warming ? 0.25 : 0.10} />
              <stop offset="100%" stopColor="#030610" stopOpacity="0.98" />
            </radialGradient>
            <radialGradient id="rxCoreSpec" cx="0.5" cy="0.22" r="0.50">
              <stop offset="0%"   stopColor="rgba(255,255,255,0.55)" />
              <stop offset="55%"  stopColor="rgba(255,255,255,0.06)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
            <radialGradient id="rxCoreBottomShadow" cx="0.5" cy="0.92" r="0.50">
              <stop offset="0%"   stopColor="rgba(0,0,0,0.55)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </radialGradient>
            <filter id="rxGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          <g style={{ animation: `spinR ${speed1}s linear infinite`, transformOrigin: 'center', transformBox: 'fill-box' }}>
            <circle r="160" fill="none"
                    stroke={`rgba(140,200,255,${0.22 + glow * 0.15})`}
                    strokeWidth="0.6"
                    strokeDasharray="2 8"/>
            {Array.from({ length: 12 }).map((_, i) => {
              const a = (i / 12) * Math.PI * 2;
              const cosA = Math.cos(a), sinA = Math.sin(a);
              const r1 = 155, r2 = 165;
              return <line key={i}
                x1={cosA * r1} y1={sinA * r1}
                x2={cosA * r2} y2={sinA * r2}
                stroke={i % 3 === 0 ? T.cyan : `rgba(140,200,255,${0.4 + glow * 0.3})`}
                strokeWidth={i % 3 === 0 ? 1.2 : 0.7}
                opacity={i % 3 === 0 ? 0.9 : 0.55}/>;
            })}
          </g>

          <g style={{ animation: `spinL ${speed2}s linear infinite`, transformOrigin: 'center', transformBox: 'fill-box' }}>
            <circle r="132" fill="none"
                    stroke="url(#rxRingGrad)"
                    strokeWidth="1"
                    opacity={0.5 + glow * 0.4}
                    style={{ filter: `drop-shadow(0 0 4px ${T.cyan}${Math.round(glow * 90).toString(16).padStart(2, '0')})` }}/>
            <path
              d={describeArc(132, 0, armed ? 70 : warming ? 45 : 20)}
              fill="none"
              stroke={T.cyan}
              strokeWidth="1.8"
              strokeLinecap="round"
              opacity={0.4 + glow * 0.6}
              style={{ filter: `drop-shadow(0 0 6px ${T.cyan})` }}/>
            {Array.from({ length: ring2Particles }).map((_, i) => {
              const angle = (i / Math.max(1, ring2Particles)) * Math.PI * 2;
              return <circle key={i}
                cx={Math.cos(angle) * 132}
                cy={Math.sin(angle) * 132}
                r={2.5 + glow * 1.5}
                fill={i % 2 ? T.cyan : T.blue}
                opacity={0.7 + glow * 0.3}
                filter="url(#rxGlow)"/>;
            })}
          </g>

          <g style={{ animation: `spinR ${speed3}s linear infinite`, transformOrigin: 'center', transformBox: 'fill-box' }}>
            <circle r="104" fill="none"
                    stroke="url(#rxRingGradFaint)"
                    strokeWidth="0.8"
                    strokeDasharray="6 14"
                    opacity={0.5 + glow * 0.5}/>
            {Array.from({ length: ring3Particles }).map((_, i) => {
              const angle = (i / Math.max(1, ring3Particles)) * Math.PI * 2;
              return <circle key={i}
                cx={Math.cos(angle) * 104}
                cy={Math.sin(angle) * 104}
                r={1.8 + glow}
                fill={i % 2 ? T.purple : T.teal}
                opacity={0.7 + glow * 0.3}
                filter="url(#rxGlow)"/>;
            })}
          </g>

          <circle r="96" fill="none"
                  stroke={`rgba(0,229,255,${0.10 + glow * 0.32})`}
                  strokeWidth="3"
                  style={{ filter: 'blur(6px)' }}/>
          <circle r="92" fill="url(#rxCoreGrad)"
                  stroke={`rgba(0,229,255,${0.45 + glow * 0.50})`}
                  strokeWidth="1.2"
                  style={{ filter: `drop-shadow(0 0 ${14 + glow * 26}px rgba(0,229,255,${0.40 + glow * 0.55}))` }}/>
          <circle r="92" fill="url(#rxCoreBottomShadow)" opacity="0.85"/>
          <circle r="90" fill="url(#rxCoreSpec)" opacity={armed ? 0.85 : warming ? 0.65 : 0.45}/>
          <circle r="84" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5"/>
          {!idle && (
            <circle r={armed ? 3.2 : 2.2} cx="0" cy="0" fill={T.cyan}
                    style={{
                      filter: `drop-shadow(0 0 10px ${T.cyan})`,
                      animation: 'coreInnerPulse 1.4s ease-in-out infinite',
                      transformOrigin: 'center', transformBox: 'fill-box',
                    }}/>
          )}
        </svg>

        <button
          onPointerDown={handleDown}
          onPointerUp={handleUp}
          onPointerLeave={handleUp}
          onClick={handleClick}
          disabled={idle}
          aria-label="Initiate launch"
          style={{
            all: 'unset',
            position: 'absolute', left: '50%', top: '50%',
            transform: `translate(-50%, -50%) scale(${pressing ? 0.93 : 1})`,
            width: 180, height: 180, borderRadius: '50%',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            cursor: idle ? 'not-allowed' : 'pointer',
            transition: 'transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 300ms ease',
            background: armed
              ? 'radial-gradient(circle at 50% 28%, rgba(0,229,255,0.45), rgba(61,127,255,0.16) 55%, rgba(0,0,0,0))'
              : warming
                ? 'radial-gradient(circle at 50% 28%, rgba(0,229,255,0.24), rgba(61,127,255,0.08) 60%, rgba(0,0,0,0))'
                : 'radial-gradient(circle at 50% 28%, rgba(255,255,255,0.07), transparent 70%)',
            boxShadow: armed
              ? `0 0 0 1px rgba(0,229,255,0.72) inset,
                 0 0 0 6px rgba(0,229,255,0.06),
                 0 0 60px rgba(0,229,255,0.78),
                 0 0 140px rgba(61,127,255,0.45),
                 inset 0 7px 18px rgba(0,229,255,0.22),
                 inset 0 -10px 22px rgba(0,0,0,0.38)`
              : warming
                ? `0 0 0 1px rgba(0,229,255,0.42) inset,
                   0 0 36px rgba(0,229,255,0.32),
                   inset 0 4px 14px rgba(0,229,255,0.14),
                   inset 0 -8px 18px rgba(0,0,0,0.32)`
                : `0 0 0 1px rgba(255,255,255,0.08) inset,
                   inset 0 -6px 16px rgba(0,0,0,0.30)`,
          }}
        >
          <div style={{
            fontFamily: T.mono, fontSize: 9, letterSpacing: '0.24em',
            color: stateColor, textTransform: 'uppercase', fontWeight: 600,
            marginBottom: 8,
            textShadow: armed ? `0 0 14px ${T.cyan}, 0 0 28px rgba(0,229,255,0.4)` : warming ? `0 0 8px ${T.teal}80` : 'none',
            display: 'inline-flex', alignItems: 'center', gap: 5,
            transition: 'all 300ms',
            whiteSpace: 'nowrap',
          }}>
            <span style={{
              width: 4, height: 4, borderRadius: 99, background: stateColor,
              boxShadow: armed ? `0 0 8px ${stateColor}` : 'none',
              animation: armed ? 'pulse 1.4s ease-in-out infinite' : 'none',
            }} />
            {stateLabel}
          </div>

          <div style={{
            fontFamily: T.display, fontWeight: 700,
            fontSize: 21, lineHeight: 1.08,
            letterSpacing: '-0.01em', textAlign: 'center', maxWidth: 130,
            color: armed ? T.text : warming ? T.text2 : T.text3,
            textShadow: armed
              ? `0 0 16px ${T.cyan}, 0 0 44px rgba(0,229,255,0.55)`
              : warming
                ? '0 0 10px rgba(0,229,255,0.5)'
                : 'none',
            transition: 'all 320ms cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}>
            Help me start
          </div>

          <div style={{
            fontFamily: T.mono, fontSize: 8.5, letterSpacing: '0.24em',
            color: T.text3, textTransform: 'uppercase', marginTop: 8,
            opacity: idle ? 0.5 : 0.9,
            transition: 'opacity 300ms',
            whiteSpace: 'nowrap',
          }}>
            {caption}
          </div>
        </button>
      </div>
    </div>
  );
}

// Generated once — stable across re-renders, different on each page load.
const STARS = Array.from({ length: 46 }).map(() => ({
  left: Math.random() * 100,
  top: Math.random() * 100,
  size: Math.random() * 1.4 + 0.6,
  dur: Math.random() * 3 + 2.5,
  delay: -(Math.random() * 6),
  cyan: Math.random() > 0.76,
}));

export function HomeScreen({
  mission, setMission, onLaunch,
  currentItemIdx, setCurrentItemIdx,
  folders,
}) {
  // Exclude Short List from the cycling pill — it's a curated view, not a source queue.
  const resolvedFolders = (folders?.length ? folders : DEFAULT_FOLDERS).filter(f => f.id !== 'short-list');
  const [inputFocused, setInputFocused] = useState(false);
  const [flatItems, setFlatItems] = useState([]);
  const [selectedCatIdx, setSelectedCatIdx] = useState(0);
  const [toastMsg, setToastMsg] = useState('');
  const toastTimerRef = useRef(null);

  const activeCat = resolvedFolders[selectedCatIdx] || resolvedFolders[0];

  const showToast = (msg) => {
    setToastMsg(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMsg(''), 2500);
  };

  const handleCategoryTap = () => {
    const nextIdx = (selectedCatIdx + 1) % resolvedFolders.length;
    setSelectedCatIdx(nextIdx);
    setCurrentItemIdx(-1);
  };

  // Refresh items for the active category. Re-runs whenever selectedCatIdx changes.
  useEffect(() => {
    let cancelled = false;
    const canCallAPI = typeof window !== 'undefined'
      && /^https?:$/.test(window.location?.protocol || '');
    if (!canCallAPI) return;
    (async () => {
      try {
        const folderId = encodeURIComponent(activeCat.id);
        const res = await fetch(`/api/queue?folder=${folderId}`, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        setFlatItems(flattenQueue(data?.items));
      } catch {
        if (!cancelled) setFlatItems([]);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedCatIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // On mount, fetch the #1 item from the Work folder and pre-populate the
  // mission input so the user sees their top task ready to launch.
  useEffect(() => {
    let cancelled = false;
    const canCallAPI = typeof window !== 'undefined'
      && /^https?:$/.test(window.location?.protocol || '');
    if (!canCallAPI) return;
    (async () => {
      try {
        const res = await fetch('/api/queue?folder=work', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        const items = flattenQueue(data?.items);
        if (items[0]?.text) setMission(items[0].text);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const trimmed = mission.trim();
  const reactorState = trimmed.length === 0 ? 'idle' : trimmed.length < 12 ? 'warming' : 'armed';
  const intensity = Math.min(1, trimmed.length / 18);
  const gridAlpha = 0.03 + (0.25 + intensity * 0.75) * 0.2;
  const gridDur = reactorState === 'armed' ? 2.6 : reactorState === 'warming' ? 3.4 : 4.6;

  const historyDisabled = currentItemIdx <= 0;
  const generateEmpty = flatItems.length === 0;

  const handleAssist = (id) => {
    if (id === 'generate') {
      if (!flatItems.length) {
        showToast(`No items in ${activeCat.name} yet`);
        return;
      }
      const nextIdx = (currentItemIdx + 1) % flatItems.length;
      setCurrentItemIdx(nextIdx);
      const item = flatItems[nextIdx];
      setMission((item?.text || '').toString());
    } else if (id === 'history') {
      if (historyDisabled) return;
      const nextIdx = currentItemIdx - 1;
      setCurrentItemIdx(nextIdx);
      const item = flatItems[nextIdx];
      if (item) setMission((item?.text || '').toString());
    }
  };

  const handleLaunch = () => {
    if (!trimmed) return;
    onLaunch && onLaunch(trimmed, activeCat.id);
  };

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      padding: '0 0 24px', position: 'relative',
      minHeight: 0,
    }}>
      {/* Twinkling starfield */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {STARS.map((s, i) => (
          <span key={i} style={{
            position: 'absolute',
            left: `${s.left}%`, top: `${s.top}%`,
            width: s.size, height: s.size, borderRadius: 99,
            background: s.cyan ? T.cyan : '#fff',
            boxShadow: `0 0 ${s.size * 3}px ${s.cyan ? hexToRgba(T.cyan, 0.65) : 'rgba(255,255,255,0.5)'}`,
            opacity: 0.3,
            animation: `twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
          }} />
        ))}
      </div>

      {/* Base engineering grid — faint, masked to centre */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.5,
        backgroundImage: 'linear-gradient(rgba(140,200,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(140,200,255,0.035) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
        maskImage: 'radial-gradient(ellipse at 50% 55%, black 15%, transparent 68%)',
        WebkitMaskImage: 'radial-gradient(ellipse at 50% 55%, black 15%, transparent 68%)',
      }} />

      {/* Reactive grid — brightens and breathes with orb charge */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        animation: `gridGlow ${gridDur}s ease-in-out infinite`,
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `linear-gradient(${hexToRgba(T.cyan, gridAlpha)} 1px, transparent 1px), linear-gradient(90deg, ${hexToRgba(T.cyan, gridAlpha)} 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
          maskImage: 'radial-gradient(circle at 50% 60%, black 0%, rgba(0,0,0,0.45) 28%, transparent 58%)',
          WebkitMaskImage: 'radial-gradient(circle at 50% 60%, black 0%, rgba(0,0,0,0.45) 28%, transparent 58%)',
        }} />
      </div>

      <div style={{ paddingTop: 8, position: 'relative', zIndex: 1 }}>
        <Telemetry code="MC-01 / LAUNCH" state="READY" time="MC · STANDBY" color={T.cyan} />
      </div>

      <MissionField
        mission={mission} setMission={setMission}
        inputFocused={inputFocused} setInputFocused={setInputFocused}
      />

      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <EnergyBeam energy={intensity} state={reactorState} />
        <AssistPills
          onAction={handleAssist}
          historyDisabled={historyDisabled}
          generateEmpty={generateEmpty}
          activeCat={activeCat}
          onCategoryTap={handleCategoryTap}
        />
        <ReactorCore
          state={reactorState}
          intensity={intensity}
          onLaunch={handleLaunch}
        />
      </div>

      {toastMsg && (
        <div style={{
          position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(10, 14, 22, 0.92)',
          border: `1px solid ${T.hairline}`,
          borderRadius: 99, padding: '7px 16px',
          fontFamily: T.mono, fontSize: 11, color: T.text2,
          letterSpacing: '0.02em', whiteSpace: 'nowrap',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          zIndex: 100,
          pointerEvents: 'none',
        }}>
          {toastMsg}
        </div>
      )}
    </div>
  );
}
