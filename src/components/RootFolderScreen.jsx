import { useEffect, useState } from 'react';
import { T } from '../tokens.js';
import { Eyebrow } from './Eyebrow.jsx';
import { Telemetry } from './Telemetry.jsx';

// Hex (#RRGGBB) → rgba string. Inlined here so tiles can render their own
// accent washes without a token table per folder.
function toRGBA(hex, a) {
  const m = hex.replace('#', '');
  const r = parseInt(m.substring(0, 2), 16);
  const g = parseInt(m.substring(2, 4), 16);
  const b = parseInt(m.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function countLeaves(items) {
  if (!Array.isArray(items)) return 0;
  let n = 0;
  for (const it of items) {
    if (it && it.type === 'folder') n += Array.isArray(it.children) ? it.children.length : 0;
    else n += 1;
  }
  return n;
}

const ICONS = {
  work: (color) => (
    <g stroke={color} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4.5" y="7.5" width="15" height="11" rx="1.5"/>
      <path d="M9 7.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v1.5"/>
      <path d="M4.5 12h15"/>
    </g>
  ),
  personal: (color) => (
    <g stroke={color} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8.5" r="3.2"/>
      <path d="M5.5 19a6.5 6.5 0 0 1 13 0"/>
    </g>
  ),
  health: (color) => (
    <g stroke={color} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12h3l2-4 2.5 8 2-5 1.5 1H20"/>
    </g>
  ),
};

function FolderTile({ folder, count, countKnown, animationDelay, onOpen }) {
  const [pressed, setPressed] = useState(false);
  const accent = folder.accent;
  const isEmpty = countKnown && count === 0;

  return (
    <button
      onClick={onOpen}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        all: 'unset', display: 'block', cursor: 'pointer', boxSizing: 'border-box',
        width: '100%', position: 'relative',
        borderRadius: 22,
        padding: '20px 20px 18px',
        background: `linear-gradient(155deg, ${toRGBA(accent, 0.14)} 0%, rgba(255,255,255,0.025) 45%, ${toRGBA(accent, 0.05)} 100%)`,
        border: `1px solid ${toRGBA(accent, 0.45)}`,
        boxShadow: pressed
          ? `0 0 0 1px ${toRGBA(accent, 0.10)} inset, 0 6px 16px rgba(0,0,0,0.45), 0 0 24px ${toRGBA(accent, 0.18)}`
          : `0 0 0 1px ${toRGBA(accent, 0.06)} inset, 0 18px 40px rgba(0,0,0,0.55), 0 0 48px ${toRGBA(accent, 0.18)}`,
        transform: pressed ? 'translateY(1px) scale(0.992)' : 'translateY(0) scale(1)',
        transition: 'transform 160ms ease, box-shadow 220ms ease',
        overflow: 'hidden',
        animation: `tileIn 480ms cubic-bezier(0.2,0.8,0.2,1) ${animationDelay}ms both`,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Drifting corner glow */}
      <span aria-hidden="true" style={{
        position: 'absolute', top: -40, right: -40,
        width: 180, height: 180, borderRadius: '50%',
        background: `radial-gradient(circle, ${toRGBA(accent, 0.45)} 0%, transparent 65%)`,
        pointerEvents: 'none',
        animation: 'glowDrift 6s ease-in-out infinite',
      }} />

      {/* Hairline cross-grid texture */}
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

      {/* Scan line */}
      <span aria-hidden="true" style={{
        position: 'absolute', left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent, ${toRGBA(accent, 0.55)}, transparent)`,
        boxShadow: `0 0 8px ${toRGBA(accent, 0.6)}`,
        animation: 'scanline 7s linear infinite',
        pointerEvents: 'none',
        opacity: 0.5,
      }} />

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Icon medallion */}
        <div style={{
          flexShrink: 0,
          width: 52, height: 52, borderRadius: 14,
          background: `
            linear-gradient(180deg, ${toRGBA(accent, 0.20)}, ${toRGBA(accent, 0.05)}),
            radial-gradient(ellipse at 30% 20%, ${toRGBA(accent, 0.18)}, transparent 70%)`,
          border: `1px solid ${toRGBA(accent, 0.55)}`,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), 0 0 18px ${toRGBA(accent, 0.32)}`,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24"
            style={{ filter: `drop-shadow(0 0 6px ${toRGBA(accent, 0.7)})` }}>
            {ICONS[folder.iconKey](accent)}
          </svg>
        </div>

        {/* Title + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: T.mono, fontSize: 9.5, letterSpacing: '0.22em',
            textTransform: 'uppercase', color: accent,
            display: 'flex', alignItems: 'center', gap: 6,
            textShadow: `0 0 8px ${toRGBA(accent, 0.5)}`,
            marginBottom: 4,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            <span style={{
              flexShrink: 0,
              width: 5, height: 5, borderRadius: 99, background: accent,
              boxShadow: `0 0 8px ${accent}`,
            }} />
            <span style={{
              overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0,
            }}>{folder.code} · {folder.tagline}</span>
          </div>
          <div style={{
            fontFamily: T.display, fontSize: 24, fontWeight: 600,
            color: T.text, letterSpacing: '-0.02em', lineHeight: 1.05,
            marginBottom: 8,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {folder.name}
          </div>

          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '4px 9px 4px 7px', borderRadius: 99,
            background: isEmpty || !countKnown ? 'rgba(255,255,255,0.03)' : toRGBA(accent, 0.10),
            border: `1px solid ${isEmpty || !countKnown ? T.hairlineSoft : toRGBA(accent, 0.32)}`,
            maxWidth: '100%',
          }}>
            <span style={{
              flexShrink: 0,
              width: 13, height: 13, borderRadius: 4,
              background: isEmpty || !countKnown ? 'transparent' : toRGBA(accent, 0.20),
              border: `1px solid ${isEmpty || !countKnown ? T.hairline : toRGBA(accent, 0.55)}`,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {countKnown && !isEmpty && (
                <svg width="7" height="7" viewBox="0 0 8 8">
                  <path d="M1.2 4l2 2 3.6-4.4" stroke={accent} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </span>
            <span style={{
              fontFamily: T.mono, fontSize: 9.5, letterSpacing: '0.16em',
              color: isEmpty || !countKnown ? T.text3 : T.text2, textTransform: 'uppercase',
              fontWeight: 500,
              whiteSpace: 'nowrap',
            }}>
              {!countKnown
                ? 'Loading…'
                : isEmpty
                  ? 'Empty · tap to start'
                  : `${count} ${count === 1 ? 'item' : 'items'}`}
            </span>
          </div>
        </div>

        <span style={{
          flexShrink: 0,
          width: 30, height: 30, borderRadius: 99,
          background: toRGBA(accent, 0.12),
          border: `1px solid ${toRGBA(accent, 0.32)}`,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: accent,
        }}>
          <svg width="10" height="10" viewBox="0 0 11 11">
            <path d="M3.5 1.5L7.5 5.5L3.5 9.5" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </div>
    </button>
  );
}

export function RootFolderScreen({ folders, onOpen }) {
  // Per-folder leaf counts fetched from /api/queue?folder=ID. Re-fetches when
  // the tab becomes visible so counts reflect changes made elsewhere.
  const [counts, setCounts] = useState(() => ({}));

  useEffect(() => {
    let cancelled = false;
    const canCallAPI = typeof window !== 'undefined'
      && /^https?:$/.test(window.location?.protocol || '');
    if (!canCallAPI) return;

    const load = async () => {
      const results = await Promise.all(folders.map(async (f) => {
        try {
          const res = await fetch(`/api/queue?folder=${encodeURIComponent(f.id)}`, { cache: 'no-store' });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) return [f.id, null];
          return [f.id, countLeaves(data.items)];
        } catch {
          return [f.id, null];
        }
      }));
      if (cancelled) return;
      const next = {};
      for (const [id, n] of results) next[id] = n;
      setCounts(next);
    };

    load();
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { cancelled = true; document.removeEventListener('visibilitychange', onVisible); };
  }, [folders]);

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      padding: '0 0 24px', minHeight: 0,
    }}>
      <div style={{ paddingTop: 8 }}>
        <Telemetry time="04:32:11 UTC" code="MC-04 / ROOT" state="STANDBY" />
      </div>

      <div style={{ padding: '20px 20px 6px' }}>
        <Eyebrow style={{ marginBottom: 12 }}>Workspace</Eyebrow>
        <h1 style={{
          fontFamily: T.display, fontWeight: 600, fontSize: 30, lineHeight: 1.05,
          letterSpacing: '-0.02em', color: T.text, margin: 0, marginBottom: 6,
        }}>
          Pick a checklist to launch from.
        </h1>
        <p style={{
          fontFamily: T.display, fontSize: 13, color: T.text2,
          margin: 0, letterSpacing: '-0.005em',
        }}>
          Every root folder holds an independent queue. Switch contexts, keep momentum.
        </p>
      </div>

      <div className="scroll-thin" style={{
        flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden',
        padding: '14px 16px 4px',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        {folders.map((f, i) => (
          <FolderTile
            key={f.id}
            folder={f}
            count={counts[f.id] ?? 0}
            countKnown={typeof counts[f.id] === 'number'}
            animationDelay={i * 70}
            onOpen={() => onOpen(f.id)}
          />
        ))}
      </div>
    </div>
  );
}
