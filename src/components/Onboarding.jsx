import { useState, useRef } from 'react';
import { useSignIn } from '@clerk/clerk-react';
import { T } from '../tokens.js';

export const ONBOARDING_KEY = 'launch:onboarding-done';
const TOTAL = 4;

// Full-screen swipeable onboarding shown to first-time visitors before sign-in.
// Swiping, tapping the dots, or tapping the right-side tap zone advances slides.
// "Skip" (top-right) jumps directly to the sign-in screen.
// The last slide embeds the Google sign-in button so there's no extra tap.
// Once the user signs in OR skips, ONBOARDING_KEY is written to localStorage
// so returning signed-out users go straight to sign-in instead.

export function Onboarding({ onDone }) {
  const [slide, setSlide] = useState(0);
  const touchStartX = useRef(null);
  const { signIn, isLoaded } = useSignIn();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState(null);

  const goTo = (n) => setSlide(Math.max(0, Math.min(TOTAL - 1, n)));

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx < -50) goTo(slide + 1);
    else if (dx > 50) goTo(slide - 1);
    touchStartX.current = null;
  };

  const skip = () => {
    try { localStorage.setItem(ONBOARDING_KEY, '1'); } catch {}
    onDone();
  };

  const handleGoogle = async () => {
    if (!isLoaded || signingIn) return;
    setSigningIn(true);
    setError(null);
    try { localStorage.setItem(ONBOARDING_KEY, '1'); } catch {}
    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: `${window.location.origin}/sso-callback`,
        redirectUrlComplete: window.location.origin,
      });
    } catch {
      setError('Something went wrong. Please try again.');
      setSigningIn(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: T.bg, overflow: 'hidden',
        fontFamily: T.display,
        userSelect: 'none', WebkitUserSelect: 'none',
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 700px 500px at 50% -5%,  rgba(0,229,255,0.08),  transparent 70%),
          radial-gradient(ellipse 500px 700px at 100% 110%, rgba(168,118,255,0.07), transparent 70%),
          radial-gradient(ellipse 400px 400px at 0%   90%,  rgba(61,127,255,0.05),  transparent 70%)
        `,
      }} />

      {/* Skip button (hidden on last slide) */}
      {slide < TOTAL - 1 && (
        <button
          onClick={skip}
          style={{
            position: 'absolute',
            top: 'max(20px, env(safe-area-inset-top, 20px))',
            right: 20, zIndex: 20,
            all: 'unset', cursor: 'pointer',
            fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em',
            color: T.text3, textTransform: 'uppercase',
            padding: '10px 14px',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Skip
        </button>
      )}

      {/* Slide strip */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex',
        transform: `translateX(${-slide * 100}%)`,
        transition: 'transform 380ms cubic-bezier(0.22, 1, 0.36, 1)',
        willChange: 'transform',
      }}>
        <SlideWrap><HeroSlide /></SlideWrap>
        <SlideWrap><BreakdownSlide /></SlideWrap>
        <SlideWrap><FocusSlide /></SlideWrap>
        <SlideWrap>
          <SignInSlide
            onGoogle={handleGoogle}
            loading={signingIn}
            error={error}
            isLoaded={isLoaded}
          />
        </SlideWrap>
      </div>

      {/* Right-side tap zone to advance (not on last slide) */}
      {slide < TOTAL - 1 && (
        <div
          onClick={() => goTo(slide + 1)}
          style={{
            position: 'absolute', right: 0, top: '12%', bottom: '14%',
            width: '25%', zIndex: 10, cursor: 'pointer',
          }}
        />
      )}

      {/* Progress dots */}
      <div style={{
        position: 'absolute',
        bottom: 'max(44px, calc(env(safe-area-inset-bottom, 0px) + 28px))',
        left: 0, right: 0, zIndex: 20,
        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8,
      }}>
        {Array.from({ length: TOTAL }).map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            style={{
              all: 'unset', cursor: 'pointer',
              width: i === slide ? 22 : 7, height: 7,
              borderRadius: 99,
              background: i === slide ? T.purple : 'rgba(168,118,255,0.22)',
              boxShadow: i === slide ? `0 0 10px ${T.purple}` : 'none',
              transition: 'all 320ms cubic-bezier(0.22, 1, 0.36, 1)',
              WebkitTapHighlightColor: 'transparent',
            }}
          />
        ))}
      </div>
    </div>
  );
}

function SlideWrap({ children }) {
  return (
    <div style={{
      minWidth: '100vw', height: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 'max(80px, calc(env(safe-area-inset-top, 0px) + 60px)) 36px max(100px, calc(env(safe-area-inset-bottom, 0px) + 90px))',
      boxSizing: 'border-box',
    }}>
      {children}
    </div>
  );
}

// ─── Slide 0: Hero ────────────────────────────────────────────────────────────
function HeroSlide() {
  return (
    <>
      {/* Logo */}
      <div style={{
        width: 84, height: 84, borderRadius: 26, marginBottom: 28,
        background: `linear-gradient(135deg, ${T.cyan}, ${T.purple})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 0 56px rgba(0,229,255,0.28), 0 0 90px rgba(168,118,255,0.18)`,
      }}>
        <svg width="42" height="42" viewBox="0 0 32 32" fill="none">
          <path d="M16 4L28 11V21L16 28L4 21V11L16 4Z"
            stroke="white" strokeWidth="2" fill="none" strokeLinejoin="round" />
          <circle cx="16" cy="16" r="4" fill="white" opacity="0.9" />
        </svg>
      </div>

      <h1 style={{
        fontFamily: T.orbital, fontSize: 52, fontWeight: 800,
        color: T.text, margin: 0, letterSpacing: '-0.01em',
        textShadow: `0 0 56px rgba(168,118,255,0.55)`,
      }}>
        Launch
      </h1>

      <p style={{
        fontFamily: T.mono, fontSize: 10, letterSpacing: '0.26em',
        color: T.purple, textTransform: 'uppercase',
        margin: '14px 0 36px',
        textShadow: `0 0 14px ${T.purple}66`,
      }}>
        Mission Control for Momentum
      </p>

      <p style={{
        fontSize: 19, color: T.text2, textAlign: 'center',
        lineHeight: 1.6, maxWidth: 290, margin: 0,
      }}>
        Stop staring at your to-do list.
        <br />
        Start launching into it.
      </p>
    </>
  );
}

// ─── Slide 1: AI Breakdown ───────────────────────────────────────────────────
const MOCK_STEPS = [
  { tag: '01', title: 'Open a doc and write the outline', color: T.cyan },
  { tag: '02', title: 'Draft the intro in five bullets',  color: T.purple },
  { tag: '03', title: 'Fill in supporting data & charts', color: T.teal },
];

function BreakdownSlide() {
  return (
    <>
      {/* Icon */}
      <div style={{
        width: 58, height: 58, borderRadius: 18, marginBottom: 22,
        background: 'rgba(0,229,255,0.07)',
        border: `1px solid rgba(0,229,255,0.22)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 28px rgba(0,229,255,0.12)',
      }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
            stroke={T.cyan} strokeWidth="1.6" fill="none"
            strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </div>

      <h2 style={{
        fontSize: 24, fontWeight: 700, color: T.text,
        margin: '0 0 10px', letterSpacing: '-0.025em', textAlign: 'center',
      }}>
        AI breaks it into steps
      </h2>
      <p style={{
        fontSize: 15, color: T.text2, textAlign: 'center',
        lineHeight: 1.5, maxWidth: 270, margin: '0 0 24px',
      }}>
        Type any task. Get a clear action plan in seconds — no more blank staring.
      </p>

      {/* Mock mission input */}
      <div style={{
        width: '100%', maxWidth: 310,
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid rgba(0,229,255,0.18)`,
        borderRadius: 12, padding: '11px 14px',
        marginBottom: 10,
      }}>
        <div style={{
          fontFamily: T.mono, fontSize: 10, letterSpacing: '0.12em',
          color: T.text3, textTransform: 'uppercase', marginBottom: 4,
        }}>Mission</div>
        <div style={{ fontSize: 14, color: T.text, fontWeight: 500 }}>
          Write my quarterly report
        </div>
      </div>

      {/* Mock steps */}
      <div style={{ width: '100%', maxWidth: 310, display: 'flex', flexDirection: 'column', gap: 7 }}>
        {MOCK_STEPS.map((s) => (
          <div key={s.tag} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid rgba(255,255,255,0.07)`,
            borderRadius: 10, padding: '9px 14px',
          }}>
            <span style={{
              fontFamily: T.mono, fontSize: 10, color: s.color,
              minWidth: 18, textShadow: `0 0 8px ${s.color}66`,
            }}>{s.tag}</span>
            <span style={{ fontSize: 13, color: T.text2, lineHeight: 1.3 }}>{s.title}</span>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── Slide 2: Work With Me ───────────────────────────────────────────────────
function FocusSlide() {
  return (
    <>
      {/* Icon */}
      <div style={{
        width: 58, height: 58, borderRadius: 18, marginBottom: 22,
        background: 'rgba(168,118,255,0.08)',
        border: `1px solid rgba(168,118,255,0.22)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 28px rgba(168,118,255,0.12)',
      }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="4" width="20" height="14" rx="3"
            stroke={T.purple} strokeWidth="1.6" />
          <path d="M10 9l5 3-5 3V9z" fill={T.purple} opacity="0.85" />
          <path d="M8 21h8" stroke={T.purple} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </div>

      <h2 style={{
        fontSize: 24, fontWeight: 700, color: T.text,
        margin: '0 0 10px', letterSpacing: '-0.025em', textAlign: 'center',
      }}>
        Work with a focus partner
      </h2>
      <p style={{
        fontSize: 15, color: T.text2, textAlign: 'center',
        lineHeight: 1.5, maxWidth: 275, margin: '0 0 26px',
      }}>
        AI picks a "Work With Me" video matched to your task — virtual body doubling that actually keeps you going.
      </p>

      {/* Mock video thumbnail */}
      <div style={{
        width: '100%', maxWidth: 300,
        aspectRatio: '16 / 9',
        background: 'rgba(0,0,0,0.45)',
        border: `1px solid rgba(168,118,255,0.28)`,
        borderRadius: 14, overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 12px 40px rgba(0,0,0,0.45), 0 0 40px rgba(168,118,255,0.10)',
      }}>
        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, rgba(168,118,255,0.14), rgba(0,229,255,0.07))',
        }} />
        {/* Play button */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 46, height: 46, borderRadius: 99,
            background: 'rgba(168,118,255,0.28)',
            border: `1.5px solid rgba(168,118,255,0.65)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(8px)',
            boxShadow: `0 0 20px rgba(168,118,255,0.3)`,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M8 5l11 7-11 7V5z" fill="white" opacity="0.92" />
            </svg>
          </div>
        </div>
        {/* Label */}
        <div style={{
          position: 'absolute', bottom: 10, left: 12,
          fontFamily: T.mono, fontSize: 9, letterSpacing: '0.2em',
          color: T.purple, textTransform: 'uppercase',
          textShadow: `0 0 8px ${T.purple}`,
        }}>
          Work With Me
        </div>
        {/* Simulated person silhouette lines */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.06,
          background: `repeating-linear-gradient(
            0deg, rgba(168,118,255,1) 0px, rgba(168,118,255,1) 1px,
            transparent 1px, transparent 14px
          )`,
        }} />
      </div>
    </>
  );
}

// ─── Slide 3: Sign In CTA ────────────────────────────────────────────────────
function SignInSlide({ onGoogle, loading, error, isLoaded }) {
  return (
    <>
      {/* Rocket icon */}
      <div style={{
        width: 68, height: 68, borderRadius: 22, marginBottom: 26,
        background: `linear-gradient(135deg, ${T.purple}, ${T.cyan})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 0 48px rgba(168,118,255,0.42), 0 0 80px rgba(0,229,255,0.14)`,
      }}>
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
          <path d="M12 2c0 0-6 7-6 13a6 6 0 0012 0c0-6-6-13-6-13z"
            stroke="white" strokeWidth="1.7" fill="none" strokeLinejoin="round" />
          <path d="M9 19.5L7 22M15 19.5L17 22"
            stroke="white" strokeWidth="1.7" strokeLinecap="round" />
          <circle cx="12" cy="13" r="2.2" fill="white" opacity="0.88" />
        </svg>
      </div>

      <h2 style={{
        fontSize: 30, fontWeight: 700, color: T.text,
        margin: '0 0 10px', letterSpacing: '-0.03em', textAlign: 'center',
      }}>
        Ready to launch?
      </h2>
      <p style={{
        fontSize: 15, color: T.text2, textAlign: 'center',
        lineHeight: 1.55, maxWidth: 260, margin: '0 0 36px',
      }}>
        Your missions sync across every device automatically.
      </p>

      {/* Google sign-in button */}
      <button
        onClick={onGoogle}
        disabled={!isLoaded || loading}
        style={{
          width: '100%', maxWidth: 300,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          padding: '15px 20px',
          background: loading ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.08)',
          border: `1px solid rgba(255,255,255,${loading ? 0.08 : 0.18})`,
          borderRadius: 14, color: T.text,
          fontSize: 16, fontWeight: 600, fontFamily: T.display,
          cursor: loading ? 'default' : 'pointer',
          transition: 'all 150ms ease',
          WebkitTapHighlightColor: 'transparent',
          opacity: loading ? 0.65 : 1,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M19.6 10.23c0-.68-.06-1.36-.18-2H10v3.79h5.39a4.6 4.6 0 01-2 3.02v2.5h3.24c1.9-1.74 2.97-4.3 2.97-7.31z" fill="#4285F4"/>
          <path d="M10 20c2.7 0 4.97-.9 6.62-2.46l-3.24-2.5c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.75-5.59-4.11H1.07v2.57A9.99 9.99 0 0010 20z" fill="#34A853"/>
          <path d="M4.41 11.89A6 6 0 014.08 10c0-.65.11-1.29.33-1.89V5.54H1.07A10 10 0 000 10c0 1.61.39 3.14 1.07 4.46l3.34-2.57z" fill="#FBBC05"/>
          <path d="M10 3.96c1.47 0 2.78.5 3.82 1.5l2.86-2.85C14.96.99 12.7 0 10 0A9.99 9.99 0 001.07 5.54l3.34 2.57C5.2 5.71 7.4 3.96 10 3.96z" fill="#EA4335"/>
        </svg>
        {loading ? 'Redirecting…' : 'Continue with Google'}
      </button>

      {error && (
        <p style={{ marginTop: 16, fontSize: 13, color: '#ff6b6b', textAlign: 'center' }}>
          {error}
        </p>
      )}

      <p style={{
        marginTop: 24, fontSize: 11, color: T.text3,
        textAlign: 'center', lineHeight: 1.6, maxWidth: 260, opacity: 0.7,
      }}>
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </p>
    </>
  );
}
