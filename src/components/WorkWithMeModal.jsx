import { useState, useEffect, useRef } from 'react';
import { T } from '../tokens.js';
import VIDEOS from '../data/workWithMeVideos.json';

// Fisher–Yates shuffle (returns a new array).
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// AI-classified body-doubling video picker for the Small Chunker. On open it
// asks /api/classify-task which of four categories the active task falls into,
// then cycles a randomized, no-repeat-until-exhausted queue of videos from
// that category. Falls back to the `general` category if classification fails.
export function WorkWithMeModal({ open, mission, description, onClose }) {
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState([]); // shuffled video queue for the category
  const [pos, setPos] = useState(0);
  const reqIdRef = useRef(0);

  const canCallAPI = typeof window !== 'undefined'
    && /^https?:$/.test(window.location?.protocol || '');

  // Classify on open; fully reset on close.
  useEffect(() => {
    if (!open) {
      setLoading(true);
      setOrder([]);
      setPos(0);
      return;
    }

    const reqId = ++reqIdRef.current;
    setLoading(true);
    setOrder([]);
    setPos(0);

    const pickFor = (category) => {
      const byCat = (c) => VIDEOS.filter(v => v.category === c);
      let list = byCat(category);
      if (list.length === 0) list = byCat('general'); // spec fallback
      return shuffle(list); // may be empty → graceful empty state
    };

    const run = async () => {
      let category = 'general';
      try {
        if (!canCallAPI) throw new Error('__skip_api__');
        const res = await fetch('/api/classify-task', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            mission: mission || '',
            ...(description ? { description: description.toString() } : {}),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (typeof data?.category === 'string' && data.category) category = data.category;
      } catch {
        category = 'general';
      }
      if (reqId !== reqIdRef.current) return; // superseded by a newer open/close
      setOrder(pickFor(category));
      setPos(0);
      setLoading(false);
    };
    run();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  const video = order[pos] || null;
  const multiple = order.length > 1;

  const goNext = () => {
    if (!multiple) return;
    if (pos + 1 >= order.length) {
      // Completed a full pass — reshuffle, avoiding an immediate repeat.
      const current = order[pos];
      const next = shuffle(order);
      if (next.length > 1 && next[0]?.video_id === current?.video_id) {
        [next[0], next[1]] = [next[1], next[0]];
      }
      setOrder(next);
      setPos(0);
    } else {
      setPos(pos + 1);
    }
  };

  const goPrev = () => {
    if (!multiple) return;
    setPos(pos - 1 < 0 ? order.length - 1 : pos - 1);
  };

  const arrowBtn = (side, onTap, enabled) => (
    <button
      onClick={onTap}
      disabled={!enabled}
      aria-label={side === 'left' ? 'Previous video' : 'Next video'}
      style={{
        all: 'unset',
        position: 'absolute', top: '50%', transform: 'translateY(-50%)',
        [side]: -14,
        cursor: enabled ? 'pointer' : 'default',
        width: 38, height: 38, borderRadius: 99,
        background: 'rgba(168,118,255,0.16)',
        border: `1px solid rgba(168,118,255,0.42)`,
        boxShadow: `0 0 16px rgba(168,118,255,0.28)`,
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        color: enabled ? T.text : T.text3,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2, opacity: enabled ? 1 : 0.4,
        transition: 'opacity 200ms ease',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 14 14">
        {side === 'left'
          ? <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          : <path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>}
      </svg>
    </button>
  );

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        background: 'rgba(2,4,8,0.66)',
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        animation: 'backdropIn 220ms ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 420,
          background: 'linear-gradient(160deg, rgba(255,255,255,0.08), rgba(255,255,255,0.025) 55%, rgba(168,118,255,0.05))',
          border: `1px solid rgba(168,118,255,0.42)`,
          borderRadius: 24,
          padding: '16px 18px 20px',
          boxShadow: `
            0 0 0 1px rgba(255,255,255,0.05) inset,
            0 30px 80px rgba(0,0,0,0.6),
            0 0 60px rgba(168,118,255,0.18)
          `,
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          animation: 'modalIn 280ms cubic-bezier(0.2,0.8,0.2,1)',
          position: 'relative', overflow: 'hidden',
        }}
      >
        <div style={{
          position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)',
          width: 240, height: 160,
          background: `radial-gradient(ellipse, rgba(168,118,255,0.28), transparent 70%)`,
          pointerEvents: 'none',
        }} />

        {/* Header */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 6, height: 6, borderRadius: 99, background: T.purple,
              boxShadow: `0 0 8px ${T.purple}`,
            }} />
            <span style={{
              fontFamily: T.mono, fontSize: 10, letterSpacing: '0.24em',
              color: T.purple, textTransform: 'uppercase', fontWeight: 600,
              textShadow: `0 0 8px ${T.purple}66`,
            }}>Work With Me</span>
          </div>
          <button onClick={onClose} aria-label="Close" style={{
            all: 'unset', cursor: 'pointer',
            width: 28, height: 28, borderRadius: 99,
            background: 'rgba(255,255,255,0.05)',
            border: `1px solid ${T.hairlineSoft}`,
            color: T.text2,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="9" height="9" viewBox="0 0 10 10"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
          </button>
        </div>

        {/* Video stage */}
        <div style={{
          position: 'relative', width: '90%', margin: '0 auto',
        }}>
          <div style={{
            position: 'relative', width: '100%', aspectRatio: '16 / 9',
            borderRadius: 14, overflow: 'hidden',
            background: 'rgba(0,0,0,0.5)',
            border: `1px solid ${T.hairlineSoft}`,
            boxShadow: `0 12px 40px rgba(0,0,0,0.5)`,
          }}>
            {loading ? (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 14,
                background: `linear-gradient(135deg, rgba(168,118,255,0.10), rgba(0,229,255,0.06))`,
              }}>
                <div style={{
                  fontFamily: T.mono, fontSize: 10, letterSpacing: '0.3em',
                  color: T.purple, textTransform: 'uppercase',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  textShadow: `0 0 12px ${T.purple}88`,
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: 99, background: T.purple,
                    boxShadow: `0 0 10px ${T.purple}`,
                    animation: 'pulse 1.4s ease-in-out infinite',
                  }} />
                  Finding your focus partner…
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 8, height: 8, borderRadius: 99,
                      background: T.purple,
                      animation: `pulse 1.2s ease-in-out ${i * 0.18}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            ) : video ? (
              <iframe
                key={video.video_id}
                width="100%" height="100%"
                src={`https://www.youtube.com/embed/${video.video_id}?rel=0`}
                title={video.title}
                frameBorder="0"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                style={{ position: 'absolute', inset: 0, border: 'none' }}
              />
            ) : (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 24px', textAlign: 'center',
                fontFamily: T.display, fontSize: 14, color: T.text2, lineHeight: 1.4,
              }}>
                No videos here yet — check back soon.
              </div>
            )}
          </div>

          {!loading && multiple && arrowBtn('left', goPrev, true)}
          {!loading && multiple && arrowBtn('right', goNext, true)}
        </div>

        {/* Creator */}
        <div style={{
          marginTop: 12, textAlign: 'center', minHeight: 16,
          fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em',
          color: T.text3, textTransform: 'uppercase',
        }}>
          {!loading && video ? `by ${video.creator}` : ' '}
        </div>
      </div>
    </div>
  );
}
