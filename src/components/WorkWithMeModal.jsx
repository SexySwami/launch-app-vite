import { useState, useEffect, useRef } from 'react';
import { T } from '../tokens.js';
import VIDEOS from '../data/workWithMeVideos.json';

const RESUME_KEY = 'launch:wwm-resume';

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
// asks /api/classify-task which category the active task falls into, then maps
// that to one of three video pools: a combined "computer" pool (computer_work +
// studying — desk/screen "work/study with me" videos), a separate "cleaning"
// pool, and a "general" pool of neutral pomodoro/focus-timer sessions (just a
// timer + ambient/lofi, no on-screen activity) for tasks done away from a
// screen. It cycles a randomized, no-repeat-until-exhausted queue from the
// chosen pool, and the play history persists across opens — so you won't see
// the same video again until every video in that pool has been shown, then it
// reshuffles. Falls back to the computer pool if classification fails.

// Classifier categories that share the combined "computer" video pool. Desk and
// study sessions both read as "someone working at a screen," so they merge.
const COMPUTER_CATEGORIES = ['computer_work', 'studying'];

// Maps a classifier category to its pool: a stable key + the source categories
// whose videos make up that pool. Cleaning and general each stand alone (general
// = neutral timer videos for non-screen tasks); everything else is the computer
// pool, which is also the fallback for an unknown/failed classification.
function poolFor(category) {
  if (category === 'cleaning') return { key: 'cleaning', cats: ['cleaning'] };
  if (category === 'cooking') return { key: 'cooking', cats: ['cooking'] };
  if (category === 'general') return { key: 'general', cats: ['general'] };
  return { key: 'computer', cats: COMPUTER_CATEGORIES };
}

export function WorkWithMeModal({ open, mission, description, onClose }) {
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState([]); // shuffled queue for the active pool
  const [pos, setPos] = useState(0);
  const [overrideVideo, setOverrideVideo] = useState(null); // { ...videoObj, startSec } for resume
  const reqIdRef = useRef(0);
  const poolRef = useRef(null); // pool `order` belongs to; persists across opens
  const iframeLoadTimeRef = useRef(null); // wall-clock time when current iframe loaded

  const canCallAPI = typeof window !== 'undefined'
    && /^https?:$/.test(window.location?.protocol || '');

  // Classify on open, then advance the pool's no-repeat queue. The queue and
  // position survive close/reopen (the component stays mounted), so the played
  // history is preserved until the pool is exhausted.
  useEffect(() => {
    if (!open) {
      iframeLoadTimeRef.current = null;
      setLoading(true); // arm loading for next open; keep order/pos/pool intact
      setOverrideVideo(null);
      return;
    }

    const reqId = ++reqIdRef.current;
    setLoading(true);

    const buildQueue = (pool) =>
      shuffle(VIDEOS.filter(v => pool.cats.includes(v.category)));

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

      const pool = poolFor(category);

      if (poolRef.current === pool.key && order.length > 0) {
        // Same pool → continue the current pass to a not-yet-seen video.
        // Only once the whole pass is exhausted do we reshuffle for a new one,
        // avoiding an immediate repeat of the last video shown.
        if (pos + 1 >= order.length) {
          const last = order[pos];
          const next = shuffle(order);
          if (next.length > 1 && next[0]?.video_id === last?.video_id) {
            [next[0], next[1]] = [next[1], next[0]];
          }
          setOrder(next);
          setPos(0);
        } else {
          setPos(pos + 1);
        }
      } else {
        // New pool (or first open) → start a fresh shuffled pass.
        setOrder(buildQueue(pool));
        setPos(0);
      }
      poolRef.current = pool.key;

      try {
        const saved = JSON.parse(localStorage.getItem(RESUME_KEY) || 'null');
        if (saved?.videoId && typeof saved.timestamp === 'number') {
          const resumeVideo = VIDEOS.find(v => v.video_id === saved.videoId);
          if (resumeVideo) {
            localStorage.removeItem(RESUME_KEY);
            setOverrideVideo({ ...resumeVideo, startSec: saved.timestamp });
          }
        }
      } catch {}

      setLoading(false);
    };
    run();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  const video = overrideVideo || order[pos] || null;
  const multiple = order.length > 1;
  const startSec = overrideVideo ? overrideVideo.startSec : (video?.start || 0);

  const handleClose = () => {
    if (video && iframeLoadTimeRef.current) {
      const elapsed = Math.floor((Date.now() - iframeLoadTimeRef.current) / 1000);
      try {
        localStorage.setItem(RESUME_KEY, JSON.stringify({
          videoId: video.video_id,
          timestamp: startSec + elapsed,
        }));
      } catch {}
    }
    onClose();
  };

  const goNext = () => {
    setOverrideVideo(null);
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
    setOverrideVideo(null);
    if (!multiple) return;
    setPos(pos - 1 < 0 ? order.length - 1 : pos - 1);
  };

  const arrowBtn = (side, onTap) => (
    <button
      onClick={onTap}
      aria-label={side === 'left' ? 'Previous video' : 'Next video'}
      style={{
        all: 'unset',
        cursor: 'pointer',
        width: 30, height: 30, borderRadius: 99,
        background: 'rgba(168,118,255,0.12)',
        border: `1px solid rgba(168,118,255,0.32)`,
        color: T.text2,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        transition: 'background 180ms ease, color 180ms ease',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <svg width="12" height="12" viewBox="0 0 14 14">
        {side === 'left'
          ? <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          : <path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>}
      </svg>
    </button>
  );

  return (
    <div
      onClick={handleClose}
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
          <button onClick={handleClose} aria-label="Close" style={{
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
                src={`https://www.youtube.com/embed/${video.video_id}?rel=0${startSec ? `&start=${startSec}` : ''}`}
                title={video.title}
                frameBorder="0"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                onLoad={() => { iframeLoadTimeRef.current = Date.now(); }}
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

        </div>

        {/* Creator + nav arrows */}
        <div style={{
          marginTop: 12, minHeight: 30,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}>
          {!loading && multiple && arrowBtn('left', goPrev)}
          <span style={{
            fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em',
            color: T.text3, textTransform: 'uppercase',
          }}>
            {!loading && video ? `by ${video.creator}` : ' '}
          </span>
          {!loading && multiple && arrowBtn('right', goNext)}
        </div>
      </div>
    </div>
  );
}
