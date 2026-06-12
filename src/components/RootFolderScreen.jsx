import { useEffect, useRef, useState, useCallback } from 'react';
import { T } from '../tokens.js';
import { Eyebrow } from './Eyebrow.jsx';
import { Telemetry } from './Telemetry.jsx';

function toRGBA(hex, a) {
  const m = hex.replace('#', '');
  const r = parseInt(m.substring(0, 2), 16);
  const g = parseInt(m.substring(2, 4), 16);
  const b = parseInt(m.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function flattenQueueWithMeta(items, categoryName) {
  const out = [];
  if (!Array.isArray(items)) return out;
  for (const item of items) {
    if (!item) continue;
    if (item.type === 'folder') {
      for (const child of (item.children || [])) {
        if (child && typeof child.text === 'string' && child.text.trim()) {
          out.push({ ...child, categoryName, folderName: item.text });
        }
      }
    } else if (typeof item.text === 'string' && item.text.trim()) {
      out.push({ ...item, categoryName, folderName: null });
    }
  }
  return out;
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
  'short-list': (color) => (
    <g stroke={color} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12,2.5 14.47,8.86 21.27,9.36 16.4,13.56 17.98,20.18 12,16.77 6.02,20.18 7.6,13.56 2.73,9.36 9.53,8.86"/>
    </g>
  ),
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
  dailies: (color) => (
    <g stroke={color} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
    </g>
  ),
  custom: (color) => (
    <g stroke={color} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8a2 2 0 0 1 2-2h3.17a2 2 0 0 1 1.42.59L10.83 8H19a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"/>
    </g>
  ),
};

function FolderTile({ folder, count, countKnown, animationDelay, onOpen, onDeleteRequest }) {
  const [pressed, setPressed] = useState(false);
  const accent = folder.accent;
  const isEmpty = countKnown && count === 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        cursor: 'pointer', boxSizing: 'border-box', flexShrink: 0,
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
        userSelect: 'none',
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
            {(ICONS[folder.iconKey] || ICONS.custom)(accent)}
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

          {/* Count badge + delete button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '4px 9px 4px 7px', borderRadius: 99,
              background: isEmpty || !countKnown ? 'rgba(255,255,255,0.03)' : toRGBA(accent, 0.10),
              border: `1px solid ${isEmpty || !countKnown ? T.hairlineSoft : toRGBA(accent, 0.32)}`,
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
            <button
              aria-label={`Delete ${folder.name}`}
              onClick={e => { e.stopPropagation(); onDeleteRequest(folder); }}
              style={{
                all: 'unset', cursor: 'pointer',
                width: 22, height: 22, borderRadius: 6,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                color: toRGBA(accent, 0.38),
                transition: 'color 160ms ease',
                flexShrink: 0,
              }}
              onPointerEnter={e => { e.currentTarget.style.color = toRGBA(accent, 0.9); }}
              onPointerLeave={e => { e.currentTarget.style.color = toRGBA(accent, 0.38); }}
            >
              <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                <path d="M2 3.5h10M5.5 3.5V2.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v1M5 3.5l.5 8M9 3.5l-.5 8M3.5 3.5l.5 8h6l.5-8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
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
    </div>
  );
}

export function RootFolderScreen({ folders, onOpen, resetKey = 0, onSearchSelect, onCreateFolder, onDeleteFolder }) {
  const [counts, setCounts] = useState(() => ({}));
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [allSearchItems, setAllSearchItems] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [hoveredResultIdx, setHoveredResultIdx] = useState(-1);
  const searchInputRef = useRef(null);
  const [creating, setCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const createInputRef = useRef(null);
  const [deleteConfirmFolder, setDeleteConfirmFolder] = useState(null);

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
  }, [folders, resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery('');
    setHoveredResultIdx(-1);
  };

  useEffect(() => {
    if (creating) {
      const t = setTimeout(() => createInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [creating]);

  const confirmCreate = useCallback(() => {
    const name = newFolderName.trim();
    setCreating(false);
    setNewFolderName('');
    if (name) onCreateFolder?.(name);
  }, [newFolderName, onCreateFolder]);

  const cancelCreate = () => {
    setCreating(false);
    setNewFolderName('');
  };

  const openSearch = async () => {
    if (searchOpen) { closeSearch(); return; }
    setSearchOpen(true);
    setSearchQuery('');
    setHoveredResultIdx(-1);
    const canCallAPI = typeof window !== 'undefined'
      && /^https?:$/.test(window.location?.protocol || '');
    if (!canCallAPI) return;
    setSearchLoading(true);
    try {
      const results = await Promise.all(
        folders.map(async (cat) => {
          try {
            const res = await fetch(`/api/queue?folder=${encodeURIComponent(cat.id)}`, { cache: 'no-store' });
            const data = await res.json().catch(() => ({}));
            return flattenQueueWithMeta(data?.items, cat.name);
          } catch { return []; }
        })
      );
      setAllSearchItems(results.flat());
    } catch {
      setAllSearchItems([]);
    }
    setSearchLoading(false);
  };

  const handleSearchSelect = (item) => {
    onSearchSelect && onSearchSelect(item);
    closeSearch();
  };

  useEffect(() => {
    if (searchOpen) {
      const t = setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [searchOpen]);

  const searchResults = searchQuery.trim()
    ? allSearchItems.filter(item =>
        item.text.toLowerCase().includes(searchQuery.toLowerCase().trim())
      )
    : [];

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      padding: '0 0 24px', minHeight: 0,
    }}>
      <div style={{ paddingTop: 8 }}>
        <Telemetry time="04:32:11 UTC" code="MC-04 / ROOT" state="STANDBY" />
      </div>

      <div style={{ padding: '20px 20px 6px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
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
        <button
          aria-label={searchOpen ? 'Close search' : 'Search checklists'}
          onClick={searchOpen ? closeSearch : openSearch}
          style={{
            all: 'unset', cursor: 'pointer', flexShrink: 0, marginTop: 4,
            width: 40, height: 40, borderRadius: 99,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: searchOpen ? 'rgba(255,192,72,0.12)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${searchOpen ? 'rgba(255,192,72,0.55)' : T.hairlineSoft}`,
            color: searchOpen ? T.amber : T.text3,
            boxShadow: searchOpen ? '0 0 16px rgba(255,192,72,0.22)' : 'none',
            transition: 'all 200ms ease',
          }}
        >
          <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
            <circle cx="7.5" cy="7.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M11.5 11.5L15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {searchOpen && (
        <>
          <div onClick={closeSearch} style={{ position: 'fixed', inset: 0, zIndex: 48 }} />
          <div style={{ padding: '0 16px 8px', position: 'relative', zIndex: 50 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(255,192,72,0.06)',
              border: '1px solid rgba(255,192,72,0.50)',
              borderRadius: 14,
              padding: '11px 14px',
              boxShadow: '0 0 0 4px rgba(255,192,72,0.07), 0 0 20px rgba(255,192,72,0.10)',
            }}>
              <svg width="15" height="15" viewBox="0 0 17 17" fill="none" style={{ flexShrink: 0, color: T.amber }}>
                <circle cx="7.5" cy="7.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M11.5 11.5L15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search all checklists…"
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  fontFamily: T.display, fontSize: 15, fontWeight: 500,
                  color: T.text, letterSpacing: '-0.005em', padding: 0, minWidth: 0,
                }}
              />
              <button
                onClick={closeSearch}
                style={{
                  all: 'unset', cursor: 'pointer',
                  width: 22, height: 22, borderRadius: 99,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  color: T.text3, fontSize: 13,
                  background: 'rgba(255,255,255,0.06)',
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>

            {searchQuery.trim() && (
              <div style={{
                background: 'rgba(6,10,18,0.98)',
                border: '1px solid rgba(255,192,72,0.28)',
                borderRadius: 16,
                marginTop: 8,
                overflow: 'hidden',
                maxHeight: 260,
                overflowY: 'auto',
                boxShadow: '0 4px 24px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,192,72,0.08)',
              }}>
                {searchLoading ? (
                  <div style={{ padding: '14px 16px', fontFamily: T.mono, fontSize: 11, color: T.text3 }}>
                    Searching…
                  </div>
                ) : searchResults.length === 0 ? (
                  <div style={{ padding: '14px 16px', fontFamily: T.mono, fontSize: 11, color: T.text3 }}>
                    No items found.
                  </div>
                ) : (
                  searchResults.map((item, i) => (
                    <button
                      key={item.id || i}
                      onClick={() => handleSearchSelect(item)}
                      onPointerEnter={() => setHoveredResultIdx(i)}
                      onPointerLeave={() => setHoveredResultIdx(-1)}
                      style={{
                        all: 'unset',
                        display: 'flex', flexDirection: 'column', gap: 2,
                        padding: '11px 16px',
                        width: '100%', boxSizing: 'border-box',
                        cursor: 'pointer',
                        background: hoveredResultIdx === i ? 'rgba(255,192,72,0.10)' : 'transparent',
                        borderLeft: `3px solid ${hoveredResultIdx === i ? T.amber : 'transparent'}`,
                        borderBottom: i < searchResults.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                        transition: 'background 120ms, border-color 120ms',
                      }}
                    >
                      <span style={{
                        fontFamily: T.display, fontSize: 14, fontWeight: 500, color: T.text,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {item.text}
                      </span>
                      <span style={{
                        fontFamily: T.mono, fontSize: 10.5, color: T.text3, letterSpacing: '0.02em',
                      }}>
                        {item.categoryName}{item.folderName ? ` — ${item.folderName}` : ''}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}

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
            onDeleteRequest={setDeleteConfirmFolder}
          />
        ))}

        {creating ? (
          <div style={{
            borderRadius: 22,
            padding: '14px 16px 14px 20px',
            background: 'rgba(255,255,255,0.04)',
            border: '1.5px solid rgba(255,255,255,0.22)',
            display: 'flex', alignItems: 'center', gap: 10,
            boxSizing: 'border-box',
          }}>
            <input
              ref={createInputRef}
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') confirmCreate();
                if (e.key === 'Escape') cancelCreate();
              }}
              placeholder="Folder name…"
              maxLength={60}
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                fontFamily: 'inherit', fontSize: 17, fontWeight: 600,
                color: 'rgba(255,255,255,0.9)', letterSpacing: '-0.02em', padding: 0,
              }}
            />
            <button
              onClick={confirmCreate}
              style={{
                all: 'unset', cursor: 'pointer', flexShrink: 0,
                width: 32, height: 32, borderRadius: 99,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(255,255,255,0.10)',
                border: '1px solid rgba(255,255,255,0.22)',
                color: 'rgba(255,255,255,0.85)',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1.5 6.5L4.5 9.5L10.5 2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button
              onClick={cancelCreate}
              style={{
                all: 'unset', cursor: 'pointer', flexShrink: 0,
                width: 32, height: 32, borderRadius: 99,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.40)',
              }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1.5 1.5L8.5 8.5M8.5 1.5L1.5 8.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            style={{
              all: 'unset', display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 8, cursor: 'pointer', boxSizing: 'border-box', width: '100%',
              borderRadius: 22, padding: '17px 20px',
              border: '1.5px dashed rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.30)',
              transition: 'border-color 160ms ease, color 160ms ease',
              WebkitTapHighlightColor: 'transparent',
              marginBottom: 8,
            }}
            onPointerEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; }}
            onPointerLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.30)'; }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <span style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              New Folder
            </span>
          </button>
        )}
      </div>

      {deleteConfirmFolder && (
        <div
          onClick={() => setDeleteConfirmFolder(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.72)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            padding: '0 24px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 340,
              background: 'linear-gradient(160deg, rgba(20,26,40,0.98) 0%, rgba(12,16,28,0.98) 100%)',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 24,
              padding: '28px 24px 22px',
              boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 14, marginBottom: 18,
              background: 'rgba(255,70,70,0.12)',
              border: '1px solid rgba(255,70,70,0.28)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,100,100,0.9)',
            }}>
              <svg width="20" height="20" viewBox="0 0 14 14" fill="none">
                <path d="M2 3.5h10M5.5 3.5V2.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v1M5 3.5l.5 8M9 3.5l-.5 8M3.5 3.5l.5 8h6l.5-8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 style={{
              fontFamily: T.display, fontWeight: 600, fontSize: 20,
              letterSpacing: '-0.02em', color: T.text, margin: '0 0 8px',
            }}>
              Delete "{deleteConfirmFolder.name}"?
            </h2>
            <p style={{
              fontFamily: T.display, fontSize: 14, color: T.text2,
              margin: '0 0 24px', lineHeight: 1.5,
            }}>
              This folder will be removed. Items inside it won't be recoverable.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setDeleteConfirmFolder(null)}
                style={{
                  all: 'unset', flex: 1, cursor: 'pointer',
                  height: 46, borderRadius: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  fontFamily: T.display, fontSize: 15, fontWeight: 500, color: T.text2,
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => { onDeleteFolder(deleteConfirmFolder.id); setDeleteConfirmFolder(null); }}
                style={{
                  all: 'unset', flex: 1, cursor: 'pointer',
                  height: 46, borderRadius: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(255,60,60,0.15)',
                  border: '1px solid rgba(255,80,80,0.40)',
                  fontFamily: T.display, fontSize: 15, fontWeight: 600,
                  color: 'rgba(255,110,110,1)',
                  boxShadow: '0 0 20px rgba(255,60,60,0.15)',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
