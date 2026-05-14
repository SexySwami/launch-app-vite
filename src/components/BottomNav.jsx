import { T } from '../tokens.js';

export function BottomNav({ screen, onNav }) {
  const items = [
    { id: 'input', label: 'Launch',
      icon: <path d="M9 1l6 7h-4v8H7V8H3l6-7z" fill="currentColor"/> },
    { id: 'dashboard', label: 'Momentum',
      icon: <g><rect x="2" y="9" width="3" height="7" rx="1" fill="currentColor"/><rect x="7.5" y="5" width="3" height="11" rx="1" fill="currentColor"/><rect x="13" y="2" width="3" height="14" rx="1" fill="currentColor"/></g> },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 'max(16px, env(safe-area-inset-bottom))', left: 24, right: 24,
      height: 60, borderRadius: 22, padding: 6,
      background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: `1px solid ${T.hairline}`,
      display: 'flex', gap: 6,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
      zIndex: 5,
    }}>
      {items.map(it => {
        const active = it.id === screen;
        return (
          <button key={it.id} onClick={() => onNav(it.id)} style={{
            flex: 1, borderRadius: 16, border: 'none',
            background: active
              ? 'linear-gradient(180deg, rgba(0,229,255,0.18), rgba(61,127,255,0.10))'
              : 'transparent',
            color: active ? T.text : T.text2,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontFamily: T.display, fontSize: 13, fontWeight: 500, letterSpacing: '0.02em',
            cursor: 'pointer',
            boxShadow: active ? `inset 0 0 0 1px rgba(0,229,255,0.3), 0 0 24px rgba(0,229,255,0.12)` : 'none',
            WebkitTapHighlightColor: 'transparent',
          }}>
            <svg width="16" height="16" viewBox="0 0 18 18">{it.icon}</svg>
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
