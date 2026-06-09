import { useState, useEffect } from 'react';
import { T } from '../tokens.js';
import { Eyebrow } from './Eyebrow.jsx';
import { Telemetry } from './Telemetry.jsx';

export function CompletedSteps({ onBack }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [restoringId, setRestoringId] = useState(null);
  const [todayOpen, setTodayOpen] = useState(true);
  const [prevDaysOpen, setPrevDaysOpen] = useState(false);
  const [expandedDates, setExpandedDates] = useState(() => new Set());
  const [detailItem, setDetailItem] = useState(null);

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

  const toggleDate = (dk) => {
    setExpandedDates(prev => {
      const next = new Set(prev);
      if (next.has(dk)) next.delete(dk);
      else next.add(dk);
      return next;
    });
  };

  const handleRestore = async (id) => {
    if (restoringId) return;
    setRestoringId(id);
    setError(null);
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

  // Group items by local date
  const todayKey = localDateKey(Date.now());
  const todayItems = items.filter(e => e.completedAt && localDateKey(e.completedAt) === todayKey);
  const prevItems = items.filter(e => e.completedAt && localDateKey(e.completedAt) !== todayKey);
  const prevByDate = {};
  for (const e of prevItems) {
    const dk = localDateKey(e.completedAt);
    if (!prevByDate[dk]) prevByDate[dk] = [];
    prevByDate[dk].push(e);
  }
  const prevDates = Object.keys(prevByDate).sort((a, b) => b.localeCompare(a));

  const renderItem = (entry) => {
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
        <div
          onClick={() => toggleExpand(entry.id)}
          onDoubleClick={(e) => { e.stopPropagation(); setDetailItem(entry); }}
          role="button" tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpand(entry.id); } }}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 4px 12px 14px', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
        >
          <div style={{
            width: 26, height: 26, borderRadius: 99, flexShrink: 0,
            background: `linear-gradient(180deg, ${T.teal}, ${T.cyan})`,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: '#001018', boxShadow: `0 0 12px rgba(79,227,193,0.4)`,
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: T.display, fontSize: 14, fontWeight: 600, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {entry.text}
            </div>
            <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.18em', color: T.text3, textTransform: 'uppercase', marginTop: 3 }}>
              {microSteps.length} step{microSteps.length === 1 ? '' : 's'} logged
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); toggleExpand(entry.id); }}
            aria-label={expanded ? 'Collapse' : 'Expand'}
            style={{ all: 'unset', cursor: 'pointer', flexShrink: 0, width: 32, height: 32, borderRadius: 99, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: T.text2 }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" style={{ transition: 'transform 200ms ease', transform: expanded ? 'rotate(180deg)' : 'none' }}>
              <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleRestore(entry.id); }}
            disabled={restoringId === entry.id}
            aria-label="Remove from completed (restore to checklist)"
            style={{ all: 'unset', cursor: restoringId === entry.id ? 'default' : 'pointer', flexShrink: 0, width: 32, height: 32, borderRadius: 99, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: restoringId === entry.id ? T.text3 : T.text2, opacity: restoringId === entry.id ? 0.6 : 1 }}
          >
            <svg width="11" height="11" viewBox="0 0 10 10">
              <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        {expanded && (
          <div style={{ borderTop: `1px solid rgba(79,227,193,0.18)`, padding: '10px 14px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {hasSteps ? microSteps.map((ms, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.hairlineSoft}`, borderRadius: 10 }}>
                <div style={{ width: 18, height: 18, borderRadius: 99, flexShrink: 0, background: 'rgba(79,227,193,0.16)', border: `1px solid rgba(79,227,193,0.45)`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: T.teal }}>
                  <svg width="9" height="9" viewBox="0 0 10 10">
                    <path d="M1.5 5l2.5 2.5 5-5.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                {ms.tag && (
                  <span style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.18em', color: T.cyan, textTransform: 'uppercase', fontWeight: 700, flexShrink: 0 }}>
                    {ms.tag}
                  </span>
                )}
                <span style={{ flex: 1, minWidth: 0, fontFamily: T.display, fontSize: 13, color: T.text2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {ms.title}
                </span>
              </div>
            )) : (
              <div style={{ fontFamily: T.mono, fontSize: 9.5, letterSpacing: '0.18em', color: T.text3, textTransform: 'uppercase', textAlign: 'center', padding: '12px 8px' }}>
                No micro-steps logged for this mission
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '8px 0 24px' }}>
      <Telemetry
        time={`LOG ${String(items.length).padStart(2, '0')}`}
        code="MC-04 / COMPLETED"
        state="ARCHIVE"
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 24px 14px', flexShrink: 0 }}>
        <button
          onClick={onBack}
          aria-label="Back"
          style={{ all: 'unset', cursor: 'pointer', flexShrink: 0, width: 36, height: 36, borderRadius: 99, background: T.surface, border: `1px solid ${T.hairlineSoft}`, color: T.text2, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14">
            <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Eyebrow color={T.teal} style={{ marginBottom: 4 }}>Completed Steps</Eyebrow>
          <div style={{ fontFamily: T.display, fontSize: 22, fontWeight: 600, color: T.text, letterSpacing: '-0.015em', lineHeight: 1.15 }}>
            {items.length} {items.length === 1 ? 'mission' : 'missions'} logged
          </div>
        </div>
      </div>

      {error && (
        <div style={{ fontFamily: T.mono, fontSize: 9.5, letterSpacing: '0.18em', color: T.warn, textTransform: 'uppercase', textAlign: 'center', padding: '0 24px 12px' }}>
          {error}
        </div>
      )}

      {detailItem && <ItemDetailOverlay item={detailItem} onClose={() => setDetailItem(null)} />}

      <div className="scroll-thin" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 24px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.22em', color: T.text3, textTransform: 'uppercase', textAlign: 'center', padding: '24px 0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: 99, background: T.cyan, boxShadow: `0 0 8px ${T.cyan}`, animation: 'pulse 1.2s ease-in-out infinite' }} />
            Loading completed missions…
          </div>
        ) : (
          <>
            <DateFolder
              label="Previous Days"
              open={prevDaysOpen}
              onToggle={() => setPrevDaysOpen(o => !o)}
            >
              {prevDates.length === 0 ? (
                <FolderEmpty>No previous completed items.</FolderEmpty>
              ) : prevDates.map(dk => (
                <DateFolder
                  key={dk}
                  label={formatDateLabel(dk)}
                  open={expandedDates.has(dk)}
                  onToggle={() => toggleDate(dk)}
                  sub
                  count={prevByDate[dk].length}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {prevByDate[dk].map(entry => renderItem(entry))}
                  </div>
                </DateFolder>
              ))}
            </DateFolder>

            <DateFolder
              label={`Today — ${formatDateLabel(todayKey)}`}
              open={todayOpen}
              onToggle={() => setTodayOpen(o => !o)}
              teal
              count={todayItems.length}
            >
              {todayItems.length === 0 ? (
                <FolderEmpty>Nothing completed today yet.</FolderEmpty>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {todayItems.map(entry => renderItem(entry))}
                </div>
              )}
            </DateFolder>
          </>
        )}
      </div>
    </div>
  );
}

function ItemDetailOverlay({ item, onClose }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
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
          background: 'linear-gradient(160deg, rgba(79,227,193,0.10), rgba(255,255,255,0.025) 55%, rgba(79,227,193,0.04))',
          border: `1px solid rgba(79,227,193,0.45)`,
          borderRadius: 22,
          padding: '18px 16px 14px',
          boxShadow: `
            0 0 0 1px rgba(255,255,255,0.05) inset,
            0 30px 80px rgba(0,0,0,0.6),
            0 0 60px rgba(79,227,193,0.18)
          `,
          backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
          animation: 'modalIn 280ms cubic-bezier(0.2,0.8,0.2,1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{
            width: 6, height: 6, borderRadius: 99,
            background: T.teal, boxShadow: `0 0 8px ${T.teal}`,
          }} />
          <span style={{
            fontFamily: T.mono, fontSize: 10, letterSpacing: '0.24em',
            color: T.teal, textTransform: 'uppercase', fontWeight: 600,
            textShadow: `0 0 8px ${T.teal}66`,
          }}>
            Item Preview
          </span>
        </div>

        <div style={{
          width: '100%', boxSizing: 'border-box',
          fontFamily: T.display, fontSize: 16, fontWeight: 500,
          color: T.text, letterSpacing: '-0.005em', lineHeight: 1.45,
          padding: '12px 14px',
          background: 'rgba(255,255,255,0.025)',
          border: `1px solid ${T.hairline}`,
          borderRadius: 14,
          marginBottom: item.description ? 12 : 14,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {item.text}
        </div>

        {item.description && (
          <div style={{
            width: '100%', boxSizing: 'border-box',
            fontFamily: T.display, fontSize: 14, fontWeight: 400,
            color: T.text2, letterSpacing: '-0.003em', lineHeight: 1.45,
            padding: '10px 14px',
            background: 'rgba(79,227,193,0.04)',
            border: `1px solid rgba(79,227,193,0.22)`,
            borderRadius: 12,
            marginBottom: 14,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {item.description}
          </div>
        )}

        <button
          onClick={onClose}
          style={{
            all: 'unset', boxSizing: 'border-box',
            width: '100%', height: 50, borderRadius: 14,
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
          Close
        </button>
      </div>
    </div>
  );
}

function DateFolder({ label, open, onToggle, teal, sub, count, children }) {
  return (
    <div style={{
      background: teal
        ? 'linear-gradient(180deg, rgba(79,227,193,0.07), rgba(255,255,255,0.02))'
        : 'rgba(255,255,255,0.02)',
      border: `1px solid ${teal ? 'rgba(79,227,193,0.26)' : sub ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.1)'}`,
      borderRadius: sub ? 12 : 16,
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      <div
        onClick={onToggle}
        role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: sub ? '10px 12px' : '13px 16px', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
      >
        <div style={{
          width: sub ? 22 : 28, height: sub ? 22 : 28,
          borderRadius: 7, flexShrink: 0,
          background: teal ? 'rgba(79,227,193,0.14)' : 'rgba(255,255,255,0.06)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: teal ? T.teal : T.text3,
        }}>
          <svg width={sub ? 11 : 13} height={sub ? 11 : 13} viewBox="0 0 14 12" fill="none">
            <path d="M1 3.5A1.5 1.5 0 012.5 2h3l1.5 2H12a1.5 1.5 0 011.5 1.5v5A1.5 1.5 0 0112 12H2.5A1.5 1.5 0 011 10.5v-7z" stroke="currentColor" strokeWidth="1.3"/>
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: T.display, fontSize: sub ? 13 : 15, fontWeight: 600, color: teal ? T.text : T.text2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {label}
          </div>
          {typeof count === 'number' && count > 0 && (
            <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '0.18em', color: T.text3, textTransform: 'uppercase', marginTop: 2 }}>
              {count} {count === 1 ? 'mission' : 'missions'}
            </div>
          )}
        </div>
        <svg
          width="12" height="12" viewBox="0 0 12 12"
          style={{ transition: 'transform 200ms ease', transform: open ? 'rotate(180deg)' : 'none', color: T.text3, flexShrink: 0 }}
        >
          <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      {open && (
        <div style={{
          borderTop: `1px solid ${teal ? 'rgba(79,227,193,0.14)' : 'rgba(255,255,255,0.06)'}`,
          padding: sub ? '8px 10px 10px' : '10px 12px 12px',
          display: 'flex', flexDirection: 'column', gap: sub ? 6 : 8,
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

function FolderEmpty({ children }) {
  return (
    <div style={{
      fontFamily: T.mono, fontSize: 9.5, letterSpacing: '0.18em',
      color: T.text3, textTransform: 'uppercase',
      textAlign: 'center', padding: '16px 8px',
    }}>
      {children}
    </div>
  );
}

function localDateKey(ts) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateLabel(dateKey) {
  const [y, mo, d] = dateKey.split('-').map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}
