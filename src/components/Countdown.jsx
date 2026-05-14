import { useState, useEffect } from 'react';
import { T } from '../tokens.js';
import { Eyebrow } from './Eyebrow.jsx';

export function Countdown({ onComplete }) {
  const [count, setCount] = useState(3);
  const [phase, setPhase] = useState('count');

  useEffect(() => {
    if (phase !== 'count') return;
    if (count === 0) {
      setPhase('launch');
      onComplete();
      return;
    }
    const t = setTimeout(() => setCount(c => c - 1), 900);
    return () => clearTimeout(t);
  }, [count, phase]);

  const display = phase === 'launch' ? 'GO' : (count === 0 ? 'GO' : count);
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(circle at 50% 50%, rgba(0,229,255,0.18), transparent 55%)`,
        animation: 'breathe 1.8s ease-in-out infinite',
      }} />
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          position: 'absolute', width: 220 + i * 90, height: 220 + i * 90,
          borderRadius: '50%', border: `1px solid ${T.hairline}`,
          opacity: 1 - i * 0.25,
          animation: `ringPulse 2s ease-out ${i * 0.25}s infinite`,
        }} />
      ))}
      <Eyebrow color={T.cyan} style={{ position: 'absolute', top: 100 }}>
        {phase === 'launch' ? 'Ignition' : 'Final Countdown'}
      </Eyebrow>
      <div key={display} style={{
        fontFamily: T.display, fontSize: phase === 'launch' ? 120 : 180,
        fontWeight: 600, letterSpacing: '-0.04em',
        color: T.text, lineHeight: 1,
        textShadow: `0 0 60px ${T.cyan}, 0 0 120px ${T.blue}`,
        animation: 'countIn 700ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        position: 'relative', zIndex: 2,
      }}>
        {display}
      </div>
      <div style={{
        fontFamily: T.mono, fontSize: 11, letterSpacing: '0.24em',
        color: T.text3, marginTop: 24, textTransform: 'uppercase',
        position: 'relative', zIndex: 2,
      }}>
        {phase === 'launch' ? 'Launch initiated · executing' : 'Engaging launch protocol'}
      </div>
    </div>
  );
}
