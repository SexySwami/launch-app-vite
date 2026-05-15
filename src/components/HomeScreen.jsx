import { useState, useEffect } from 'react';
import { T } from '../tokens.js';

const EXAMPLES = ['Finish WSI proposal', 'Send client follow-up', 'Start workout'];
const GEN_IDEAS = ['Refine product brief', 'Draft week-ahead plan', 'Outline next deliverable'];

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

function AssistPills({ onAction }) {
  const pills = [
    { id: 'generate', icon: '✨', label: 'Generate' },
    { id: 'history',  icon: '↺',  label: 'History' },
  ];
  return (
    <div style={{
      padding: '10px 24px 0',
      display: 'flex', justifyContent: 'center', gap: 8,
      position: 'relative', zIndex: 2,
    }}>
      {pills.map(p => (
        <button key={p.id} onClick={() => onAction(p.id)} style={{
          all: 'unset', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', borderRadius: 99,
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${T.hairlineSoft}`,
          fontFamily: T.display, fontSize: 11.5, fontWeight: 500,
          color: T.text2, letterSpacing: '0.005em',
          whiteSpace: 'nowrap',
          transition: 'all 200ms ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(0,229,255,0.08)';
          e.currentTarget.style.borderColor = 'rgba(0,229,255,0.45)';
          e.currentTarget.style.color = T.text;
          e.currentTarget.style.boxShadow = '0 0 14px rgba(0,229,255,0.18)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
          e.currentTarget.style.borderColor = T.hairlineSoft;
          e.currentTarget.style.color = T.text2;
          e.currentTarget.style.boxShadow = 'none';
        }}>
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

  const glow = 0.3 + intensity * 0.7;

  const handleDown = () => !idle && setPressing(true);
  const handleUp = () => setPressing(false);
  const handleClick = () => {
    if (idle) return;
    onLaunch && onLaunch();
  };

  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', padding: '8px 0', minHeight: 340,
    }}>
      {/* Ambient halo — cyan + warm gold */}
      <div style={{
        position: 'absolute', width: 440, height: 440, borderRadius: '50%',
        background: `radial-gradient(circle,
          rgba(0,229,255,${0.16 * glow}) 0%,
          rgba(255,180,71,${0.10 * glow}) 35%,
          rgba(168,118,255,${0.05 * glow}) 60%,
          transparent 75%)`,
        animation: armed ? 'haloPulse 2.8s ease-in-out infinite' : 'haloPulse 5s ease-in-out infinite',
        pointerEvents: 'none',
      }} />

      <button
        onPointerDown={handleDown}
        onPointerUp={handleUp}
        onPointerLeave={handleUp}
        onClick={handleClick}
        disabled={idle}
        aria-label="Activate launch"
        style={{
          all: 'unset',
          position: 'relative',
          width: 300, height: 300,
          cursor: idle ? 'not-allowed' : 'pointer',
          transform: `scale(${pressing ? 0.96 : 1})`,
          transition: 'transform 200ms cubic-bezier(0.2,0.8,0.2,1)',
          animation: armed ? 'reactorBreatheArmed 2.8s ease-in-out infinite' : 'reactorBreathe 4.4s ease-in-out infinite',
        }}
      >
        <svg width="300" height="300" viewBox="-150 -150 300 300" style={{ overflow: 'visible' }}>
          <defs>
            {/* Gold ring gradient */}
            <linearGradient id="abGold" x1="0" y1="-1" x2="0" y2="1">
              <stop offset="0%"   stopColor="#FFE499"/>
              <stop offset="45%"  stopColor="#F5B040"/>
              <stop offset="100%" stopColor="#A8650A"/>
            </linearGradient>

            {/* Plasma orb radial */}
            <radialGradient id="abPlasma" cx="0.5" cy="0.5" r="0.6">
              <stop offset="0%"   stopColor="rgba(220,255,255,0.95)"/>
              <stop offset="22%"  stopColor="rgba(90,240,255,0.85)"/>
              <stop offset="55%"  stopColor="rgba(0,170,200,0.7)"/>
              <stop offset="90%"  stopColor="rgba(2,55,80,0.95)"/>
              <stop offset="100%" stopColor="rgba(2,30,45,1)"/>
            </radialGradient>

            {/* Bottom shadow inside orb — depth */}
            <radialGradient id="abOrbShade" cx="0.5" cy="0.95" r="0.5">
              <stop offset="0%"   stopColor="rgba(0,0,0,0.55)"/>
              <stop offset="100%" stopColor="rgba(0,0,0,0)"/>
            </radialGradient>

            {/* Top specular highlight */}
            <radialGradient id="abOrbSpec" cx="0.5" cy="0.18" r="0.45">
              <stop offset="0%"   stopColor="rgba(255,255,255,0.5)"/>
              <stop offset="60%"  stopColor="rgba(255,255,255,0.08)"/>
              <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
            </radialGradient>

            {/* Hex badge fill */}
            <linearGradient id="abHexFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#FFE08A"/>
              <stop offset="100%" stopColor="#B5740C"/>
            </linearGradient>

            {/* Plasma noise — fractal displacement gives an organic cloud feel */}
            <filter id="abNoise" x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="3" seed="3" result="noise"/>
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="28"/>
            </filter>

            {/* Soft cyan glow */}
            <filter id="abCyanGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3.5"/>
            </filter>

            {/* Clip plasma to orb */}
            <clipPath id="abOrbClip">
              <circle r="96"/>
            </clipPath>
          </defs>

          {/* ── Outer metallic ring ── */}
          <circle r="142" fill="none" stroke="#0d1422" strokeWidth="9"/>
          <circle r="142" fill="none" stroke="rgba(180,200,220,0.10)" strokeWidth="1"/>
          <circle r="137" fill="none" stroke="rgba(0,0,0,0.5)"        strokeWidth="0.6"/>
          <circle r="147" fill="none" stroke="rgba(0,0,0,0.5)"        strokeWidth="0.6"/>

          {/* ── Cyan arc segments at TL and BR ── */}
          {/* Soft outer halo of cyan glow behind arcs */}
          <path d={describeArc(142, 235, 350)} fill="none"
                stroke={T.cyan} strokeWidth="14" strokeLinecap="round"
                opacity={0.18 * glow} filter="url(#abCyanGlow)"/>
          <path d={describeArc(142, 55, 170)} fill="none"
                stroke={T.cyan} strokeWidth="14" strokeLinecap="round"
                opacity={0.18 * glow} filter="url(#abCyanGlow)"/>
          {/* Bright arc cores */}
          <path d={describeArc(142, 235, 350)} fill="none"
                stroke={T.cyan} strokeWidth="6" strokeLinecap="round"
                opacity={0.55 + glow * 0.45}
                style={{ filter: `drop-shadow(0 0 6px ${T.cyan}) drop-shadow(0 0 12px rgba(0,229,255,0.7))` }}/>
          <path d={describeArc(142, 55, 170)} fill="none"
                stroke={T.cyan} strokeWidth="6" strokeLinecap="round"
                opacity={0.55 + glow * 0.45}
                style={{ filter: `drop-shadow(0 0 6px ${T.cyan}) drop-shadow(0 0 12px rgba(0,229,255,0.7))` }}/>
          {/* Bright inner-cyan caps */}
          <path d={describeArc(142, 240, 345)} fill="none"
                stroke="#CFFAFF" strokeWidth="2.2" strokeLinecap="round"
                opacity={0.55 + glow * 0.45}/>
          <path d={describeArc(142, 60, 165)} fill="none"
                stroke="#CFFAFF" strokeWidth="2.2" strokeLinecap="round"
                opacity={0.55 + glow * 0.45}/>

          {/* ── Gold ring ── */}
          <circle r="118" fill="none"
                  stroke="url(#abGold)" strokeWidth="3.2"
                  opacity={0.7 + glow * 0.3}
                  style={{ filter: `drop-shadow(0 0 10px rgba(255,180,60,${0.5 + glow * 0.4})) drop-shadow(0 0 24px rgba(255,170,40,${0.3 + glow * 0.4}))` }}/>
          <circle r="118" fill="none"
                  stroke="#FFEDB5" strokeWidth="0.8"
                  opacity={0.5 + glow * 0.4}/>

          {/* ── Inner plasma orb ── */}
          {/* Base radial */}
          <circle r="96" fill="url(#abPlasma)"/>

          {/* Noise plasma overlay — clipped to orb */}
          <g clipPath="url(#abOrbClip)" opacity={0.5 + glow * 0.45}>
            <rect x="-110" y="-110" width="220" height="220"
                  fill="rgba(80,220,240,0.55)"
                  filter="url(#abNoise)"/>
            {/* Drifting energy cloud */}
            <ellipse cx="-28" cy="22" rx="38" ry="32"
                     fill="rgba(180,255,255,0.30)" filter="url(#abCyanGlow)"
                     style={{ animation: 'haloPulse 5s ease-in-out infinite' }}/>
            <ellipse cx="30" cy="-22" rx="44" ry="30"
                     fill="rgba(0,255,240,0.22)" filter="url(#abCyanGlow)"
                     style={{ animation: 'haloPulse 7s ease-in-out infinite reverse' }}/>
          </g>

          {/* Lightning tendrils — clipped + flickering */}
          <g clipPath="url(#abOrbClip)" opacity={0.7 + glow * 0.3}
             style={{ filter: 'drop-shadow(0 0 4px rgba(180,255,255,0.9))' }}>
            <path d="M-55,-30 L-28,-18 L-44,2 L-18,18 L-34,46"
                  stroke="rgba(220,255,255,0.95)" strokeWidth="1.2" fill="none"
                  strokeLinecap="round" strokeLinejoin="round"
                  style={{ animation: 'plasmaCrack 0.9s ease-in-out infinite alternate' }}/>
            <path d="M48,-46 L24,-22 L42,-2 L18,16 L34,40"
                  stroke="rgba(220,255,255,0.85)" strokeWidth="1" fill="none"
                  strokeLinecap="round" strokeLinejoin="round"
                  style={{ animation: 'plasmaCrack 0.7s ease-in-out infinite alternate-reverse' }}/>
            <path d="M-22,56 L-6,28 L-20,12 L4,-10 L-12,-34"
                  stroke="rgba(220,255,255,0.85)" strokeWidth="1" fill="none"
                  strokeLinecap="round" strokeLinejoin="round"
                  style={{ animation: 'plasmaCrack 1.1s ease-in-out infinite alternate' }}/>
            <path d="M38,52 L18,32 L46,12 L22,-8"
                  stroke="rgba(220,255,255,0.8)" strokeWidth="0.9" fill="none"
                  strokeLinecap="round" strokeLinejoin="round"
                  style={{ animation: 'plasmaCrack 0.85s ease-in-out infinite alternate-reverse' }}/>
            <path d="M0,-58 L8,-30 L-6,-12 L10,8"
                  stroke="rgba(220,255,255,0.75)" strokeWidth="0.9" fill="none"
                  strokeLinecap="round" strokeLinejoin="round"
                  style={{ animation: 'plasmaCrack 1.3s ease-in-out infinite alternate' }}/>
          </g>

          {/* Sparkle dots inside orb */}
          <g clipPath="url(#abOrbClip)">
            {Array.from({ length: 10 }).map((_, i) => {
              const angle = (i / 10) * Math.PI * 2 + 0.4;
              const dist = 28 + ((i * 7) % 50);
              return <circle key={i}
                cx={Math.cos(angle) * dist}
                cy={Math.sin(angle) * dist}
                r={0.9 + (i % 3) * 0.4}
                fill="rgba(255,255,255,0.9)"
                style={{ animation: `pulse ${1.2 + (i % 5) * 0.3}s ease-in-out infinite ${i * 0.15}s` }}/>;
            })}
          </g>

          {/* Bottom-shade + top spec for depth */}
          <circle r="96" fill="url(#abOrbShade)" opacity="0.9"/>
          <circle r="94" fill="url(#abOrbSpec)" opacity={armed ? 0.7 : warming ? 0.55 : 0.4}/>

          {/* Orb rim — hairline to define edge */}
          <circle r="96" fill="none" stroke="rgba(0,229,255,0.35)" strokeWidth="0.8"/>
          <circle r="96" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="0.4"/>

          {/* Hexagonal gold badge with checkmark — bottom-right */}
          <g transform="translate(72, 72)"
             style={{ filter: 'drop-shadow(0 0 8px rgba(255,180,60,0.75)) drop-shadow(0 2px 4px rgba(0,0,0,0.55))' }}>
            <polygon
              points="13,-7.5 13,7.5 0,15 -13,7.5 -13,-7.5 0,-15"
              fill="url(#abHexFill)"
              stroke="rgba(255,240,200,0.7)"
              strokeWidth="0.6"/>
            <path d="M -5 0.5 L -1 4.5 L 6 -3.5"
                  stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  fill="none"/>
          </g>
        </svg>

        {/* ACTIVATE text */}
        <div style={{
          position: 'absolute', left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)',
          fontFamily: T.display,
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: '0.1em',
          color: armed ? '#fff' : warming ? T.text : T.text2,
          textShadow: `0 0 12px rgba(0,229,255,${0.5 + glow * 0.5}),
                       0 0 28px rgba(0,229,255,${0.25 + glow * 0.45}),
                       0 2px 4px rgba(0,30,40,0.6)`,
          transition: 'all 320ms cubic-bezier(0.2,0.8,0.2,1)',
          pointerEvents: 'none',
          userSelect: 'none',
          whiteSpace: 'nowrap',
        }}>
          ACTIVATE
        </div>
      </button>
    </div>
  );
}

export function HomeScreen({ mission, setMission, onLaunch, onHistory }) {
  const [inputFocused, setInputFocused] = useState(false);

  const trimmed = mission.trim();
  const reactorState = trimmed.length === 0 ? 'idle' : trimmed.length < 12 ? 'warming' : 'armed';
  const intensity = Math.min(1, trimmed.length / 18);

  const handleAssist = (id) => {
    if (id === 'generate') {
      setMission(GEN_IDEAS[Math.floor(Math.random() * GEN_IDEAS.length)]);
    } else if (id === 'history') {
      onHistory && onHistory();
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
        <AssistPills onAction={handleAssist} />
        <ReactorCore
          state={reactorState}
          intensity={intensity}
          onLaunch={handleLaunch}
        />
      </div>
    </div>
  );
}
