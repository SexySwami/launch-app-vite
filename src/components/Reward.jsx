import { useState, useEffect } from 'react';
import { T } from '../tokens.js';
import { Eyebrow } from './Eyebrow.jsx';
import { Telemetry } from './Telemetry.jsx';
import { GlowButton } from './GlowButton.jsx';

export function Reward({ onNext, onLog, momentum }) {
  const [tickedNum, setTickedNum] = useState(0);
  useEffect(() => {
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      setTickedNum(n);
      if (n >= 15) clearInterval(id);
    }, 60);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', minHeight: 0 }}>
      <Telemetry time="04:34:11 UTC" code="MC-04 / SUCCESS" state="COMPLETE" />

      <div style={{
        position: 'absolute', top: '38%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 600, height: 600, pointerEvents: 'none',
      }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute', left: '50%', top: '50%',
            width: 2, height: 200,
            background: `linear-gradient(180deg, transparent, ${i % 2 ? T.cyan : T.blue}88, transparent)`,
            transformOrigin: '50% 0%',
            transform: `translate(-50%, 0) rotate(${i * 30}deg) translateY(40px)`,
            opacity: 0.6,
            animation: `rayPulse 2.4s ease-in-out ${i * 0.05}s infinite`,
          }} />
        ))}
      </div>

      <div style={{
        position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: 380, height: 380,
        background: `radial-gradient(circle, rgba(0,229,255,0.35), rgba(168,118,255,0.1) 40%, transparent 65%)`,
        animation: 'breathe 2.4s ease-in-out infinite',
      }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px', position: 'relative', minHeight: 0 }}>
        <Eyebrow color={T.teal} style={{ marginBottom: 24 }}>Launch Successful</Eyebrow>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
          <span style={{
            fontFamily: T.display, fontSize: 28, fontWeight: 500,
            color: T.cyan, marginRight: -2,
            textShadow: `0 0 24px ${T.cyan}`,
          }}>+</span>
          <span style={{
            fontFamily: T.display, fontSize: 130, fontWeight: 600,
            letterSpacing: '-0.05em', lineHeight: 1, color: T.text,
            textShadow: `0 0 50px ${T.cyan}, 0 0 90px ${T.blue}66`,
            fontVariantNumeric: 'tabular-nums',
          }}>{tickedNum}</span>
        </div>
        <div style={{
          fontFamily: T.mono, fontSize: 12, letterSpacing: '0.32em',
          color: T.cyan, textTransform: 'uppercase',
          textShadow: `0 0 12px ${T.cyan}`,
        }}>
          Momentum
        </div>

        <div style={{
          marginTop: 28, textAlign: 'center', maxWidth: 280,
          fontFamily: T.display, fontSize: 18, fontWeight: 500,
          color: T.text, lineHeight: 1.3, letterSpacing: '-0.005em',
        }}>
          Launch successful. <br/>
          <span style={{ color: T.text2 }}>Momentum increasing.</span>
        </div>

        <div style={{
          display: 'flex', gap: 0, marginTop: 32,
          background: T.surface, border: `1px solid ${T.hairline}`,
          borderRadius: 16, overflow: 'hidden',
        }}>
          {[
            ['Score', momentum + 15, '+15'],
            ['Today', '3', '+1'],
            ['Streak', '7d', '↗'],
          ].map(([label, val, delta], i, arr) => (
            <div key={label} style={{
              padding: '12px 18px', textAlign: 'center',
              borderRight: i < arr.length - 1 ? `1px solid ${T.hairlineSoft}` : 'none',
            }}>
              <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.2em', color: T.text3, textTransform: 'uppercase' }}>{label}</div>
              <div style={{ fontFamily: T.display, fontSize: 20, fontWeight: 600, color: T.text, marginTop: 2 }}>{val}</div>
              <div style={{ fontFamily: T.mono, fontSize: 9, color: T.teal, marginTop: 2, letterSpacing: '0.1em' }}>{delta}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, padding: '0 24px 0' }}>
        <button onClick={onLog} style={{
          flex: 1, height: 56, borderRadius: 16,
          background: T.surface, border: `1px solid ${T.hairline}`,
          color: T.text, fontFamily: T.display, fontSize: 14, fontWeight: 600,
          letterSpacing: '0.04em', textTransform: 'uppercase', cursor: 'pointer',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
          WebkitTapHighlightColor: 'transparent',
        }}>
          Log Progress
        </button>
        <GlowButton onClick={onNext} style={{ flex: 1, height: 56 }}>
          Next Phase
          <svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </GlowButton>
      </div>
    </div>
  );
}
