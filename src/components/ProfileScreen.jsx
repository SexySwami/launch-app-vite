import { useClerk, useUser } from '@clerk/clerk-react';
import { T } from '../tokens.js';

export function ProfileScreen({ onBack }) {
  const { signOut } = useClerk();
  const { user } = useUser();

  const handleSignOut = () => signOut();

  const name  = user?.fullName || user?.firstName || 'You';
  const email = user?.primaryEmailAddress?.emailAddress || '';
  const avatar = user?.imageUrl || null;

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 32px 48px',
      fontFamily: T.display,
      gap: 24,
    }}>
      {/* Avatar */}
      {avatar
        ? <img src={avatar} alt={name} style={{
            width: 72, height: 72, borderRadius: '50%',
            border: `2px solid rgba(255,255,255,0.12)`,
          }} />
        : <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: `linear-gradient(135deg, ${T.cyan}, ${T.purple})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 700, color: '#fff',
          }}>
            {name[0]?.toUpperCase() || '?'}
          </div>
      }

      {/* Name + email */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: T.text, letterSpacing: '-0.02em' }}>
          {name}
        </div>
        {email && (
          <div style={{ fontSize: 13, color: T.text2, marginTop: 4 }}>
            {email}
          </div>
        )}
      </div>

      {/* Sign out button */}
      <button
        onClick={handleSignOut}
        style={{
          marginTop: 8,
          padding: '12px 32px',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 12,
          color: T.text2,
          fontSize: 14, fontWeight: 600, fontFamily: T.display,
          cursor: 'pointer',
          transition: 'all 150ms ease',
          WebkitTapHighlightColor: 'transparent',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,80,80,0.12)'; e.currentTarget.style.borderColor = 'rgba(255,80,80,0.3)'; e.currentTarget.style.color = '#ff6b6b'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = T.text2; }}
      >
        Sign out
      </button>
    </div>
  );
}
