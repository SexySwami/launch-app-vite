import { useSignIn } from '@clerk/clerk-react';
import { useState } from 'react';
import { T } from '../tokens.js';

export function SignIn() {
  const { signIn, isLoaded } = useSignIn();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGoogle = async () => {
    if (!isLoaded || loading) return;
    setLoading(true);
    setError(null);
    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: `${window.location.origin}/sso-callback`,
        redirectUrlComplete: window.location.origin,
      });
    } catch (e) {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100dvh',
      background: T.bg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 32px',
      fontFamily: T.display,
    }}>
      {/* Logo / wordmark */}
      <div style={{ marginBottom: 48, textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 20, marginBottom: 20,
          background: `linear-gradient(135deg, ${T.cyan}, ${T.purple})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
          boxShadow: `0 0 32px rgba(0,210,255,0.25)`,
        }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M16 6L26 12V20L16 26L6 20V12L16 6Z"
              stroke="white" strokeWidth="2" fill="none" strokeLinejoin="round"/>
            <circle cx="16" cy="16" r="3" fill="white"/>
          </svg>
        </div>
        <h1 style={{
          fontSize: 28, fontWeight: 700, color: T.text,
          letterSpacing: '-0.03em', margin: 0,
        }}>
          Help Me Start
        </h1>
        <p style={{
          fontSize: 14, color: T.text2, margin: '8px 0 0',
          letterSpacing: '0.01em',
        }}>
          Your mission control for getting things done.
        </p>
      </div>

      {/* Sign-in card */}
      <div style={{
        width: '100%', maxWidth: 340,
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid rgba(255,255,255,0.10)`,
        borderRadius: 20, padding: '32px 24px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
        <h2 style={{
          fontSize: 18, fontWeight: 600, color: T.text,
          margin: '0 0 6px', letterSpacing: '-0.02em',
        }}>
          Sign in to continue
        </h2>
        <p style={{
          fontSize: 13, color: T.text2, margin: '0 0 24px', lineHeight: 1.5,
        }}>
          Your tasks sync across every device automatically.
        </p>

        <button
          onClick={handleGoogle}
          disabled={!isLoaded || loading}
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            padding: '14px 20px',
            background: loading ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.08)',
            border: `1px solid rgba(255,255,255,${loading ? 0.08 : 0.18})`,
            borderRadius: 12,
            color: T.text,
            fontSize: 15, fontWeight: 600, fontFamily: T.display,
            cursor: loading ? 'default' : 'pointer',
            transition: 'all 150ms ease',
            WebkitTapHighlightColor: 'transparent',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {/* Google "G" icon */}
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M19.6 10.23c0-.68-.06-1.36-.18-2H10v3.79h5.39a4.6 4.6 0 01-2 3.02v2.5h3.24c1.9-1.74 2.97-4.3 2.97-7.31z" fill="#4285F4"/>
            <path d="M10 20c2.7 0 4.97-.9 6.62-2.46l-3.24-2.5c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.75-5.59-4.11H1.07v2.57A9.99 9.99 0 0010 20z" fill="#34A853"/>
            <path d="M4.41 11.89A6 6 0 014.08 10c0-.65.11-1.29.33-1.89V5.54H1.07A10 10 0 000 10c0 1.61.39 3.14 1.07 4.46l3.34-2.57z" fill="#FBBC05"/>
            <path d="M10 3.96c1.47 0 2.78.5 3.82 1.5l2.86-2.85C14.96.99 12.7 0 10 0A9.99 9.99 0 001.07 5.54l3.34 2.57C5.2 5.71 7.4 3.96 10 3.96z" fill="#EA4335"/>
          </svg>
          {loading ? 'Redirecting…' : 'Continue with Google'}
        </button>

        {error && (
          <p style={{
            marginTop: 16, fontSize: 13, color: '#ff6b6b',
            textAlign: 'center', lineHeight: 1.4,
          }}>
            {error}
          </p>
        )}
      </div>

      <p style={{
        marginTop: 32, fontSize: 12, color: T.text2,
        textAlign: 'center', lineHeight: 1.6, maxWidth: 280, opacity: 0.6,
      }}>
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}
