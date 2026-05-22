import { useState } from 'react';
import { T } from '../tokens.js';
import { Eyebrow } from './Eyebrow.jsx';

function toRGBA(hex, a) {
  const m = hex.replace('#', '');
  const r = parseInt(m.substring(0, 2), 16);
  const g = parseInt(m.substring(2, 4), 16);
  const b = parseInt(m.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

const ICONS = {
  grid: (color) => (
    <g stroke={color} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4.5" y="4.5" width="6" height="6" rx="1.2"/>
      <rect x="13.5" y="4.5" width="6" height="6" rx="1.2"/>
      <rect x="4.5" y="13.5" width="6" height="6" rx="1.2"/>
      <rect x="13.5" y="13.5" width="6" height="6" rx="1.2"/>
    </g>
  ),
  layers: (color) => (
    <g stroke={color} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.5l8 4-8 4-8-4 8-4z"/>
      <path d="M4 12l8 4 8-4"/>
      <path d="M4 16.5l8 4 8-4"/>
    </g>
  ),
};

function ModeCard({ accent, eyebrow, title, description, iconKey, comingSoon, animationDelay, onTap }) {
  const [pressed, setPressed] = useState(false);
  const dim = comingSoon;

  return (
    <button
      onClick={onTap}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        all: 'unset', display: 'block', cursor: 'pointer', boxSizing: 'border-box',
        width: '100%', flex: 1, minHeight: 0, position: 'relative',
        borderRadius: 24,
        padding: '26px 24px',
        background: `linear-gradient(155deg, ${toRGBA(accent, 0.16)} 0%, rgba(255,255,255,0.025) 45%, ${toRGBA(accent, 0.06)} 100%)`,
        border: `1px solid ${toRGBA(accent, dim ? 0.28 : 0.5)}`,
        boxShadow: pressed
          ? `0 0 0 1px ${toRGBA(accent, 0.10)} inset, 0 6px 16px rgba(0,0,0,0.45), 0 0 24px ${toRGBA(accent, 0.18)}`
          : `0 0 0 1px ${toRGBA(accent, 0.06)} inset, 0 18px 40px rgba(0,0,0,0.55), 0 0 48px ${toRGBA(accent, dim ? 0.10 : 0.20)}`,
        transform: pressed ? 'translateY(1px) scale(0.992)' : 'translateY(0) scale(1)',
        transition: 'transform 160ms ease, box-shadow 220ms ease, opacity 200ms ease',
        overflow: 'hidden',
        opacity: dim ? 0.72 : 1,
        animation: `tileIn 480ms cubic-bezier(0.2,0.8,0.2,1) ${animationDelay}ms both`,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span aria-hidden="true" style={{
        position: 'absolute', top: -40, right: -40,
        width: 200, height: 200, borderRadius: '50%',
        background: `radial-gradient(circle, ${toRGBA(accent, 0.45)} 0%, transparent 65%)`,
        pointerEvents: 'none',
        animation: 'glowDrift 6s ease-in-out infinite',
      }} />

      <span aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(${toRGBA(accent, 0.06)} 1px, transparent 1px),
          linear-gradient(90deg, ${toRGBA(accent, 0.06)} 1px, transparent 1px)`,
        backgroundSize: '24px 24px',
        maskImage: 'radial-gradient(ellipse at 100% 0%, black 0%, transparent 70%)',
        WebkitMaskImage: 'radial-gradient(ellipse at 100% 0%, black 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <span aria-hidden="true" style={{
        position: 'absolute', left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent, ${toRGBA(accent, 0.55)}, transparent)`,
        boxShadow: `0 0 8px ${toRGBA(accent, 0.6)}`,
        animation: 'scanline 7s linear infinite',
        pointerEvents: 'none',
        opacity: 0.5,
      }} />

      {comingSoon && (
        <span style={{
          position: 'absolute', top: 14, right: 14,
          fontFamily: T.mono, fontSize: 9, letterSpacing: '0.22em',
          textTransform: 'uppercase', color: accent,
          padding: '4px 8px', borderRadius: 99,
          background: toRGBA(accent, 0.12),
          border: `1px solid ${toRGBA(accent, 0.45)}`,
          textShadow: `0 0 8px ${toRGBA(accent, 0.5)}`,
        }}>
          Coming Soon
        </span>
      )}

      <div style={{
        position: 'relative', height: '100%',
        display: 'flex', flexDirection: 'column',
        gap: 14,
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: `
            linear-gradient(180deg, ${toRGBA(accent, 0.22)}, ${toRGBA(accent, 0.05)}),
            radial-gradient(ellipse at 30% 20%, ${toRGBA(accent, 0.20)}, transparent 70%)`,
          border: `1px solid ${toRGBA(accent, 0.55)}`,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), 0 0 22px ${toRGBA(accent, 0.34)}`,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="30" height="30" viewBox="0 0 24 24"
            style={{ filter: `drop-shadow(0 0 6px ${toRGBA(accent, 0.7)})` }}>
            {ICONS[iconKey](accent)}
          </svg>
        </div>

        <div style={{
          fontFamily: T.mono, fontSize: 10, letterSpacing: '0.22em',
          textTransform: 'uppercase', color: accent,
          textShadow: `0 0 8px ${toRGBA(accent, 0.5)}`,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: 99, background: accent,
            boxShadow: `0 0 8px ${accent}`,
          }} />
          {eyebrow}
        </div>

        <div style={{
          fontFamily: T.display, fontSize: 28, fontWeight: 600,
          color: T.text, letterSpacing: '-0.02em', lineHeight: 1.05,
        }}>
          {title}
        </div>

        <div style={{
          fontFamily: T.display, fontSize: 14, color: T.text2,
          letterSpacing: '-0.005em', lineHeight: 1.35,
        }}>
          {description}
        </div>

        <div style={{ flex: 1 }} />

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{
            fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: T.text3,
          }}>
            Tap to select
          </span>
          <span style={{
            width: 34, height: 34, borderRadius: 99,
            background: toRGBA(accent, 0.14),
            border: `1px solid ${toRGBA(accent, 0.4)}`,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: accent,
          }}>
            <svg width="11" height="11" viewBox="0 0 11 11">
              <path d="M3.5 1.5L7.5 5.5L3.5 9.5" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </div>
      </div>
    </button>
  );
}

export function ModeSelect({ onSelectFourStep, onSelectSmallChunker }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      padding: '0 0 16px', minHeight: 0,
    }}>
      <div style={{ padding: '8px 20px 6px' }}>
        <Eyebrow style={{ marginBottom: 12 }}>Execution Mode</Eyebrow>
        <h1 style={{
          fontFamily: T.display, fontWeight: 600, fontSize: 28, lineHeight: 1.05,
          letterSpacing: '-0.02em', color: T.text, margin: 0, marginBottom: 6,
        }}>
          Choose how to break it down.
        </h1>
        <p style={{
          fontFamily: T.display, fontSize: 13, color: T.text2,
          margin: 0, letterSpacing: '-0.005em',
        }}>
          Pick the pacing that matches your energy right now.
        </p>
      </div>

      <div style={{
        flex: 1, minHeight: 0,
        padding: '16px 16px 8px',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <ModeCard
          accent={T.cyan}
          eyebrow="MD-01 · Standard"
          title="4 Step Breakdown"
          description="Four focused execution steps."
          iconKey="grid"
          animationDelay={0}
          onTap={onSelectFourStep}
        />
        <ModeCard
          accent={T.amber}
          eyebrow="MD-02 · Granular"
          title="Small Chunker"
          description="Coming soon — smaller, more detailed steps."
          iconKey="layers"
          comingSoon
          animationDelay={90}
          onTap={onSelectSmallChunker}
        />
      </div>
    </div>
  );
}
