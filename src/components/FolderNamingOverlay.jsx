import { useState, useEffect, useRef } from 'react';
import { T } from '../tokens.js';

// FolderNamingOverlay — appears right after a folder is auto-created
// via the 2-second drag-hold gesture. Auto-focuses, Enter saves,
// Skip leaves the folder named whatever was already there (default '').
export function FolderNamingOverlay({ folder, onSkip, onSave }) {
  const [name, setName] = useState(folder?.name || '');
  const inRef = useRef(null);

  useEffect(() => { setName(folder?.name || ''); }, [folder?.id]);

  useEffect(() => {
    const t = setTimeout(() => { inRef.current?.focus(); }, 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onSkip(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onSkip]);

  if (!folder) return null;
  const childCount = Array.isArray(folder.children) ? folder.children.length : 0;
  const canSave = name.trim().length > 0;

  return (
    <div
      onClick={onSkip}
      style={{
        position: 'fixed', inset: 0, zIndex: 210,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px 16px',
        background: 'rgba(2,4,8,0.7)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        animation: 'backdropIn 220ms ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 360,
          background: 'linear-gradient(160deg, rgba(168,118,255,0.16), rgba(255,255,255,0.025) 55%, rgba(168,118,255,0.06))',
          border: `1px solid rgba(168,118,255,0.6)`,
          borderRadius: 22,
          padding: '20px 18px 16px',
          boxShadow: `
            0 0 0 1px rgba(255,255,255,0.05) inset,
            0 30px 80px rgba(0,0,0,0.65),
            0 0 60px rgba(168,118,255,0.30)
          `,
          backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
          animation: 'modalIn 280ms cubic-bezier(0.2,0.8,0.2,1)',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `linear-gradient(180deg, ${T.purple}, rgba(168,118,255,0.6))`,
            color: '#0e0820',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 14px rgba(168,118,255,0.5), inset 0 1px 0 rgba(255,255,255,0.18)`,
            flexShrink: 0,
            animation: 'folderPop 380ms cubic-bezier(0.2,0.8,0.2,1)',
          }}>
            <svg width="16" height="16" viewBox="0 0 14 14">
              <path d="M1.5 3.5a1 1 0 0 1 1-1h3l1 1.2h5a1 1 0 0 1 1 1V11a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V3.5z" fill="currentColor"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: T.mono, fontSize: 10, letterSpacing: '0.24em',
              color: T.purple, textTransform: 'uppercase', fontWeight: 600,
              marginBottom: 2,
            }}>
              New Folder
            </div>
            <div style={{
              fontFamily: T.mono, fontSize: 9.5, letterSpacing: '0.18em',
              color: T.text3, textTransform: 'uppercase',
            }}>
              {childCount} {childCount === 1 ? 'item' : 'items'} inside
            </div>
          </div>
        </div>

        {/* Name input */}
        <input
          ref={inRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && canSave) {
              e.preventDefault();
              onSave(name.trim());
            }
          }}
          placeholder="Name this folder…"
          maxLength={200}
          enterKeyHint="done"
          style={{
            all: 'unset',
            display: 'block', boxSizing: 'border-box',
            width: '100%',
            fontFamily: T.display, fontSize: 18, fontWeight: 600,
            color: T.text, letterSpacing: '-0.01em',
            padding: '12px 14px',
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid rgba(168,118,255,0.45)`,
            borderRadius: 14,
            boxShadow: '0 0 0 3px rgba(168,118,255,0.10), inset 0 1px 0 rgba(255,255,255,0.04)',
            marginBottom: 14,
          }}
        />

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onSkip}
            style={{
              all: 'unset',
              flex: 1, height: 48, borderRadius: 14,
              background: T.surface,
              border: `1px solid ${T.hairline}`,
              color: T.text2,
              fontFamily: T.display, fontSize: 13, fontWeight: 600,
              letterSpacing: '0.04em', textTransform: 'uppercase',
              cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Skip
          </button>
          <button
            onClick={() => canSave && onSave(name.trim())}
            disabled={!canSave}
            style={{
              all: 'unset',
              flex: 1, height: 48, borderRadius: 14,
              background: canSave
                ? `linear-gradient(180deg, rgba(168,118,255,0.30), rgba(168,118,255,0.16))`
                : 'rgba(255,255,255,0.04)',
              border: `1px solid ${canSave ? 'rgba(168,118,255,0.65)' : T.hairlineSoft}`,
              color: canSave ? T.text : T.text3,
              fontFamily: T.display, fontSize: 13, fontWeight: 600,
              letterSpacing: '0.04em', textTransform: 'uppercase',
              cursor: canSave ? 'pointer' : 'not-allowed',
              boxShadow: canSave
                ? `0 0 20px rgba(168,118,255,0.30), inset 0 1px 0 rgba(255,255,255,0.05)`
                : 'inset 0 1px 0 rgba(255,255,255,0.04)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Name Folder
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
