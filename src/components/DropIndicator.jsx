import { T } from '../tokens.js';

export function DropIndicator() {
  return (
    <div style={{
      height: 3, marginLeft: 4, marginRight: 4,
      borderRadius: 99,
      background: `linear-gradient(90deg, transparent, ${T.cyan}, transparent)`,
      boxShadow: `0 0 14px ${T.cyan}, 0 0 6px ${T.cyan}`,
      flexShrink: 0,
      animation: 'pulse 1.2s ease-in-out infinite',
    }} />
  );
}
