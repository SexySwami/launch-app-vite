import { useState, useEffect } from 'react';
import { T } from '../tokens.js';
import { Eyebrow } from './Eyebrow.jsx';
import { Telemetry } from './Telemetry.jsx';

// Lists all finalized missions, expandable to reveal their logged
// micro-steps, with X buttons that restore the item to the active queue.
export function CompletedSteps({ onBack }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [restoringId, setRestoringId] = useState(null);

  const canCallAPI = typeof window !== 'undefined'
    && /^https?:$/.test(window.location?.protocol || '');

  useEffect(() => {
    if (!canCallAPI) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/completed', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || `Failed (${res.status})`);
        setItems(Array.isArray(data.items) ? data.items : []);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load completed list');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRestore = async (id) => {
    if (restoringId) return;
    setRestoringId(id);
    setError(null);
    // Optimistic remove from this view.
    const before = items;
    setItems(prev => prev.filter(i => i.id !== id));
    try {
      const res = await fetch('/api/completed?action=restore', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Failed (${res.status})`);
      if (Array.isArray(data.items)) setItems(data.items);
    } catch (err) {
      setItems(before);
      setError(err.message || 'Could not restore item');
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '8px 0 24px' }}>
      <Telemetry
        time={`LOG ${String(items.length).padStart(2, '0')}`}
        code="MC-04 / COMPLETED"
        state="ARCHIVE"
      />

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 24px 14px', flexShrink: 0 }}>
        <button
          onClick={onBack}
          aria-label="Back"
          style={{
            all: 'unset', cursor: 'pointer', flexShrink: 0,
            width: 36, height: 36, borderRadius: 99,
            background: T.surface,
            border: `1px solid ${T.hairlineSoft}`,
            color: T.text2,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14">
            <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Eyebrow color={T.teal} style={{ marginBottom: 4 }}>Completed Steps</Eyebrow>
          <div style={{
            fontFamily: T.display, fontSize: 22, fontWeight: 600,
            color: T.text, letterSpacing: '-0.015em', lineHeight: 1.15,
          }}>
            {items.length} {items.length === 1 ? 'mission' : 'missions'} logged
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          fontFamily: T.mono, fontSize: 9.5, letterSpacing: '0.18em',
          color: T.warn, textTransform: 'uppercase',
          textAlign: 'center', padding: '0 24px 12px',
        }}>
          {error}
        </div>
      )}

      {/* List */}
      <div className="scroll-thin" style={{
        flex: 1, minHeight: 0, overflowY: 'auto',
        padding: '0 24px 8px',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        {loading ? (
          <div style={{
            fontFamily: T.mono, fontSize: 10, letterSpacing: '0.22em',
            color: T.text3, textTransform: 'uppercase',
            textAlign: 'center', padding: '24px 0',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: 99, background: T.cyan,
              boxShadow: `0 0 8px ${T.cyan}`,
              animation: 'pulse 1.2s ease-in-out infinite',
            }} />
            Loading completed missions…
          </div>
        ) : items.length === 0 ? (
          <div style={{
            fontFamily: T.mono, fontSize: 10, letterSpacing: '0.22em',
            color: T.text3, textTransform: 'uppercase',
            textAlign: 'center', padding: '40px 24px', lineHeight: 1.6,
          }}>
            Nothing here yet.
            <br />
            Complete a mission to see it logged.
          </div>
        ) : items.map(entry => {
          const expanded = expandedIds.has(entry.id);
          const microSteps = Array.isArray(entry.microSteps) ? entry.microSteps : [];
          const hasSteps = microSteps.length > 0;

          return (
            <div key={entry.id} style={{
              background: 'linear-gradient(180deg, rgba(79,227,193,0.06), rgba(255,255,255,0.02))',
              border: `1px solid rgba(79,227,193,0.22)`,
              borderRadius: 14,
              overflow: 'hidden',
              flexShrink: 0,
            }}>
              {/* Row header */}
              <div
                onClick={() => toggleExpand(entry.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpand(entry.id); } }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 4px 12px 14px',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {/* Checkmark badge */}
                <div style={{
                  width: 26, height: 26, borderRadius: 99, flexShrink: 0,
                  background: `linear-gradient(180deg, ${T.teal}, ${T.cyan})`,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  color: '#001018',
                  boxShadow: `0 0 12px rgba(79,227,193,0.4)`,
                }}>
                  <svg width="12" height="12" viewBox="0 0 12 12">
                    <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                {/* Text + sub-meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: T.display, fontSize: 14, fontWeight: 600, color: T.text,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {entry.text}
                  </div>
                  <div style={{
                    fontFamily: T.mono, fontSize: 9, letterSpacing: '0.18em',
                    color: T.text3, textTransform: 'uppercase', marginTop: 3,
                  }}>
                    {microSteps.length} step{microSteps.length === 1 ? '' : 's'} logged
                    {entry.completedAt ? ` · ${formatRelative(entry.completedAt)}` : ''}
                  </div>
                </div>
                {/* Dropdown chevron */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleExpand(entry.id); }}
                  aria-label={expanded ? 'Collapse' : 'Expand'}
                  style={{
                    all: 'unset', cursor: 'pointer', flexShrink: 0,
                    width: 32, height: 32, borderRadius: 99,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    color: T.text2,
                  }}
                >
                  <svg
                    width="12" height="12" viewBox="0 0 12 12"
                    style={{ transition: 'transform 200ms ease', transform: expanded ? 'rotate(180deg)' : 'none' }}
                  >
                    <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {/* Remove / restore button */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleRestore(entry.id); }}
                  disabled={restoringId === entry.id}
                  aria-label="Remove from completed (restore to checklist)"
                  style={{
                    all: 'unset', cursor: restoringId === entry.id ? 'default' : 'pointer',
                    flexShrink: 0,
                    width: 32, height: 32, borderRadius: 99,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    color: restoringId === entry.id ? T.text3 : T.text2,
                    opacity: restoringId === entry.id ? 0.6 : 1,
                  }}
                >
                  <svg width="11" height="11" viewBox="0 0 10 10">
                    <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>

              {/* Expanded sub-steps */}
              {expanded && (
                <div style={{
                  borderTop: `1px solid rgba(79,227,193,0.18)`,
                  padding: '10px 14px 12px',
                  display: 'flex', flexDirection: 'column', gap: 6,
                }}>
                  {hasSteps ? (
                    microSteps.map((ms, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 10px',
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${T.hairlineSoft}`,
                        borderRadius: 10,
                      }}>
                        <div style={{
                          width: 18, height: 18, borderRadius: 99, flexShrink: 0,
                          background: 'rgba(79,227,193,0.16)',
                          border: `1px solid rgba(79,227,193,0.45)`,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          color: T.teal,
                        }}>
                          <svg width="9" height="9" viewBox="0 0 10 10">
                            <path d="M1.5 5l2.5 2.5 5-5.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        {ms.tag && (
                          <span style={{
                            fontFamily: T.mono, fontSize: 9, letterSpacing: '0.18em',
                            color: T.cyan, textTransform: 'uppercase', fontWeight: 700,
                            flexShrink: 0,
                          }}>
                            {ms.tag}
                          </span>
                        )}
                        <span style={{
                          flex: 1, minWidth: 0,
                          fontFamily: T.display, fontSize: 13, color: T.text2,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {ms.title}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div style={{
                      fontFamily: T.mono, fontSize: 9.5, letterSpacing: '0.18em',
                      color: T.text3, textTransform: 'uppercase',
                      textAlign: 'center', padding: '12px 8px',
                    }}>
                      No micro-steps logged for this mission
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatRelative(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return `${Math.floor(diff / 86400_000)}d ago`;
}
