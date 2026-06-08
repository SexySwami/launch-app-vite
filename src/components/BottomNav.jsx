import { T } from '../tokens.js';

const ITEMS = [
  {
    id: 'home',
    label: 'Home',
    icon: (
      <path d="M12 3L2 12h3v9h6v-6h2v6h6v-9h3L12 3z" fill="currentColor"/>
    ),
  },
  {
    id: 'break-set',
    label: 'Break',
    icon: (
      <g stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M6 3h12M6 21h12"/>
        <path d="M7.5 3v3.4L12 11l4.5-4.6V3"/>
        <path d="M7.5 21v-3.4L12 13l4.5 4.6V21"/>
      </g>
    ),
  },
  {
    id: 'input',
    label: 'Checklists',
    icon: (
      <g stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M9 6h11M9 12h11M9 18h11"/>
        <path d="M4 6l1.2 1.8L7 5M4 12l1.2 1.8L7 10.5M4 18l1.2 1.8L7 16.5"/>
      </g>
    ),
  },
  {
    id: 'completed',
    label: 'Completed',
    icon: (
      <g stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <circle cx="12" cy="12" r="9"/>
        <path d="M8.5 12l2.5 2.5 5-5"/>
      </g>
    ),
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: (
      <g stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" fill="none">
        <circle cx="12" cy="8" r="4"/>
        <path d="M4 21v-1a8 8 0 0 1 16 0v1"/>
      </g>
    ),
  },
];

export function BottomNav({ screen, onNav }) {
  return (
    <div style={{
      flexShrink: 0,
      display: 'flex',
      background: 'rgba(5,7,12,0.94)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderTop: `1px solid ${T.hairline}`,
      paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
    }}>
      {ITEMS.map(item => {
        const active = item.id === screen
          || (item.id === 'break-set' && typeof screen === 'string' && screen.startsWith('break-'));
        return (
          <button
            key={item.id}
            onClick={() => onNav(item.id)}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              padding: '10px 4px 6px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
              color: active ? T.cyan : T.text3,
              position: 'relative',
            }}
          >
            {active && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 28,
                height: 2,
                borderRadius: 1,
                background: T.cyan,
                boxShadow: `0 0 8px ${T.cyan}`,
              }} />
            )}
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              style={{
                filter: active ? `drop-shadow(0 0 5px ${T.cyan}90)` : 'none',
              }}
            >
              {item.icon}
            </svg>
            <span style={{
              fontFamily: T.display,
              fontSize: 10,
              fontWeight: active ? 600 : 400,
              letterSpacing: '0.03em',
              lineHeight: 1,
            }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
