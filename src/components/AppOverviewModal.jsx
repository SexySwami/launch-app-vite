import { useState, useEffect, useRef } from 'react';
import { T } from '../tokens.js';
import { PLAIN_SLIDES, OB_CSS, ACCENTS, STARS, rgba, Arrow, Dots } from './Onboarding.jsx';

const N = PLAIN_SLIDES.length;

export function AppOverviewModal({ onClose }) {
  const [index, setIndex] = useState(0);
  const drag = useRef(null);

  useEffect(() => {
    const el = document.createElement('style');
    el.id = 'ob-css-modal';
    el.textContent = OB_CSS;
    document.head.appendChild(el);
    return () => el.remove();
  }, []);

  useEffect(() => {
    const h = e => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') setIndex(i => Math.min(N - 1, i + 1));
      else if (e.key === 'ArrowLeft')  setIndex(i => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const onDown = e => { drag.current = { x: e.clientX }; };
  const onUp   = e => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    if (Math.abs(dx) > 44) dx < 0
      ? setIndex(i => Math.min(N - 1, i + 1))
      : setIndex(i => Math.max(0, i - 1));
    drag.current = null;
  };

  const accent = ACCENTS[index];

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: T.bg, overflow: 'hidden', fontFamily: T.display }}
      onPointerDown={onDown} onPointerUp={onUp}
    >
      {/* X close button */}
      <button
        onClick={onClose}
        aria-label="Close"
        style={{
          all: 'unset',
          position: 'absolute',
          top: 'calc(max(12px, env(safe-area-inset-top)) + 2px)',
          right: 18,
          zIndex: 80,
          cursor: 'pointer',
          width: 38, height: 38, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(140,200,255,0.18)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          transition: 'all 200ms ease',
          WebkitTapHighlightColor: 'transparent',
        }}
        onPointerEnter={e => { e.currentTarget.style.background = 'rgba(255,80,80,0.12)'; e.currentTarget.style.borderColor = 'rgba(255,80,80,0.3)'; }}
        onPointerLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(140,200,255,0.18)'; }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round">
          <path d="M6 6 L18 18 M18 6 L6 18" />
        </svg>
      </button>

      {/* ambient glow washes */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `
        radial-gradient(ellipse 600px 420px at 50% 0%,    rgba(0,229,255,0.11),  transparent 70%),
        radial-gradient(ellipse 520px 600px at 100% 100%, rgba(168,118,255,0.09), transparent 70%),
        radial-gradient(ellipse 400px 320px at 0%   82%,  rgba(61,127,255,0.07),  transparent 70%)` }} />

      {/* starfield */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {STARS.map((s, i) => (
          <span key={i} style={{
            position: 'absolute', left: `${s.left}%`, top: `${s.top}%`,
            width: s.size, height: s.size, borderRadius: 99,
            background: s.cyan ? T.cyan : '#fff',
            boxShadow: `0 0 ${s.size * 3.2}px ${s.cyan ? rgba(T.cyan, 0.7) : 'rgba(255,255,255,0.55)'}`,
            opacity: 0.4, animation: `twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
          }} />
        ))}
      </div>

      {/* base static grid */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.5,
        backgroundImage: `linear-gradient(rgba(140,200,255,0.04) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(140,200,255,0.04) 1px, transparent 1px)`,
        backgroundSize: '32px 32px',
        maskImage: 'radial-gradient(ellipse at 50% 30%, black 28%, transparent 78%)',
        WebkitMaskImage: 'radial-gradient(ellipse at 50% 30%, black 28%, transparent 78%)',
      }} />

      {/* reactive accent grid */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `linear-gradient(${rgba(accent, 0.06)} 1px, transparent 1px),
                            linear-gradient(90deg, ${rgba(accent, 0.06)} 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
          maskImage: 'radial-gradient(circle at 50% 36%, black 0%, rgba(0,0,0,0.5) 26%, transparent 56%)',
          WebkitMaskImage: 'radial-gradient(circle at 50% 36%, black 0%, rgba(0,0,0,0.5) 26%, transparent 56%)',
          transition: 'background-image 500ms ease',
        }} />
      </div>

      {/* horizontal scanline */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2, pointerEvents: 'none',
        background: 'linear-gradient(90deg, transparent, rgba(0,229,255,0.5), transparent)',
        animation: 'ob-scanY 7s linear infinite', zIndex: 1,
      }} />

      {/* slide track */}
      <div style={{
        position: 'absolute', inset: 0,
        paddingTop: 'max(12px, env(safe-area-inset-top))',
        paddingBottom: 'max(64px, calc(env(safe-area-inset-bottom) + 56px))',
        boxSizing: 'border-box', overflow: 'hidden', zIndex: 2,
      }}>
        <div style={{
          display: 'flex', height: '100%', width: `${N * 100}%`,
          transform: `translateX(-${index * (100 / N)}%)`,
          transition: 'transform 480ms cubic-bezier(0.2,0.8,0.2,1)',
        }}>
          {PLAIN_SLIDES.map((S, i) => (
            <div key={i} className={`ob-slide${i === index ? ' ob-active' : ''}`}
              style={{ width: `${100 / N}%`, height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
              <S />
            </div>
          ))}
        </div>
      </div>

      {/* flanking arrows */}
      <Arrow dir="left"  disabled={index === 0}     onClick={() => setIndex(i => Math.max(0, i - 1))} />
      <Arrow dir="right" disabled={index === N - 1}  onClick={() => setIndex(i => Math.min(N - 1, i + 1))} />

      {/* progress dots */}
      <div style={{
        position: 'absolute',
        bottom: 'max(20px, calc(env(safe-area-inset-bottom) + 14px))',
        left: 0, right: 0, zIndex: 20,
      }}>
        <Dots n={N} index={index} accent={accent} onJump={setIndex} />
      </div>
    </div>
  );
}
