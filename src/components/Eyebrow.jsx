import { T } from '../tokens.js';

export function Eyebrow({ children, color = T.cyan, style }) {
  return (
    <div style={{
      fontFamily: T.mono, fontSize: 10.5, letterSpacing: '0.22em',
      textTransform: 'uppercase', color,
      display: 'inline-flex', alignItems: 'center', gap: 8,
      ...style,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: color, boxShadow: `0 0 10px ${color}` }} />
      {children}
    </div>
  );
}
