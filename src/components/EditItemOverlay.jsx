import { useState, useEffect, useRef } from 'react';
import { T } from '../tokens.js';

// Edit-item overlay — modal/sheet for previewing AND editing a
// checklist item's full text.
//
// startMode = 'view': opens read-only — no cursor, no focus. Tapping
// the text switches to edit mode and lets the browser place the
// cursor at the tap point.
//
// startMode = 'edit': opens directly in edit mode with the textarea
// focused and caret at end (action-menu Edit Item entry).
//
// Tap on the backdrop or press Esc dismisses. If the text has been
// edited, an inline "Save changes?" panel appears with Save / Discard
// / Keep Editing instead of dismissing immediately.
export function EditItemOverlay({ item, saving, onCancel, onSave, startMode = 'edit' }) {
  const [text, setText] = useState(item?.text || '');
  const [description, setDescription] = useState(item?.description || '');
  const [descShown, setDescShown] = useState(!!(item?.description));
  const [mode, setMode] = useState(startMode);
  const [edited, setEdited] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const taRef = useRef(null);
  const descRef = useRef(null);

  // Auto-resize the textarea like the rest of the app's auto-resize inputs.
  const autoResize = (el) => {
    if (!el) return;
    el.style.height = 'auto';
    const MAX = 280;
    el.style.height = Math.min(el.scrollHeight, MAX) + 'px';
    el.style.overflowY = el.scrollHeight > MAX ? 'auto' : 'hidden';
  };

  // Resync when the editing target changes.
  useEffect(() => {
    setText(item?.text || '');
    setDescription(item?.description || '');
    setDescShown(!!(item?.description));
    setMode(startMode);
    setEdited(false);
    setConfirming(false);
  }, [item?.id, startMode]);

  // Auto-resize on text or mode change.
  useEffect(() => {
    autoResize(taRef.current);
    autoResize(descRef.current);
  }, [text, description, mode, confirming, descShown]);

  // Initial focus only when starting in edit mode (action-menu entry).
  useEffect(() => {
    if (startMode !== 'edit') return;
    const ta = taRef.current;
    if (!ta) return;
    const t = setTimeout(() => {
      ta.focus();
      const len = ta.value.length;
      try { ta.setSelectionRange(len, len); } catch {}
      autoResize(ta);
    }, 40);
    return () => clearTimeout(t);
  }, []);

  const attemptDismiss = () => {
    if (confirming) return;
    if (edited) setConfirming(true);
    else onCancel();
  };

  // Esc tries to dismiss (showing the confirm panel if needed).
  useEffect(() => {
    const h = (e) => {
      if (e.key !== 'Escape') return;
      if (confirming) { setConfirming(false); return; }
      attemptDismiss();
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [confirming, edited]);

  // Tap on the textarea in view mode → switch to edit mode. Setting state on
  // pointerdown means readOnly is already false by the time the browser
  // commits the tap, so iOS brings up the keyboard.
  const handleTextActivate = () => {
    if (mode === 'view') setMode('edit');
  };

  if (!item) return null;

  const canSave = text.trim().length > 0 && !saving;

  return (
    <div
      onClick={attemptDismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px 16px',
        background: 'rgba(2,4,8,0.66)',
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        animation: 'backdropIn 220ms ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 380,
          background: 'linear-gradient(160deg, rgba(168,118,255,0.12), rgba(255,255,255,0.025) 55%, rgba(168,118,255,0.04))',
          border: `1px solid rgba(168,118,255,0.5)`,
          borderRadius: 22,
          padding: '18px 16px 14px',
          boxShadow: `
            0 0 0 1px rgba(255,255,255,0.05) inset,
            0 30px 80px rgba(0,0,0,0.6),
            0 0 60px rgba(168,118,255,0.20)
          `,
          backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
          animation: 'modalIn 280ms cubic-bezier(0.2,0.8,0.2,1)',
          position: 'relative',
        }}
      >
        {confirming ? (
          // ── Unsaved-changes prompt ───────────────────────────────
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{
                width: 6, height: 6, borderRadius: 99, background: T.warn,
                boxShadow: `0 0 8px ${T.warn}`,
              }} />
              <span style={{
                fontFamily: T.mono, fontSize: 10, letterSpacing: '0.24em',
                color: T.warn, textTransform: 'uppercase', fontWeight: 600,
              }}>
                Unsaved Changes
              </span>
            </div>
            <h3 style={{
              fontFamily: T.display, fontSize: 20, fontWeight: 600,
              color: T.text, margin: '0 0 6px', letterSpacing: '-0.01em',
            }}>
              Save your edits?
            </h3>
            <p style={{
              fontFamily: T.display, fontSize: 13, color: T.text2,
              margin: '0 0 16px', lineHeight: 1.4,
            }}>
              Save to keep your changes, or discard to revert this item to its previous text.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={() => onSave(text, description)}
                disabled={!canSave}
                style={{
                  all: 'unset',
                  height: 48, borderRadius: 14,
                  background: canSave
                    ? `linear-gradient(180deg, rgba(0,229,255,0.22), rgba(61,127,255,0.14))`
                    : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${canSave ? 'rgba(0,229,255,0.55)' : T.hairlineSoft}`,
                  color: canSave ? T.text : T.text3,
                  fontFamily: T.display, fontSize: 13, fontWeight: 600,
                  letterSpacing: '0.04em', textTransform: 'uppercase',
                  cursor: canSave ? 'pointer' : 'not-allowed',
                  boxShadow: canSave
                    ? `0 0 20px rgba(0,229,255,0.22), inset 0 1px 0 rgba(255,255,255,0.05)`
                    : 'inset 0 1px 0 rgba(255,255,255,0.04)',
                  opacity: saving ? 0.7 : 1,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {saving ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 12 12" style={{ animation: 'spin360 800ms linear infinite' }}>
                      <path d="M10 6a4 4 0 1 1-1.2-2.85M10 1.5V4H7.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Saving…
                  </>
                ) : (
                  <>
                    Save Changes
                    <svg width="12" height="12" viewBox="0 0 12 12">
                      <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </>
                )}
              </button>
              <button
                onClick={onCancel}
                style={{
                  all: 'unset',
                  height: 44, borderRadius: 14,
                  background: 'rgba(255,179,71,0.08)',
                  border: `1px solid rgba(255,179,71,0.35)`,
                  color: T.warn,
                  fontFamily: T.display, fontSize: 13, fontWeight: 600,
                  letterSpacing: '0.04em', textTransform: 'uppercase',
                  cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Discard
              </button>
              <button
                onClick={() => setConfirming(false)}
                style={{
                  all: 'unset',
                  height: 40, borderRadius: 12,
                  background: T.surface,
                  border: `1px solid ${T.hairlineSoft}`,
                  color: T.text2,
                  fontFamily: T.mono, fontSize: 11, fontWeight: 600,
                  letterSpacing: '0.18em', textTransform: 'uppercase',
                  cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Keep Editing
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Eyebrow — flips between Preview and Edit Item */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              <span style={{
                width: 6, height: 6, borderRadius: 99,
                background: mode === 'view' ? T.cyan : T.purple,
                boxShadow: `0 0 8px ${mode === 'view' ? T.cyan : T.purple}`,
              }} />
              <span style={{
                fontFamily: T.mono, fontSize: 10, letterSpacing: '0.24em',
                color: mode === 'view' ? T.cyan : T.purple,
                textTransform: 'uppercase', fontWeight: 600,
                textShadow: `0 0 8px ${mode === 'view' ? T.cyan : T.purple}66`,
              }}>
                {mode === 'view' ? 'Item Preview' : 'Edit Item'}
              </span>
              {mode === 'view' && (
                <span style={{
                  fontFamily: T.mono, fontSize: 9, letterSpacing: '0.18em',
                  color: T.text3, textTransform: 'uppercase',
                }}>
                  · tap text to edit
                </span>
              )}
            </div>

            {/* Auto-expanding textarea. readOnly in view mode — tap promotes to edit. */}
            <textarea
              ref={taRef}
              className="scroll-thin"
              readOnly={mode === 'view'}
              value={text}
              onChange={(e) => { setText(e.target.value); setEdited(true); }}
              onPointerDown={handleTextActivate}
              onClick={handleTextActivate}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && text.trim()) {
                  e.preventDefault();
                  onSave(text, description);
                }
              }}
              placeholder="Item text…"
              rows={1}
              enterKeyHint="done"
              style={{
                all: 'unset',
                display: 'block', boxSizing: 'border-box',
                width: '100%',
                fontFamily: T.display, fontSize: 16, fontWeight: 500,
                color: T.text, letterSpacing: '-0.005em',
                lineHeight: 1.45,
                padding: '12px 14px',
                minHeight: 48, maxHeight: 280,
                resize: 'none',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                background: mode === 'view' ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${mode === 'view' ? T.hairline : 'rgba(168,118,255,0.4)'}`,
                borderRadius: 14,
                overflowY: 'hidden',
                boxShadow: mode === 'edit'
                  ? '0 0 0 3px rgba(168,118,255,0.08), inset 0 1px 0 rgba(255,255,255,0.04)'
                  : 'inset 0 1px 0 rgba(255,255,255,0.04)',
                marginBottom: 12,
                cursor: mode === 'view' ? 'text' : 'auto',
                transition: 'background 200ms ease, border-color 200ms ease, box-shadow 200ms ease',
              }}
            />

            {/* Description field / toggle */}
            {descShown ? (
              <textarea
                ref={descRef}
                className="scroll-thin"
                value={description}
                onChange={(e) => { setDescription(e.target.value); setEdited(true); }}
                placeholder="Add context, background, or details…"
                rows={1}
                style={{
                  all: 'unset',
                  display: 'block', boxSizing: 'border-box',
                  width: '100%',
                  fontFamily: T.display, fontSize: 14, fontWeight: 400,
                  color: T.text2, letterSpacing: '-0.003em',
                  lineHeight: 1.45,
                  padding: '10px 14px',
                  minHeight: 44, maxHeight: 200,
                  resize: 'none',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  background: 'rgba(168,118,255,0.04)',
                  border: `1px solid rgba(168,118,255,0.28)`,
                  borderRadius: 12,
                  overflowY: 'hidden',
                  marginBottom: 12,
                  cursor: 'auto',
                  transition: 'border-color 200ms ease',
                }}
              />
            ) : (
              <button
                onClick={() => setDescShown(true)}
                style={{
                  all: 'unset', cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  marginBottom: 12,
                  padding: '7px 12px', borderRadius: 10,
                  background: 'rgba(168,118,255,0.07)',
                  border: `1px solid rgba(168,118,255,0.25)`,
                  color: T.purple,
                  fontFamily: T.mono, fontSize: 10, fontWeight: 600,
                  letterSpacing: '0.18em', textTransform: 'uppercase',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <svg width="11" height="11" viewBox="0 0 11 11" style={{ flexShrink: 0 }}>
                  <path d="M5.5 2v7M2 5.5h7" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                </svg>
                Description
              </button>
            )}

            {/* Bottom buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={attemptDismiss}
                style={{
                  all: 'unset',
                  flex: 1, height: 50, borderRadius: 14,
                  background: T.surface,
                  border: `1px solid ${T.hairline}`,
                  color: T.text2,
                  fontFamily: T.display, fontSize: 13, fontWeight: 600,
                  letterSpacing: '0.04em', textTransform: 'uppercase',
                  cursor: 'pointer',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                  WebkitTapHighlightColor: 'transparent',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {edited ? 'Cancel' : 'Close'}
              </button>
              <button
                onClick={() => canSave && onSave(text, description)}
                disabled={!canSave || (mode === 'view' && !edited)}
                style={{
                  all: 'unset',
                  flex: 1, height: 50, borderRadius: 14,
                  background: (canSave && (mode === 'edit' || edited))
                    ? `linear-gradient(180deg, rgba(0,229,255,0.22), rgba(61,127,255,0.14))`
                    : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${(canSave && (mode === 'edit' || edited)) ? 'rgba(0,229,255,0.55)' : T.hairlineSoft}`,
                  color: (canSave && (mode === 'edit' || edited)) ? T.text : T.text3,
                  fontFamily: T.display, fontSize: 13, fontWeight: 600,
                  letterSpacing: '0.04em', textTransform: 'uppercase',
                  cursor: (canSave && (mode === 'edit' || edited)) ? 'pointer' : 'not-allowed',
                  boxShadow: (canSave && (mode === 'edit' || edited))
                    ? `0 0 20px rgba(0,229,255,0.22), inset 0 1px 0 rgba(255,255,255,0.05)`
                    : 'inset 0 1px 0 rgba(255,255,255,0.04)',
                  opacity: saving ? 0.7 : 1,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {saving ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 12 12" style={{ animation: 'spin360 800ms linear infinite' }}>
                      <path d="M10 6a4 4 0 1 1-1.2-2.85M10 1.5V4H7.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Saving…
                  </>
                ) : (
                  <>
                    Save
                    <svg width="12" height="12" viewBox="0 0 12 12">
                      <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
