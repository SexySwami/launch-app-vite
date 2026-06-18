import { useState, useEffect } from 'react';
import { T } from '../tokens.js';

function fmt(secs) {
  if (secs < 60) return `${secs} sec`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s > 0 ? `${m}m ${s}s` : `${m} min`;
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

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      animation: expired ? 'pulse 1.2s ease-in-out infinite' : 'none',
    }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
        stroke={expired ? '#ff6b6b' : accent} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
      <span style={{
        fontFamily: T.mono, fontSize: 10, letterSpacing: '0.2em',
        color: expired ? '#ff6b6b' : T.text3,
        textTransform: 'uppercase',
        textShadow: expired ? '0 0 8px rgba(255,107,107,0.5)' : 'none',
      }}>
        {expired ? "Time's up" : fmt(remaining)}
      </span>
    </div>
  );
}
