import { useState, useEffect } from 'react';
import { T } from '../tokens.js';

const EXAMPLES = ['Finish WSI proposal', 'Send client follow-up', 'Start workout'];

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

function MissionField({ mission, setMission, inputFocused, setInputFocused }) {
  const [phIdx, setPhIdx] = useState(0);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    if (mission) return;
    const id = setInterval(() => setPhIdx(i => (i + 1) % EXAMPLES.length), 2600);
    return () => clearInterval(id);
  }, [mission]);

  const hot = inputFocused || mission.length > 0;

  return (
    <div style={{ padding: '20px 24px 0', position: 'relative' }}>
      <h1 style={{
        fontFamily: T.display, fontSize: 26, fontWeight: 600,
        color: T.text, margin: '0 0 14px',
        letterSpacing: '-0.02em', lineHeight: 1.1, textAlign: 'center',
        textShadow: hot ? '0 0 24px rgba(0,229,255,0.3)' : 'none',
        transition: 'text-shadow 400ms',
      }}>
        What are we launching?
      </h1>

      <div style={{
        position: 'relative',
        background: hot
          ? 'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(0,229,255,0.04) 60%, rgba(255,255,255,0.02))'
          : 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
        border: `1px solid ${hot ? 'rgba(0,229,255,0.65)' : T.hairline}`,
        borderRadius: 18, padding: '14px 12px 14px 18px',
        display: 'flex', alignItems: 'center', gap: 10,
        transition: 'all 300ms ease',
        boxShadow: hot
          ? `0 0 0 4px rgba(0,229,255,0.14),
             0 0 50px rgba(0,229,255,0.28),
             0 0 100px rgba(61,127,255,0.18),
             inset 0 0 40px rgba(0,229,255,0.08),
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
        <input
          value={mission}
          onChange={e => setMission(e.target.value)}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          placeholder={EXAMPLES[phIdx]}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            fontFamily: T.display, fontSize: 17, fontWeight: 500,
            color: T.text, letterSpacing: '-0.005em', padding: 0,
            minWidth: 0,
          }}
        />
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

function AssistPills({ onAction, historyDisabled }) {
  const pills = [
    { id: 'generate', icon: '✨', label: 'Generate', disabled: false },
    { id: 'history',  icon: '↺',  label: 'History',  disabled: !!historyDisabled },
  ];
  return (
    <div style={{
      padding: '10px 24px 0',
      display: 'flex', justifyContent: 'center', gap: 8,
      position: 'relative', zIndex: 2,
    }}>
      {pills.map(p => (
        <button
          key={p.id}
          onClick={() => { if (!p.disabled) onAction(p.id); }}
          disabled={p.disabled}
          aria-disabled={p.disabled || undefined}
          style={{
            all: 'unset',
            cursor: p.disabled ? 'not-allowed' : 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 99,
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${T.hairlineSoft}`,
            fontFamily: T.display, fontSize: 11.5, fontWeight: 500,
            color: p.disabled ? T.text3 : T.text2, letterSpacing: '0.005em',
            whiteSpace: 'nowrap',
            opacity: p.disabled ? 0.42 : 1,
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
          <span style={{ fontSize: 12, filter: 'saturate(1.15)' }}>{p.icon}</span>
          {p.label}
        </button>
      ))}
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
            fontSize: armed ? 32 : 28, letterSpacing: '0.12em',
            color: armed ? T.text : warming ? T.text2 : T.text3,
            textShadow: armed
              ? `0 0 16px ${T.cyan}, 0 0 44px rgba(0,229,255,0.55)`
              : warming
                ? '0 0 10px rgba(0,229,255,0.5)'
                : 'none',
            transition: 'all 320ms cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}>
            INITIATE
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

export function HomeScreen({
  mission, setMission, onLaunch,
  cycleIdx, setCycleIdx,
  cycleHistory, setCycleHistory,
  cycleHistoryPos, setCycleHistoryPos,
}) {
  const [inputFocused, setInputFocused] = useState(false);
  const [flatItems, setFlatItems] = useState([]);

  // Refresh the priority list every time the home screen mounts so changes
  // made in the Checklists tab show up immediately.
  useEffect(() => {
    let cancelled = false;
    const canCallAPI = typeof window !== 'undefined'
      && /^https?:$/.test(window.location?.protocol || '');
    if (!canCallAPI) return;
    (async () => {
      try {
        const res = await fetch('/api/queue', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        setFlatItems(flattenQueue(data?.items));
      } catch {
        if (!cancelled) setFlatItems([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const trimmed = mission.trim();
  const reactorState = trimmed.length === 0 ? 'idle' : trimmed.length < 12 ? 'warming' : 'armed';
  const intensity = Math.min(1, trimmed.length / 18);

  const historyDisabled = cycleHistoryPos <= 0;

  const handleAssist = (id) => {
    if (id === 'generate') {
      if (!flatItems.length) return;
      const safeIdx = ((cycleIdx % flatItems.length) + flatItems.length) % flatItems.length;
      const item = flatItems[safeIdx];
      const text = (item?.text || '').toString();
      if (!text) return;
      const nextHistory = [...cycleHistory, { id: item.id, text }];
      setCycleHistory(nextHistory);
      setCycleHistoryPos(nextHistory.length - 1);
      setCycleIdx((safeIdx + 1) % flatItems.length);
      setMission(text);
    } else if (id === 'history') {
      if (historyDisabled) return;
      const newPos = cycleHistoryPos - 1;
      setCycleHistoryPos(newPos);
      const prev = cycleHistory[newPos];
      if (prev) setMission(prev.text);
    }
  };

  const handleLaunch = () => {
    if (!trimmed) return;
    onLaunch && onLaunch(trimmed);
  };

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      padding: '24px 0 24px', position: 'relative',
      minHeight: 0,
    }}>
      <MissionField
        mission={mission} setMission={setMission}
        inputFocused={inputFocused} setInputFocused={setInputFocused}
      />

      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <EnergyBeam energy={intensity} state={reactorState} />
        <AssistPills onAction={handleAssist} historyDisabled={historyDisabled} />
        <ReactorCore
          state={reactorState}
          intensity={intensity}
          onLaunch={handleLaunch}
        />
      </div>
    </div>
  );
}
