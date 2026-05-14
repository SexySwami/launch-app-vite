import { T } from '../tokens.js';

export function Telemetry({ time, code = 'MC-04', state = 'IDLE' }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em',
      color: T.text3, padding: '0 24px',
    }}>
      <span>{code} · {state}</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 5, height: 5, borderRadius: 99, background: T.teal, boxShadow: `0 0 8px ${T.teal}`, animation: 'pulse 1.6s ease-in-out infinite' }} />
        {time}
      </span>
    </div>
  );
}
