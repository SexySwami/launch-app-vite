import { useClerk, useUser } from '@clerk/clerk-react';
import { useState } from 'react';
import { T } from '../tokens.js';
import { apiFetch } from '../lib/apiFetch.js';

export function ProfileScreen() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [cleared, setCleared] = useState(false);

  const name  = user?.fullName || user?.firstName || 'You';
  const email = user?.primaryEmailAddress?.emailAddress || '';
  const avatar = user?.imageUrl || null;

  const handleSignOut = () => signOut();

  const handleClearFirst = () => {
    setConfirmClear(true);
    // Auto-dismiss the confirmation after 4 s if they don't tap again.
    setTimeout(() => setConfirmClear(false), 4000);
  };

  const handleClearConfirm = async () => {
    if (clearing) return;
    setClearing(true);
    try {
      await apiFetch('/api/user-data', { method: 'DELETE' });
      setCleared(true);
    } catch {
      // silently ignore — data may be partially cleared
      setCleared(true);
    } finally {
      setClearing(false);
      setConfirmClear(false);
    }
  };

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

      {/* Clear data — two-tap confirmation */}
      <div style={{ textAlign: 'center' }}>
        {cleared ? (
          <p style={{ fontSize: 13, color: T.text2, margin: 0 }}>
            All data cleared. Sign out and back in to start fresh.
          </p>
        ) : confirmClear ? (
          <button
            onClick={handleClearConfirm}
            disabled={clearing}
            style={{
              padding: '10px 24px',
              background: 'rgba(255,60,60,0.15)',
              border: '1px solid rgba(255,60,60,0.4)',
              borderRadius: 10,
              color: '#ff6b6b',
              fontSize: 13, fontWeight: 600, fontFamily: T.display,
              cursor: clearing ? 'default' : 'pointer',
              opacity: clearing ? 0.6 : 1,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {clearing ? 'Clearing…' : 'Tap again to confirm — this cannot be undone'}
          </button>
        ) : (
          <button
            onClick={handleClearFirst}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.25)',
              fontSize: 12, fontFamily: T.display,
              cursor: 'pointer',
              padding: '4px 0',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Clear all my data
          </button>
        )}
      </div>
    </div>
  );
}
