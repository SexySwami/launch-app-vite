import { T } from '../tokens.js';

export function GlowButton({ children, onClick, variant = 'primary', disabled, style }) {
  const isPrimary = variant === 'primary';
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: '100%', height: 60, borderRadius: 18,
      border: isPrimary ? '1px solid rgba(0,229,255,0.5)' : `1px solid ${T.hairline}`,
      background: isPrimary
        ? 'linear-gradient(180deg, rgba(0,229,255,0.18) 0%, rgba(61,127,255,0.16) 100%)'
        : 'rgba(255,255,255,0.04)',
      color: T.text,
      fontFamily: T.display, fontSize: 16, fontWeight: 600, letterSpacing: '0.04em',
      textTransform: 'uppercase',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      position: 'relative', overflow: 'hidden',
      boxShadow: isPrimary
        ? '0 0 0 1px rgba(0,229,255,0.15) inset, 0 8px 30px rgba(0,229,255,0.25), 0 0 60px rgba(61,127,255,0.18)'
        : '0 1px 0 rgba(255,255,255,0.05) inset',
      transition: 'transform 120ms ease, box-shadow 200ms ease',
      WebkitTapHighlightColor: 'transparent',
      ...style,
    }}
    onTouchStart={e => e.currentTarget.style.transform = 'scale(0.985)'}
    onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.985)'}
    onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
      {isPrimary && <span style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 120%, rgba(0,229,255,0.5) 0%, transparent 60%)',
        opacity: 0.6, pointerEvents: 'none',
      }} />}
      <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%' }}>
        {children}
      </span>
    </button>
  );
}
