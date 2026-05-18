import { Fragment, useState, useEffect, useRef } from 'react';
import { T } from '../tokens.js';
import { Eyebrow } from './Eyebrow.jsx';
import { Telemetry } from './Telemetry.jsx';
import { GlowButton } from './GlowButton.jsx';
import { DropIndicator } from './DropIndicator.jsx';
import { EditItemOverlay } from './EditItemOverlay.jsx';
import { FolderNamingOverlay } from './FolderNamingOverlay.jsx';

export function MissionInput({
  onLaunch,
  mission,
  setMission,
  folderId = 'work',
  folder = null,
  onBack = null,
}) {
  // Per-folder API base. Every queue mutation includes ?folder=<id> so the
  // backend can route to the right Redis key (launch:queue:<id>).
  const queueUrl = `/api/queue?folder=${encodeURIComponent(folderId)}`;
  const queueAppendUrl = `${queueUrl}&append=1`;
  const queueIdUrl = (id) => `${queueUrl}&id=${encodeURIComponent(id)}`;

  // Cloud-backed mission queue (Upstash Redis via /api/queue).
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemsError, setItemsError] = useState(null);
  const [savingItem, setSavingItem] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [newItemDraft, setNewItemDraft] = useState('');
  const newItemInputRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  // Drag-to-reorder state
  const [drag, setDrag] = useState(null);
  // drag = null | { id, fromIdx, startY, deltaY, dropIdx, startScrollTop }
  const itemRefs = useRef({});
  const priorityMapRef = useRef(new Map());

  // Refs used by the auto-scroll-on-edge logic.
  const listScrollRef = useRef(null);
  const lastPointerYRef = useRef(0);
  const autoScrollRef = useRef({ rafId: null });
  const dragRef = useRef(null);
  const itemsRef = useRef([]);

  // Drag refs: pressed-item snapshot + suppression flag so a click after a
  // drop doesn't fall through to the row's tap handler.
  const pressTimerRef = useRef(null); // kept for cleanup compatibility
  const pressedItemRef = useRef(null);
  const justEndedDragRef = useRef(false);

  // selectedItemId: which row's action menu shows (single-tap).
  // editingItemId: which row's text is in the overlay (action-menu Edit
  // OR double-tap). overlayStartMode determines whether the overlay
  // opens in 'view' (double-tap) or 'edit' (action menu) mode.
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [editingItemId, setEditingItemId] = useState(null);
  const [overlayStartMode, setOverlayStartMode] = useState('edit');
  const [itemOptionsId, setItemOptionsId] = useState(null); // ⋯ button menu

  // Double-tap detection. We delay the single-tap action so a second tap
  // within ~320ms is recognized as a double-tap instead.
  const tapTimerRef = useRef(null);
  const lastTapRef = useRef({ time: 0, id: null });
  const folderTapTimerRef = useRef(null);
  const lastFolderTapRef = useRef({ time: 0, id: null });

  // Folder state.
  // - Expanded/collapsed lives on each folder item itself (`item.expanded`),
  //   so it persists across reloads and devices via the queue PUT.
  // - namingFolderId: the folder whose naming overlay is currently shown.
  // - hoverFolderTimerRef + hoverFolderRef: track the 2s drag-hold over an
  //   item that triggers folder creation.
  // - hoverProgress: 0..1, animates the hover ring during the 2s hold.
  const [namingFolderId, setNamingFolderId] = useState(null);
  const [editingFolderId, setEditingFolderId] = useState(null);
  const [emptyFolderPrompt, setEmptyFolderPrompt] = useState(null);
  const [folderDeleteConfirmId, setFolderDeleteConfirmId] = useState(null);
  const [hoverProgress, setHoverProgress] = useState(0);
  const hoverFolderRef = useRef({ targetId: null, startedAt: 0 });
  const hoverFolderTimerRef = useRef(null);
  const hoverProgressRafRef = useRef(null);

  // true = touch screen (coarse pointer), false = mouse (fine pointer).
  // Used to gate scroll-forwarding and drag thresholds; never changes after mount.
  const isTouchDeviceRef = useRef(
    typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  );

  useEffect(() => { dragRef.current = drag; }, [drag]);
  useEffect(() => { itemsRef.current = items; }, [items]);

  // Block native touch-scroll while a drag is active. Must be registered with
  // { passive: false } — JSX onTouchMove is always passive and cannot call preventDefault().
  useEffect(() => {
    const el = listScrollRef.current;
    if (!el) return;
    const handler = (e) => {
      if (dragRef.current) e.preventDefault();
    };
    el.addEventListener('touchmove', handler, { passive: false });
    return () => el.removeEventListener('touchmove', handler);
  }, []);

  // Cancel any in-flight auto-scroll frame and lingering tap/press timers on unmount.
  useEffect(() => () => {
    if (autoScrollRef.current.rafId) {
      cancelAnimationFrame(autoScrollRef.current.rafId);
      autoScrollRef.current.rafId = null;
    }
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    if (folderTapTimerRef.current) clearTimeout(folderTapTimerRef.current);
    if (hoverFolderTimerRef.current) clearTimeout(hoverFolderTimerRef.current);
    if (hoverProgressRafRef.current) cancelAnimationFrame(hoverProgressRafRef.current);
  }, []);

  // Shake-to-undo / Undo-toast state. pendingUndo holds the most recently
  // deleted item; cleared after 10s or on the next delete.
  const [pendingUndo, setPendingUndo] = useState(null);
  const undoTimeoutRef = useRef(null);
  const lastShakeRef = useRef(0);

  // Brief toast shown when "I'm Lazy, Help Me" fires with an empty list.
  const [emptyListToast, setEmptyListToast] = useState(false);
  const emptyListToastTimerRef = useRef(null);
  const [motionPermission, setMotionPermission] = useState(() => {
    if (typeof window === 'undefined' || typeof window.DeviceMotionEvent === 'undefined') {
      return 'unsupported';
    }
    if (typeof DeviceMotionEvent.requestPermission === 'function') return 'default';
    return 'granted'; // browsers without the permission API expose events freely
  });

  useEffect(() => () => {
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    if (emptyListToastTimerRef.current) clearTimeout(emptyListToastTimerRef.current);
  }, []);

  // Newly-appended items pulse green for ~1s and the list auto-scrolls to them.
  // Map of id → animation-delay (ms). Allows a subtle stagger across batch adds.
  const [highlightedIds, setHighlightedIds] = useState(() => new Map());
  const [scrollToId, setScrollToId] = useState(null);

  // Tag a batch of just-added items with the green pulse, scroll to the first,
  // then drop the tags after the slowest animation finishes.
  const highlightAddedItems = (added) => {
    if (!Array.isArray(added) || added.length === 0) return;
    const STAGGER_MS = 80;
    const ids = added.map(a => a.id);
    setHighlightedIds(prev => {
      const next = new Map(prev);
      added.forEach((item, i) => next.set(item.id, i * STAGGER_MS));
      return next;
    });
    setScrollToId(added[0].id);
    const totalMs = 1000 + (added.length - 1) * STAGGER_MS + 120;
    setTimeout(() => {
      setHighlightedIds(prev => {
        const next = new Map(prev);
        ids.forEach(id => next.delete(id));
        return next;
      });
    }, totalMs);
  };

  useEffect(() => {
    if (!scrollToId) return;
    const node = itemRefs.current[scrollToId];
    if (node) node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setScrollToId(null);
  }, [scrollToId, items]);

  // Threshold for routing pasted text through the Claude task-parser instead
  // of treating it as a single item. Still used by the queue's Add Item flow.
  const CHECKLIST_THRESHOLD = 80;

  const canCallAPI = typeof window !== 'undefined'
    && /^https?:$/.test(window.location?.protocol || '');

  const fetchItems = async () => {
    if (!canCallAPI) {
      setItemsLoading(false);
      return;
    }
    setItemsError(null);
    try {
      const res = await fetch(queueUrl, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Failed (${res.status})`);
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      setItemsError(err.message || 'Could not load queue');
    } finally {
      setItemsLoading(false);
    }
  };

  // Load on mount.
  useEffect(() => { fetchItems(); }, []);

  // Refetch when the tab becomes visible again — keeps devices roughly in sync
  // without needing real-time websockets.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handler = () => { if (document.visibilityState === 'visible') fetchItems(); };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  useEffect(() => {
    if (addingItem) {
      const t = setTimeout(() => newItemInputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [addingItem]);

  const autoResizeTextarea = (el) => {
    if (!el) return;
    el.style.height = 'auto';
    const next = Math.min(el.scrollHeight, 240);
    el.style.height = next + 'px';
    el.style.overflowY = el.scrollHeight > 240 ? 'auto' : 'hidden';
  };

  // Auto-resize on the queue's inline Add-Item textarea.
  useEffect(() => {
    if (newItemInputRef.current) autoResizeTextarea(newItemInputRef.current);
  }, [newItemDraft, addingItem]);

  // Shared: parse a block (or accept single line) and add to the cloud queue.
  // Returns the added items array on success, or null on failure.
  // `append: true` puts the new items at the bottom; default prepends to top.
  const submitTextAsTasks = async (text, { append = false } = {}) => {
    if (savingItem) return null;
    if (!canCallAPI) {
      setItemsError('Adding requires the deployed app (cloud sync)');
      return null;
    }
    const trimmed = text.trim();
    if (!trimmed) return null;

    setSavingItem(true);
    setItemsError(null);
    try {
      let texts = [trimmed];

      // Multi-line OR long block → ask Claude to split + rewrite.
      if (trimmed.includes('\n') || trimmed.length > CHECKLIST_THRESHOLD) {
        const parseRes = await fetch('/api/parse-tasks', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ text: trimmed }),
        });
        const parseData = await parseRes.json().catch(() => ({}));
        if (!parseRes.ok) throw new Error(parseData.error || `Parse failed (${parseRes.status})`);
        const tasks = Array.isArray(parseData.tasks) ? parseData.tasks : [];
        if (tasks.length === 0) throw new Error('No tasks parsed from that text');
        texts = tasks;
      }

      // Multiple parsed tasks → group into an AI-named folder.
      if (texts.length > 1) {
        let folderName = 'New Tasks';
        try {
          const nameRes = await fetch('/api/name-folder', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ tasks: texts }),
          });
          const nameData = await nameRes.json().catch(() => ({}));
          if (nameRes.ok && nameData.name) folderName = nameData.name.trim() || folderName;
        } catch {}

        const mkId = () => (typeof crypto !== 'undefined' && crypto.randomUUID)
          ? crypto.randomUUID()
          : `m_${Date.now()}_${Math.random().toString(36).slice(2)}`;

        const folderId = mkId();
        const children = texts.map(t => ({ id: mkId(), text: t, createdAt: Date.now() }));
        const folder = {
          id: folderId,
          type: 'folder',
          name: folderName,
          createdAt: Date.now(),
          expanded: true,
          children,
        };

        const updatedItems = append
          ? [...itemsRef.current, folder]
          : [folder, ...itemsRef.current];
        setItems(updatedItems);
        highlightAddedItems([folder, ...children]);

        const putRes = await fetch(queueUrl, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ items: updatedItems }),
        });
        const putData = await putRes.json().catch(() => ({}));
        if (!putRes.ok) throw new Error(putData.error || `Failed (${putRes.status})`);
        if (Array.isArray(putData.items)) setItems(putData.items);
        return [folder];
      }

      const url = append ? queueAppendUrl : queueUrl;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: texts[0] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Failed (${res.status})`);
      setItems(Array.isArray(data.items) ? data.items : []);
      return Array.isArray(data.added) ? data.added : [];
    } catch (err) {
      setItemsError(err.message || 'Could not save');
      return null;
    } finally {
      setSavingItem(false);
    }
  };

  // Inline queue "Add Item" flow — prepends to the top, no green pulse.
  const handleAddItem = async () => {
    const text = newItemDraft.trim();
    if (!text) {
      setAddingItem(false);
      setNewItemDraft('');
      return;
    }
    const added = await submitTextAsTasks(text);
    if (added !== null) setNewItemDraft('');
    // Stay open for fast repeated entry; empty Enter will dismiss.
  };

  // Folder button in the add-item box — creates an empty folder (with the
  // typed text as the first child if present) and opens the naming overlay.
  const handleCreateFolderFromInput = async () => {
    const text = newItemDraft.trim();
    const mkId = () => (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `f_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const folderId = mkId();
    const children = text ? [{ id: mkId(), text, createdAt: Date.now() }] : [];
    const folder = { id: folderId, type: 'folder', name: '', createdAt: Date.now(), expanded: true, children };
    const next = [folder, ...itemsRef.current];
    setItems(next);
    setNamingFolderId(folderId);
    setAddingItem(false);
    setNewItemDraft('');
    if (canCallAPI) {
      try {
        const res = await fetch(queueUrl, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ items: next }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Failed (${res.status})`);
        if (Array.isArray(data.items)) setItems(data.items);
      } catch (err) {
        setItemsError(err.message || 'Could not create folder');
      }
    }
  };

  // Find an item by id anywhere in the list (top-level or inside a folder).
  // Returns { item, parentFolderId, parentFolderIdx, childIdx, topLevelIdx } or null.
  const findItemAnywhere = (id, source = items) => {
    for (let i = 0; i < source.length; i++) {
      const it = source[i];
      if (it.id === id) {
        return { item: it, parentFolderId: null, parentFolderIdx: -1, childIdx: -1, topLevelIdx: i };
      }
      if (it.type === 'folder' && Array.isArray(it.children)) {
        for (let j = 0; j < it.children.length; j++) {
          if (it.children[j].id === id) {
            return { item: it.children[j], parentFolderId: it.id, parentFolderIdx: i, childIdx: j, topLevelIdx: -1 };
          }
        }
      }
    }
    return null;
  };

  const handleDeleteItem = async (id) => {
    // FIRST — request DeviceMotion permission synchronously inside the user
    // gesture (iOS 13+ requirement). Anything async after this would lose
    // the user-activation flag.
    if (motionPermission === 'default'
        && typeof window.DeviceMotionEvent !== 'undefined'
        && typeof DeviceMotionEvent.requestPermission === 'function') {
      DeviceMotionEvent.requestPermission()
        .then(result => setMotionPermission(result === 'granted' ? 'granted' : 'denied'))
        .catch(() => setMotionPermission('denied'));
    }

    if (!canCallAPI) {
      setItemsError('Deleting requires the deployed app (cloud sync)');
      return;
    }

    const found = findItemAnywhere(id);
    if (!found) return;
    const { item: itemToDelete, parentFolderId, parentFolderIdx, childIdx, topLevelIdx } = found;

    // Save undo snapshot — restoring a child to top-level is fine for now.
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    const restoreIdx = topLevelIdx >= 0 ? topLevelIdx : parentFolderIdx + 1;
    setPendingUndo({ item: itemToDelete, originalIndex: restoreIdx, deletedAt: Date.now() });
    undoTimeoutRef.current = setTimeout(() => {
      setPendingUndo(null);
      undoTimeoutRef.current = null;
    }, 10000);

    // Optimistic update — snap it out of the list immediately. For child items
    // remove from folder.children; for top-level remove from items.
    const before = items;
    const next = parentFolderId
      ? items.map(i => i.id === parentFolderId
          ? { ...i, children: (i.children || []).filter(c => c.id !== id) }
          : i)
      : items.filter(item => item.id !== id);
    setItems(next);
    try {
      // For top-level deletion the DELETE endpoint is sufficient. For children
      // we PUT the whole items array (the child isn't visible to the by-id
      // delete on the server side).
      const res = parentFolderId
        ? await fetch(queueUrl, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ items: next }),
          })
        : await fetch(queueIdUrl(id), { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Failed (${res.status})`);
      if (Array.isArray(data.items)) setItems(data.items);
    } catch (err) {
      setItems(before); // rollback
      setPendingUndo(null);
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
        undoTimeoutRef.current = null;
      }
      setItemsError(err.message || 'Could not delete item');
    }
  };

  const handleUndoDelete = async () => {
    if (!pendingUndo) return;
    const { item, originalIndex } = pendingUndo;

    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }
    setPendingUndo(null);

    // Insert at original position (clamped to current length so subsequent
    // deletes/adds during the undo window don't blow up the splice).
    const targetIndex = Math.min(originalIndex, items.length);
    const restored = [...items];
    restored.splice(targetIndex, 0, item);

    // Optimistic update + green-pulse highlight + auto-scroll
    const before = items;
    setItems(restored);
    highlightAddedItems([item]);

    if (!canCallAPI) return;
    try {
      const res = await fetch(queueUrl, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ items: restored }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Failed (${res.status})`);
      if (Array.isArray(data.items)) setItems(data.items);
    } catch (err) {
      setItems(before);
      setItemsError(err.message || 'Could not restore item');
    }
  };

  // Shake-to-undo — only listens while there's a pending undo and the
  // device-motion permission was granted.
  useEffect(() => {
    if (motionPermission !== 'granted' || !pendingUndo) return;

    const SHAKE_THRESHOLD = 15;     // m/s² of true acceleration (no gravity)
    const SHAKE_DEBOUNCE_MS = 1500; // gap between accepted shakes

    const handler = (e) => {
      let mag;
      if (e.acceleration && e.acceleration.x !== null) {
        const a = e.acceleration;
        mag = Math.sqrt((a.x || 0) ** 2 + (a.y || 0) ** 2 + (a.z || 0) ** 2);
      } else if (e.accelerationIncludingGravity) {
        const a = e.accelerationIncludingGravity;
        const total = Math.sqrt((a.x || 0) ** 2 + (a.y || 0) ** 2 + (a.z || 0) ** 2);
        mag = Math.abs(total - 9.8); // strip approximate gravity baseline
      } else { return; }

      if (mag > SHAKE_THRESHOLD) {
        const now = Date.now();
        if (now - lastShakeRef.current > SHAKE_DEBOUNCE_MS) {
          lastShakeRef.current = now;
          handleUndoDelete();
        }
      }
    };

    window.addEventListener('devicemotion', handler);
    return () => window.removeEventListener('devicemotion', handler);
  }, [motionPermission, pendingUndo]);

  // `source` (optional): { id, index } of the queue item this launch came from.
  // null/undefined for launches via the freeform input. We always tag the
  // launch with this MissionInput's folderId so the parent app can route
  // completion writes back to the right folder.
  const handleLaunchItem = (text, source, description) => {
    if (drag) return; // ignore taps mid-drag
    setSelectedItemId(null);
    setEditingItemId(null);
    setMission(text);
    onLaunch(text, { ...(source || {}), folderId }, description || null);
  };

  // Single-tap on a row → toggle the action menu for that item.
  const handleRowTap = (item) => {
    if (justEndedDragRef.current) return;
    if (editingItemId) return; // ignore row taps mid-edit
    setItemOptionsId(null); // close ⋯ panel if open
    setSelectedItemId(prev => prev === item.id ? null : item.id);
  };

  // Double-tap on a row → open the overlay in read-only "preview" mode.
  const handleRowDoubleTap = (item) => {
    if (justEndedDragRef.current) return;
    setOverlayStartMode('view');
    setSelectedItemId(null);
    setEditingItemId(item.id);
  };

  // Click dispatcher — distinguishes single tap from double tap. First tap
  // schedules a delayed single-tap action; a second tap within 320ms cancels
  // the timer and fires the double-tap action instead.
  const TAP_DOUBLE_INTERVAL = 320;
  const handleRowClick = (item) => {
    if (justEndedDragRef.current) return;
    const now = Date.now();
    const last = lastTapRef.current;
    if (last.id === item.id && (now - last.time) < TAP_DOUBLE_INTERVAL) {
      if (tapTimerRef.current) {
        clearTimeout(tapTimerRef.current);
        tapTimerRef.current = null;
      }
      lastTapRef.current = { time: 0, id: null };
      handleRowDoubleTap(item);
      return;
    }
    lastTapRef.current = { time: now, id: item.id };
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => {
      tapTimerRef.current = null;
      handleRowTap(item);
    }, TAP_DOUBLE_INTERVAL);
  };

  // Action menu Edit Item → open the overlay in editable mode.
  const handleStartEdit = () => {
    const found = findItemAnywhere(selectedItemId);
    if (!found) return;
    setOverlayStartMode('edit');
    setEditingItemId(found.item.id);
    setSelectedItemId(null);
  };

  // Action menu: Launch (selected item)
  const handleSelectedLaunch = () => {
    const found = findItemAnywhere(selectedItemId);
    if (!found) return;
    handleLaunchItem(found.item.text, { id: found.item.id, index: found.topLevelIdx }, found.item.description);
  };

  // Edit overlay: Cancel
  const handleCancelEdit = () => {
    setEditingItemId(null);
  };

  // Edit overlay: Save (overlay passes the new text and optional description)
  const handleSaveEdit = async (newText, newDescription) => {
    const text = (newText || '').trim();
    const id = editingItemId;
    if (!text || !id) return;

    setSavingItem(true);
    const desc = typeof newDescription === 'string' ? newDescription.trim() : '';
    const applyDesc = (item) => {
      const next = { ...item, text };
      if (desc) next.description = desc;
      else delete next.description;
      return next;
    };
    // Update either at top level or inside a folder's children.
    const updated = items.map(i => {
      if (i.id === id) return applyDesc(i);
      if (i.type === 'folder' && Array.isArray(i.children)) {
        const hit = i.children.some(c => c.id === id);
        if (hit) return { ...i, children: i.children.map(c => c.id === id ? applyDesc(c) : c) };
      }
      return i;
    });
    setItems(updated);
    setEditingItemId(null);

    if (!canCallAPI) { setSavingItem(false); return; }
    try {
      const res = await fetch(queueUrl, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ items: updated }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Failed (${res.status})`);
      if (Array.isArray(data.items)) setItems(data.items);
    } catch (err) {
      setItemsError(err.message || 'Could not save edit');
    } finally {
      setSavingItem(false);
    }
  };

  // Clear stale selection / edit state if the underlying item disappears
  // (deleted locally, removed by a cross-device sync, etc.).
  useEffect(() => {
    if (selectedItemId && !findItemAnywhere(selectedItemId, items)) {
      setSelectedItemId(null);
    }
    if (editingItemId && !findItemAnywhere(editingItemId, items)) {
      setEditingItemId(null);
      setMission('');
    }
  }, [items, selectedItemId, editingItemId]);

  // Esc dismisses the action menu / cancels edit.
  useEffect(() => {
    if (!selectedItemId && !editingItemId) return;
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (editingItemId) handleCancelEdit();
        else setSelectedItemId(null);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [selectedItemId, editingItemId]);

  const handleLazyLaunch = () => {
    if (drag) return;

    // Walk the live items list top-to-bottom to find the first real task.
    // Folders are unwrapped to their first child; empty folders are skipped.
    let firstItem = null;
    let firstSource = null;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.type === 'folder') {
        if (Array.isArray(it.children) && it.children.length > 0) {
          firstItem = it.children[0];
          firstSource = { id: firstItem.id, index: i };
          break;
        }
        // empty folder — skip
      } else {
        firstItem = it;
        firstSource = { id: it.id, index: i };
        break;
      }
    }

    if (!firstItem) {
      if (emptyListToastTimerRef.current) clearTimeout(emptyListToastTimerRef.current);
      setEmptyListToast(true);
      emptyListToastTimerRef.current = setTimeout(() => setEmptyListToast(false), 2500);
      return;
    }

    handleLaunchItem(firstItem.text, firstSource, firstItem.description);
  };

  const reorderItems = async (newOrder) => {
    const prev = items;
    setItems(newOrder);          // optimistic
    setItemsError(null);
    if (!canCallAPI) return;
    try {
      const res = await fetch(queueUrl, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ items: newOrder }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Failed (${res.status})`);
      if (Array.isArray(data.items)) setItems(data.items);
    } catch (err) {
      setItems(prev);              // rollback
      setItemsError(err.message || 'Could not save order');
    }
  };

  // ── Drag + auto-scroll-on-edge helpers ────────────────────────────────
  const AUTOSCROLL_TRIGGER = 60;   // px from top/bottom of container
  const AUTOSCROLL_MAX_SPEED = 14; // px per frame at the edge

  const stopAutoScroll = () => {
    if (autoScrollRef.current.rafId) {
      cancelAnimationFrame(autoScrollRef.current.rafId);
      autoScrollRef.current.rafId = null;
    }
  };

  // Recomputes deltaY (pointer + scroll offset), dropIdx (for between-items
  // drops) and hoverTargetId (for over-item drops → folder creation) for the
  // current pointer Y. Called from pointermove and the auto-scroll frame.
  const FOLDER_HOVER_MS = 500;

  const updateDragVisuals = (clientY) => {
    const dragNow = dragRef.current;
    if (!dragNow) return;
    const itemsNow = itemsRef.current;

    const currentScrollTop = listScrollRef.current?.scrollTop || 0;
    const scrollDelta = currentScrollTop - (dragNow.startScrollTop || 0);
    const deltaY = (clientY - dragNow.startY) + scrollDelta;

    // Child-drag mode: dragged item is still inside its source folder data-wise.
    // No hover-merge gestures (you can't fold an ejected item into another row mid-drag),
    // and "others" is every top-level item (the dragged child isn't in the top-level list).
    const isChildDrag = dragNow.dragSource?.type === 'folder-child';
    const others = isChildDrag
      ? itemsNow
      : itemsNow.filter(i => i.id !== dragNow.id);

    let hoverTargetId = null;
    let dropIdx = others.length;
    let dropIdxSet = false;
    for (let i = 0; i < others.length; i++) {
      const other = others[i];
      const node = itemRefs.current[other.id];
      if (!node) continue;
      const rect = node.getBoundingClientRect();
      const relative = (clientY - rect.top) / rect.height;
      // Only top-level drags can arm the hover-merge gesture.
      if (!isChildDrag) {
        const isDropTarget = !other.type || other.type === 'item' || other.type === 'folder';
        if (relative > 0.25 && relative < 0.75 && isDropTarget) {
          hoverTargetId = other.id;
          // Don't pick a dropIdx — the pointer is "inside" this row.
        }
      }
      if (!dropIdxSet) {
        const midY = rect.top + rect.height / 2;
        if (clientY < midY) { dropIdx = i; dropIdxSet = true; }
      }
    }

    // Track the hover timer separately. Only restart when the target changes.
    const prev = hoverFolderRef.current;
    if (hoverTargetId !== prev.targetId) {
      if (hoverFolderTimerRef.current) {
        clearTimeout(hoverFolderTimerRef.current);
        hoverFolderTimerRef.current = null;
      }
      if (hoverProgressRafRef.current) {
        cancelAnimationFrame(hoverProgressRafRef.current);
        hoverProgressRafRef.current = null;
      }
      if (hoverTargetId) {
        const startedAt = Date.now();
        hoverFolderRef.current = { targetId: hoverTargetId, startedAt };
        const tickProgress = () => {
          const elapsed = Date.now() - hoverFolderRef.current.startedAt;
          const p = Math.min(1, elapsed / FOLDER_HOVER_MS);
          setHoverProgress(p);
          if (p < 1 && hoverFolderRef.current.targetId === hoverTargetId) {
            hoverProgressRafRef.current = requestAnimationFrame(tickProgress);
          }
        };
        hoverProgressRafRef.current = requestAnimationFrame(tickProgress);
        hoverFolderTimerRef.current = setTimeout(() => {
          hoverFolderTimerRef.current = null;
          triggerCreateFolder(dragRef.current?.id, hoverTargetId);
        }, FOLDER_HOVER_MS);
      } else {
        hoverFolderRef.current = { targetId: null, startedAt: 0 };
        setHoverProgress(0);
      }
    }

    if (
      dragNow.deltaY !== deltaY ||
      dragNow.dropIdx !== dropIdx ||
      dragNow.hoverTargetId !== hoverTargetId
    ) {
      setDrag(d => d ? { ...d, deltaY, dropIdx, hoverTargetId } : d);
    }
  };

  // Build the folder from the dragged + target items, persist, end drag,
  // expand the new folder, and open the naming overlay.
  const triggerCreateFolder = async (draggedId, targetId) => {
    if (!draggedId || !targetId) return;
    const dragNow = dragRef.current;
    if (!dragNow) return;
    const itemsNow = itemsRef.current;
    const dragged = itemsNow.find(i => i.id === draggedId);
    const target = itemsNow.find(i => i.id === targetId);
    if (!dragged || !target) return;
    // Can't drag a folder into anything.
    if (dragged.type === 'folder') return;

    // Dragging a flat item onto an existing folder → add it to that folder.
    if (target.type === 'folder') {
      stopAutoScroll();
      if (hoverFolderTimerRef.current) { clearTimeout(hoverFolderTimerRef.current); hoverFolderTimerRef.current = null; }
      if (hoverProgressRafRef.current) { cancelAnimationFrame(hoverProgressRafRef.current); hoverProgressRafRef.current = null; }
      hoverFolderRef.current = { targetId: null, startedAt: 0 };
      setHoverProgress(0);
      setDrag(null);
      justEndedDragRef.current = true;
      setTimeout(() => { justEndedDragRef.current = false; }, 120);

      const next = itemsNow
        .filter(i => i.id !== draggedId)
        .map(i => i.id === targetId
          ? { ...i, children: [...(i.children || []), { id: dragged.id, text: dragged.text, createdAt: dragged.createdAt || Date.now() }] }
          : i
        );
      setItems(next);
      if (canCallAPI) {
        try {
          const res = await fetch(queueUrl, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items: next }) });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || `Failed (${res.status})`);
          if (Array.isArray(data.items)) setItems(data.items);
        } catch (err) {
          setItemsError(err.message || 'Could not add to folder');
        }
      }
      return;
    }

    stopAutoScroll();
    if (hoverFolderTimerRef.current) {
      clearTimeout(hoverFolderTimerRef.current);
      hoverFolderTimerRef.current = null;
    }
    if (hoverProgressRafRef.current) {
      cancelAnimationFrame(hoverProgressRafRef.current);
      hoverProgressRafRef.current = null;
    }
    hoverFolderRef.current = { targetId: null, startedAt: 0 };
    setHoverProgress(0);
    setDrag(null);
    justEndedDragRef.current = true;
    setTimeout(() => { justEndedDragRef.current = false; }, 120);

    const folderId = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `f_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const folder = {
      id: folderId,
      type: 'folder',
      name: '',
      createdAt: Date.now(),
      expanded: true,
      children: [
        { id: target.id, text: target.text, createdAt: target.createdAt || Date.now() },
        { id: dragged.id, text: dragged.text, createdAt: dragged.createdAt || Date.now() },
      ],
    };
    // Replace the target with the folder, drop the dragged item.
    const next = itemsNow
      .filter(i => i.id !== draggedId)
      .map(i => i.id === targetId ? folder : i);

    setItems(next);
    setNamingFolderId(folderId);

    if (canCallAPI) {
      try {
        const res = await fetch(queueUrl, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ items: next }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Failed (${res.status})`);
        if (Array.isArray(data.items)) setItems(data.items);
      } catch (err) {
        setItemsError(err.message || 'Could not create folder');
      }
    }
  };

  // Save the folder's name from the naming overlay.
  const handleSaveFolderName = async (id, name) => {
    const updated = items.map(i => i.id === id && i.type === 'folder'
      ? { ...i, name: (name || '').slice(0, 200) }
      : i
    );
    setItems(updated);
    setNamingFolderId(null);
    if (!canCallAPI) return;
    try {
      const res = await fetch(queueUrl, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ items: updated }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Failed (${res.status})`);
      if (Array.isArray(data.items)) setItems(data.items);
    } catch (err) {
      setItemsError(err.message || 'Could not save folder name');
    }
  };

  const toggleFolderExpanded = async (id) => {
    const before = items;
    const next = items.map(i =>
      i.id === id && i.type === 'folder' ? { ...i, expanded: !i.expanded } : i
    );
    setItems(next); // optimistic

    if (!canCallAPI) return;
    try {
      const res = await fetch(queueUrl, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ items: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Failed (${res.status})`);
      if (Array.isArray(data.items)) setItems(data.items);
    } catch (err) {
      setItems(before);
      setItemsError(err.message || 'Could not save folder state');
    }
  };

  // Double-tap on a folder title → open the name overlay in read-only preview mode.
  const handleFolderDoubleTap = (folder) => {
    if (justEndedDragRef.current) return;
    setEditingFolderId(folder.id);
  };

  // Click dispatcher for folder rows — distinguishes single tap (expand/collapse)
  // from double tap (rename overlay), using the same 320 ms window as item rows.
  const handleFolderClick = (folder) => {
    if (justEndedDragRef.current) return;
    const now = Date.now();
    const last = lastFolderTapRef.current;
    if (last.id === folder.id && (now - last.time) < TAP_DOUBLE_INTERVAL) {
      if (folderTapTimerRef.current) {
        clearTimeout(folderTapTimerRef.current);
        folderTapTimerRef.current = null;
      }
      lastFolderTapRef.current = { time: 0, id: null };
      handleFolderDoubleTap(folder);
      return;
    }
    lastFolderTapRef.current = { time: now, id: folder.id };
    if (folderTapTimerRef.current) clearTimeout(folderTapTimerRef.current);
    folderTapTimerRef.current = setTimeout(() => {
      folderTapTimerRef.current = null;
      toggleFolderExpanded(folder.id);
    }, TAP_DOUBLE_INTERVAL);
  };

  const handleCancelFolderEdit = () => setEditingFolderId(null);

  const handleSaveFolderEdit = async (newName) => {
    const id = editingFolderId;
    const name = (newName || '').trim();
    setEditingFolderId(null);
    if (!name || !id) return;
    await handleSaveFolderName(id, name);
  };

  // Check Off: pulse green → remove from queue → finalize in completed steps.
  // No undo toast (intentional action); no micro-steps logged (empty dropdown).
  const handleCheckOff = async (id) => {
    setItemOptionsId(null);
    const found = findItemAnywhere(id);
    if (!found) return;
    const { item: itemToCheck, parentFolderId, topLevelIdx } = found;

    // Green pulse so the item glows before vanishing.
    setHighlightedIds(prev => { const next = new Map(prev); next.set(id, 0); return next; });
    await new Promise(r => setTimeout(r, 650));

    // Use itemsRef for fresh state after the async wait.
    const currentItems = itemsRef.current;
    const next = parentFolderId
      ? currentItems.map(i => i.id === parentFolderId
          ? { ...i, children: (i.children || []).filter(c => c.id !== id) }
          : i)
      : currentItems.filter(i => i.id !== id);
    setItems(next);
    setHighlightedIds(prev => { const n = new Map(prev); n.delete(id); return n; });

    if (!canCallAPI) return;

    // Finalize to the completed steps screen (no log-step → empty dropdown).
    const completionId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    try {
      await fetch('/api/completed?action=finalize', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: completionId,
          sourceItemId: itemToCheck.id,
          sourceItemIndex: topLevelIdx >= 0 ? topLevelIdx : -1,
          folderId,
          text: itemToCheck.text,
        }),
      });
    } catch {}

    // Remove from the queue.
    try {
      const res = parentFolderId
        ? await fetch(queueUrl, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ items: next }),
          })
        : await fetch(queueIdUrl(id), { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.items)) setItems(data.items);
    } catch {}
  };

  // Resolve the empty-folder prompt: either delete the folder or keep it empty.
  const resolveEmptyFolderPrompt = async (action) => {
    const prompt = emptyFolderPrompt;
    setEmptyFolderPrompt(null);
    if (!prompt) return;
    if (action !== 'delete') return; // 'keep' → no-op, folder stays empty.
    const next = itemsRef.current.filter(i => i.id !== prompt.folderId);
    setItems(next);
    if (!canCallAPI) return;
    try {
      const res = await fetch(queueUrl, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ items: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Failed (${res.status})`);
      if (Array.isArray(data.items)) setItems(data.items);
    } catch (err) {
      setItemsError(err.message || 'Could not delete folder');
    }
  };

  // Eject a child item from its folder back to the top-level queue.
  // If the folder would be left with 1 child, unwrap that child too.
  // If left with 0 children, delete the folder.
  const handleEjectChild = async (folderId, childId) => {
    const folder = items.find(i => i.id === folderId);
    if (!folder) return;
    const remaining = (folder.children || []).filter(c => c.id !== childId);
    const ejected = (folder.children || []).find(c => c.id === childId);
    if (!ejected) return;

    let next;
    if (remaining.length === 0) {
      // Folder empty — remove it, bring ejected item up.
      next = items.flatMap(i => i.id === folderId
        ? [{ id: ejected.id, text: ejected.text, createdAt: ejected.createdAt }]
        : [i]
      );
    } else if (remaining.length === 1) {
      // One child left — unwrap: replace folder with remaining + ejected item.
      next = items.flatMap(i => i.id === folderId
        ? [
            { id: remaining[0].id, text: remaining[0].text, createdAt: remaining[0].createdAt },
            { id: ejected.id, text: ejected.text, createdAt: ejected.createdAt },
          ]
        : [i]
      );
    } else {
      // Folder still has multiple children — just remove this child and append to top level.
      next = [
        ...items.map(i => i.id === folderId ? { ...i, children: remaining } : i),
        { id: ejected.id, text: ejected.text, createdAt: ejected.createdAt },
      ];
    }

    setItems(next);
    if (!canCallAPI) return;
    try {
      const res = await fetch(queueUrl, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ items: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Failed (${res.status})`);
      if (Array.isArray(data.items)) setItems(data.items);
    } catch (err) {
      setItemsError(err.message || 'Could not remove item from folder');
    }
  };

  const autoScrollFrame = () => {
    autoScrollRef.current.rafId = null;
    const dragNow = dragRef.current;
    const container = listScrollRef.current;
    if (!dragNow || !container) return;

    const rect = container.getBoundingClientRect();
    const y = lastPointerYRef.current;
    let speed = 0;
    if (y < rect.top + AUTOSCROLL_TRIGGER) {
      const ratio = Math.max(0, Math.min(1, (rect.top + AUTOSCROLL_TRIGGER - y) / AUTOSCROLL_TRIGGER));
      speed = -Math.ceil(AUTOSCROLL_MAX_SPEED * ratio);
    } else if (y > rect.bottom - AUTOSCROLL_TRIGGER) {
      const ratio = Math.max(0, Math.min(1, (y - (rect.bottom - AUTOSCROLL_TRIGGER)) / AUTOSCROLL_TRIGGER));
      speed = Math.ceil(AUTOSCROLL_MAX_SPEED * ratio);
    }
    if (speed === 0) return;

    const maxScroll = container.scrollHeight - container.clientHeight;
    const newScrollTop = Math.max(0, Math.min(maxScroll, container.scrollTop + speed));
    if (newScrollTop === container.scrollTop) return; // hit edge — bail

    container.scrollTop = newScrollTop;
    updateDragVisuals(y);
    autoScrollRef.current.rafId = requestAnimationFrame(autoScrollFrame);
  };

  const maybeStartAutoScroll = (clientY) => {
    const container = listScrollRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const inZone =
      clientY < rect.top + AUTOSCROLL_TRIGGER ||
      clientY > rect.bottom - AUTOSCROLL_TRIGGER;
    if (inZone) {
      if (!autoScrollRef.current.rafId) {
        autoScrollRef.current.rafId = requestAnimationFrame(autoScrollFrame);
      }
    } else {
      stopAutoScroll();
    }
  };

  const handleDragStart = (e, item, idx) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const startScrollTop = listScrollRef.current?.scrollTop || 0;
    lastPointerYRef.current = e.clientY;
    setDrag({
      id: item.id,
      fromIdx: idx,
      startY: e.clientY,
      deltaY: 0,
      dropIdx: idx,
      startScrollTop,
    });
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
  };

  const handleDragMove = (e) => {
    if (!dragRef.current) return;
    e.preventDefault();
    lastPointerYRef.current = e.clientY;
    updateDragVisuals(e.clientY);
    maybeStartAutoScroll(e.clientY);
  };

  const handleDragEnd = () => {
    stopAutoScroll();
    // Cancel any in-flight folder-hover timer / progress animation.
    if (hoverFolderTimerRef.current) {
      clearTimeout(hoverFolderTimerRef.current);
      hoverFolderTimerRef.current = null;
    }
    if (hoverProgressRafRef.current) {
      cancelAnimationFrame(hoverProgressRafRef.current);
      hoverProgressRafRef.current = null;
    }
    hoverFolderRef.current = { targetId: null, startedAt: 0 };
    setHoverProgress(0);

    const dragNow = dragRef.current;
    if (!dragNow) return;
    const { fromIdx, dropIdx, hoverTargetId, dragSource, capturedTarget, capturedPointerId } = dragNow;

    // Release pointer capture BEFORE the items mutation that may unmount the
    // captured element. iOS otherwise leaves capture half-released and routes
    // subsequent pointer events to the detached element.
    if (capturedTarget && capturedPointerId != null) {
      try {
        if (capturedTarget.hasPointerCapture?.(capturedPointerId)) {
          capturedTarget.releasePointerCapture(capturedPointerId);
        }
      } catch {}
    }

    // Sync-clear all drag-related refs so a fast subsequent press isn't blocked
    // by stale state waiting for React's commit.
    dragRef.current = null;
    pressedItemRef.current = null;
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }

    setDrag(null);
    // Suppress the click event that fires after pointerup on the same target,
    // so dropping doesn't accidentally launch the dropped item.
    justEndedDragRef.current = true;
    setTimeout(() => { justEndedDragRef.current = false; }, 120);
    // Note: we used to bail here when hoverTargetId was set, treating any
    // release-in-hover-zone as a cancelled merge. That made reordering near
    // folders (especially between two folders) feel broken — releasing while
    // the pointer was anywhere in the middle 50% of a folder lost the drop.
    // Now: if the merge timer didn't fire, fall through to a normal drop at
    // the computed dropIdx (it's always set independently of hoverTargetId).

    // Child drag-out → eject from folder, insert at dropIdx in top-level.
    if (dragSource?.type === 'folder-child') {
      handleChildDropAtTopLevel(dragSource.folderId, dragSource.childId, dropIdx);
      return;
    }

    if (fromIdx === dropIdx) return;
    const reordered = [...items];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(dropIdx, 0, moved);
    reorderItems(reordered);
  };

  // Eject child from its folder and insert it into the top-level items at the
  // requested drop index. If the source folder ends up empty, prompt the user
  // whether to delete it or keep it.
  const handleChildDropAtTopLevel = async (folderId, childId, dropIdx) => {
    const currentItems = itemsRef.current;
    const folder = currentItems.find(i => i.id === folderId);
    if (!folder) return;
    const child = (folder.children || []).find(c => c.id === childId);
    if (!child) return;
    const remainingChildren = (folder.children || []).filter(c => c.id !== childId);
    const ejectedLeaf = { id: child.id, text: child.text, createdAt: child.createdAt };

    // Insert ejected leaf into top-level at dropIdx, with the folder's children updated in place.
    const next = [];
    for (let i = 0; i < currentItems.length; i++) {
      if (i === dropIdx) next.push(ejectedLeaf);
      const it = currentItems[i];
      next.push(it.id === folderId ? { ...it, children: remainingChildren } : it);
    }
    if (dropIdx >= currentItems.length) next.push(ejectedLeaf);

    setItems(next);
    if (remainingChildren.length === 0) {
      setEmptyFolderPrompt({ folderId, folderName: folder.name || 'New Folder' });
    }

    if (!canCallAPI) return;
    try {
      const res = await fetch(queueUrl, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ items: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Failed (${res.status})`);
      if (Array.isArray(data.items)) setItems(data.items);
    } catch (err) {
      setItemsError(err.message || 'Could not move item');
    }
  };

  // ── Row-level drag activation thresholds ─────────────────────────────────
  // On touch: both distance AND time must be satisfied before drag starts,
  // preventing accidental drags from taps or small finger shifts.
  // On desktop (mouse): activate on any movement — accidental mouse drags
  // aren't a problem and the delay makes drag feel sluggish.
  const _isTouch = isTouchDeviceRef.current;
  const DRAG_MOVE_THRESHOLD = _isTouch ? 6 : 3;   // px
  const DRAG_DELAY_MS       = _isTouch ? 150 : 0;  // ms
  const SCROLL_CANCEL_DIST  = _isTouch ? 20 : 8;   // px

  // Shared activator so the timer callback and move handler both go through
  // the same path regardless of whether the pressed item is a top-level row
  // or a folder child.
  const commitDrag = (pressed) => {
    if (pressed.isChild) {
      activateChildDrag(pressed);
    } else {
      activateDrag(pressed);
    }
  };

  const activateDrag = (pressed) => {
    const startScrollTop = listScrollRef.current?.scrollTop || 0;
    const currentY = pressed.lastMoveY != null ? pressed.lastMoveY : pressed.startY;
    lastPointerYRef.current = currentY;
    const newDrag = {
      id: pressed.id,
      fromIdx: pressed.idx,
      startY: currentY,
      deltaY: 0,
      dropIdx: pressed.idx,
      startScrollTop,
      capturedTarget: pressed.target,
      capturedPointerId: pressed.pointerId,
    };
    dragRef.current = newDrag; // sync — useEffect would otherwise lag a frame
    setDrag(newDrag);
    try { pressed.target.setPointerCapture(pressed.pointerId); } catch {}
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(8); } catch {}
    }
  };

  const handleRowPointerDown = (e, item, idx) => {
    if (e.button !== undefined && e.button !== 0) return;
    if (dragRef.current) return;
    // Filtered indices don't line up with the queue, so disable reorder while searching.
    if (searchQuery.trim()) return;
    pressedItemRef.current = {
      id: item.id, idx,
      startX: e.clientX, startY: e.clientY,
      lastMoveX: e.clientX, lastMoveY: e.clientY,
      pointerId: e.pointerId,
      target: e.currentTarget,
      pressedAt: Date.now(),
    };
  };

  const handleChildPointerDown = (e, child, folderId) => {
    if (e.button !== undefined && e.button !== 0) return;
    if (dragRef.current) return;
    if (searchQuery.trim()) return;
    e.stopPropagation();
    pressedItemRef.current = {
      id: child.id, idx: -1,
      startX: e.clientX, startY: e.clientY,
      lastMoveX: e.clientX, lastMoveY: e.clientY,
      pointerId: e.pointerId,
      target: e.currentTarget,
      isChild: true, folderId, child,
      pressedAt: Date.now(),
    };
  };

  // Activate drag for a child item. The child stays in the folder data structure
  // during the drag — only the drag state is set, with source tracking. The
  // child row gets visually translated via the existing render path.
  const activateChildDrag = (pressed) => {
    const startScrollTop = listScrollRef.current?.scrollTop || 0;
    const currentY = pressed.lastMoveY != null ? pressed.lastMoveY : pressed.startY;
    lastPointerYRef.current = currentY;
    const newDrag = {
      id: pressed.child.id,
      dragSource: { type: 'folder-child', folderId: pressed.folderId, childId: pressed.child.id },
      fromIdx: -1,
      startY: currentY,
      deltaY: 0,
      dropIdx: 0,
      hoverTargetId: null,
      startScrollTop,
      capturedTarget: pressed.target,
      capturedPointerId: pressed.pointerId,
    };
    dragRef.current = newDrag;
    setDrag(newDrag);
    try { pressed.target.setPointerCapture(pressed.pointerId); } catch {}
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(8); } catch {}
    }
  };

  const handleRowPointerMove = (e) => {
    if (dragRef.current) {
      handleDragMove(e);
      return;
    }
    const pressed = pressedItemRef.current;
    if (!pressed) return;

    // Manual scroll forwarding: on touch, touch-action:none disables native
    // scroll on rows so we replicate it here during the pre-drag phase.
    // Skip on desktop — the mouse wheel handles scroll independently and
    // forwarding pointermove deltas as scroll would fight the drag gesture.
    if (isTouchDeviceRef.current) {
      const scrollDelta = pressed.lastMoveY - e.clientY;
      if (listScrollRef.current && scrollDelta !== 0) {
        listScrollRef.current.scrollTop += scrollDelta;
      }
    }
    pressed.lastMoveX = e.clientX;
    pressed.lastMoveY = e.clientY;

    // If already committed to scroll-only mode, just keep forwarding scroll.
    if (pressed.scrollOnly) return;

    const dx = e.clientX - pressed.startX;
    const dy = e.clientY - pressed.startY;
    const dist2 = dx * dx + dy * dy;
    const elapsed = Date.now() - pressed.pressedAt;

    // If user moved too far before hold time elapsed, they're scrolling —
    // cancel drag eligibility but keep scroll forwarding alive.
    if (elapsed < DRAG_DELAY_MS && dist2 > SCROLL_CANCEL_DIST * SCROLL_CANCEL_DIST) {
      pressed.scrollOnly = true;
      if (pressTimerRef.current) { clearTimeout(pressTimerRef.current); pressTimerRef.current = null; }
      return;
    }

    if (dist2 > DRAG_MOVE_THRESHOLD * DRAG_MOVE_THRESHOLD) {
      if (elapsed >= DRAG_DELAY_MS) {
        // Both thresholds met — activate immediately.
        if (pressTimerRef.current) { clearTimeout(pressTimerRef.current); pressTimerRef.current = null; }
        commitDrag(pressed);
        pressedItemRef.current = null;
      } else if (!pressTimerRef.current) {
        // Distance met but hold time not yet — wait out the remainder, then activate
        // if the user is still pressing and hasn't scrolled away.
        pressTimerRef.current = setTimeout(() => {
          pressTimerRef.current = null;
          const stillPressed = pressedItemRef.current;
          if (stillPressed && !stillPressed.scrollOnly) {
            const sdx = stillPressed.lastMoveX - stillPressed.startX;
            const sdy = stillPressed.lastMoveY - stillPressed.startY;
            if (sdx * sdx + sdy * sdy > SCROLL_CANCEL_DIST * SCROLL_CANCEL_DIST) {
              stillPressed.scrollOnly = true;
              return;
            }
            commitDrag(stillPressed);
            pressedItemRef.current = null;
          }
        }, DRAG_DELAY_MS - elapsed);
      }
    }
  };

  const handleRowPointerUp = () => {
    if (dragRef.current) {
      handleDragEnd();
      return;
    }
    if (pressTimerRef.current) { clearTimeout(pressTimerRef.current); pressTimerRef.current = null; }
    pressedItemRef.current = null;
    // Click event fires next; tap → action menu is handled by onClick.
  };

  const handleRowPointerCancel = () => {
    if (pressTimerRef.current) { clearTimeout(pressTimerRef.current); pressTimerRef.current = null; }
    pressedItemRef.current = null;
    if (dragRef.current) handleDragEnd();
  };

  const telemetryCode = folder?.name
    ? `MC-04 / ${folder.name.toUpperCase()}`
    : 'MC-04 / READY';
  const accent = folder?.accent || T.cyan;

  // Search filter: match top-level items by text/description; for folders,
  // match by folder name (include all children) OR by any child matching
  // (include just the matching children). Folders with matches render as
  // expanded without mutating item.expanded — that state is preserved for
  // when the query clears.
  const trimmedQuery = searchQuery.trim().toLowerCase();
  const isSearching = trimmedQuery.length > 0;
  const matchesText = (s) => (s || '').toLowerCase().includes(trimmedQuery);
  const displayItems = !isSearching ? items : items.flatMap(item => {
    if (item.type === 'folder') {
      if (matchesText(item.name)) {
        return [{ ...item, expanded: true }];
      }
      const matchingChildren = (item.children || []).filter(
        c => matchesText(c.text) || matchesText(c.description)
      );
      if (matchingChildren.length > 0) {
        return [{ ...item, expanded: true, children: matchingChildren }];
      }
      return [];
    }
    if (matchesText(item.text) || matchesText(item.description)) {
      return [item];
    }
    return [];
  });

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 0 24px', minHeight: 0 }}>
      <div style={{ paddingTop: 8 }}>
        <Telemetry time="04:32:11 UTC" code={telemetryCode} state="STANDBY" color={accent} />
      </div>

      {onBack && (
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '12px 20px 0',
          flexShrink: 0,
        }}>
          <button
            onClick={onBack}
            aria-label="Back to folders"
            style={{
              all: 'unset', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '8px 12px 8px 8px', borderRadius: 99,
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${T.hairline}`,
              color: T.text2,
              fontFamily: T.mono, fontSize: 10, letterSpacing: '0.22em',
              textTransform: 'uppercase', fontWeight: 600,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 11 11">
              <path d="M7.5 1.5L3.5 5.5L7.5 9.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Folders
          </button>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 24px 0', minHeight: 0 }}>
        <Eyebrow color={accent} style={{ marginBottom: 14 }}>Pre-flight</Eyebrow>
        <h1 style={{
          fontFamily: T.display, fontWeight: 600, fontSize: 36, lineHeight: 1.05,
          letterSpacing: '-0.02em', color: T.text, margin: 0,
          marginBottom: 20,
        }}>
          What mission<br/>are we launching?
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          {items.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${isSearching ? 'rgba(0,229,255,0.42)' : T.hairlineSoft}`,
              borderRadius: 14, padding: '8px 10px 8px 12px',
              marginBottom: 8, flexShrink: 0,
              boxShadow: isSearching
                ? '0 0 0 3px rgba(0,229,255,0.08), 0 0 18px rgba(0,229,255,0.10)'
                : 'none',
              transition: 'border-color 200ms ease, box-shadow 200ms ease',
            }}>
              <svg
                width="14" height="14" viewBox="0 0 14 14"
                aria-hidden="true"
                style={{ color: isSearching ? T.cyan : T.text3, flexShrink: 0 }}
              >
                <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.4" fill="none"/>
                <path d="M9 9l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search this checklist"
                aria-label="Search checklist"
                style={{
                  all: 'unset',
                  flex: 1, minWidth: 0,
                  fontFamily: T.display, fontSize: 14, color: T.text,
                  lineHeight: 1.45, padding: '4px 0',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); searchInputRef.current?.focus(); }}
                  aria-label="Clear search"
                  style={{
                    all: 'unset', cursor: 'pointer', flexShrink: 0,
                    width: 24, height: 24, borderRadius: 99,
                    background: 'rgba(255,255,255,0.06)',
                    color: T.text2,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <svg width="9" height="9" viewBox="0 0 10 10">
                    <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
            </div>
          )}
          {items.length > 0 && (
            <button
              onClick={handleLazyLaunch}
              disabled={!!drag}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                width: '100%',
                padding: '14px 16px',
                background: `linear-gradient(180deg, rgba(0,229,255,0.20), rgba(79,227,193,0.12))`,
                border: `1px solid rgba(0,229,255,0.5)`,
                borderRadius: 14,
                fontFamily: T.display, fontSize: 14, fontWeight: 600,
                color: T.text,
                letterSpacing: '0.04em', textTransform: 'uppercase',
                cursor: drag ? 'default' : 'pointer',
                transition: 'all 200ms ease',
                WebkitTapHighlightColor: 'transparent',
                WebkitAppearance: 'none', appearance: 'none',
                marginBottom: 8, flexShrink: 0,
                boxShadow: `0 0 0 1px rgba(0,229,255,0.15) inset, 0 4px 24px rgba(0,229,255,0.18)`,
              }}
              onTouchStart={e => e.currentTarget.style.transform = 'scale(0.985)'}
              onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.985)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" style={{ color: T.cyan, filter: `drop-shadow(0 0 6px ${T.cyan})` }}>
                <path d="M7 1l-3 7h3l-2 5L11 6H8l2-5z" fill="currentColor"/>
              </svg>
              I'm Lazy, Help Me
            </button>
          )}

          {addingItem ? (
            <div style={{
              display: 'flex', alignItems: 'flex-end', gap: 6,
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid rgba(0,229,255,0.42)`,
              borderRadius: 14, padding: '8px 8px 8px 14px',
              boxShadow: '0 0 0 3px rgba(0,229,255,0.08), 0 0 24px rgba(0,229,255,0.10)',
              marginBottom: 8, flexShrink: 0,
              transition: 'border-color 200ms ease, box-shadow 200ms ease',
            }}>
              <textarea
                ref={newItemInputRef}
                className="scroll-thin"
                value={newItemDraft}
                onChange={e => {
                  setNewItemDraft(e.target.value);
                  autoResizeTextarea(e.target);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddItem();
                  } else if (e.key === 'Escape') {
                    setAddingItem(false);
                    setNewItemDraft('');
                  }
                }}
                placeholder="Type or paste one or more tasks. Shift+Enter for newline."
                rows={1}
                style={{
                  all: 'unset',
                  display: 'block', boxSizing: 'border-box',
                  flex: 1, minWidth: 0, width: '100%',
                  fontFamily: T.display, fontSize: 14, color: T.text,
                  lineHeight: 1.45, padding: '6px 0',
                  minHeight: 22, maxHeight: 240,
                  resize: 'none',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  overflowY: 'hidden',
                }}
              />
              <button
                onClick={handleAddItem}
                disabled={!newItemDraft.trim() || savingItem}
                aria-label={savingItem ? 'Saving' : 'Save'}
                style={{
                  all: 'unset', flexShrink: 0,
                  cursor: (newItemDraft.trim() && !savingItem) ? 'pointer' : 'default',
                  width: 30, height: 30, borderRadius: 99,
                  background: newItemDraft.trim()
                    ? `linear-gradient(180deg, ${T.cyan}, ${T.blue})`
                    : 'rgba(255,255,255,0.05)',
                  color: newItemDraft.trim() ? '#001018' : T.text3,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: newItemDraft.trim() ? `0 0 12px ${T.cyan}88` : 'none',
                  transition: 'all 200ms ease',
                  opacity: savingItem ? 0.7 : 1,
                }}
              >
                {savingItem ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" style={{ animation: 'spin360 800ms linear infinite' }}>
                    <path d="M10 6a4 4 0 1 1-1.2-2.85M10 1.5V4H7.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 13 13">
                    <path d="M2 6.5l3 3 6-7" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
              <button
                onClick={handleCreateFolderFromInput}
                aria-label="Create folder"
                title="Create folder"
                style={{
                  all: 'unset', cursor: 'pointer', flexShrink: 0,
                  width: 30, height: 30, borderRadius: 99,
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${T.hairlineSoft}`,
                  color: T.text2,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <svg width="14" height="13" viewBox="0 0 14 13" fill="none">
                  <path d="M1 3.5C1 2.67 1.67 2 2.5 2H5.38l1.25 1.5H11.5C12.33 3.5 13 4.17 13 5v5.5C13 11.33 12.33 12 11.5 12h-9C1.67 12 1 11.33 1 10.5V3.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                </svg>
              </button>
              <button
                onClick={() => { setAddingItem(false); setNewItemDraft(''); }}
                aria-label="Cancel"
                style={{
                  all: 'unset', cursor: 'pointer', flexShrink: 0,
                  width: 30, height: 30, borderRadius: 99,
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${T.hairlineSoft}`,
                  color: T.text2,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <svg width="9" height="9" viewBox="0 0 10 10"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddingItem(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'rgba(79,227,193,0.07)',
                border: `1px solid rgba(79,227,193,0.30)`,
                borderRadius: 14, padding: '12px 14px',
                fontFamily: T.display, fontSize: 14, fontWeight: 500,
                color: T.teal,
                cursor: 'pointer', textAlign: 'left',
                transition: 'all 150ms',
                WebkitAppearance: 'none', appearance: 'none',
                WebkitTapHighlightColor: 'transparent',
                marginBottom: 8, flexShrink: 0,
                letterSpacing: '0.02em',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14">
                <path d="M7 1.5v11M1.5 7h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              Add Item
            </button>
          )}

          {itemsError && (
            <div style={{
              fontFamily: T.mono, fontSize: 9.5, letterSpacing: '0.18em',
              color: T.warn, textTransform: 'uppercase',
              textAlign: 'center', lineHeight: 1.4,
              marginBottom: 8, flexShrink: 0,
            }}>
              {itemsError}
            </div>
          )}

          <div ref={listScrollRef} className="scroll-thin" style={{
            display: 'flex', flexDirection: 'column', gap: 8,
            flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: 4,
            userSelect: 'none', WebkitUserSelect: 'none',
            overscrollBehavior: 'contain',
          }}>
            {itemsLoading && items.length === 0 && (
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
                Syncing queue from cloud…
              </div>
            )}
            {(() => {
              // Global priority numbering across top-level items + folder children.
              // Folders themselves don't get a number; their children continue the
              // sequence so the badges reflect the launch order.
              priorityMapRef.current = new Map();
              let n = 0;
              for (const it of items) {
                if (it.type === 'folder') {
                  for (const c of (it.children || [])) {
                    n += 1;
                    priorityMapRef.current.set(c.id, n);
                  }
                } else {
                  n += 1;
                  priorityMapRef.current.set(it.id, n);
                }
              }
              return null;
            })()}
            {isSearching && displayItems.length === 0 && (
              <div style={{
                fontFamily: T.mono, fontSize: 10, letterSpacing: '0.22em',
                color: T.text3, textTransform: 'uppercase',
                textAlign: 'center', padding: '24px 0',
              }}>
                No items found
              </div>
            )}
            {displayItems.map((item, idx) => {
              const isDragging = drag?.id === item.id;
              const others = drag ? items.filter(i => i.id !== drag.id) : [];
              const othersIdx = drag && !isDragging
                ? others.findIndex(i => i.id === item.id)
                : -1;
              const showIndicatorBefore = drag && !isDragging && drag.dropIdx === othersIdx;
              const isFirstItem = idx === 0;
              const highlightDelay = highlightedIds.get(item.id);
              const isHighlighted = highlightDelay !== undefined;
              const isSelected = selectedItemId === item.id;
              const isEditing = editingItemId === item.id;
              const isHoverTarget = drag && drag.hoverTargetId === item.id;

              // Folder row — different layout from a flat item.
              if (item.type === 'folder') {
                const expanded = !!item.expanded;
                const childCount = Array.isArray(item.children) ? item.children.length : 0;
                const folderName = item.name || 'New Folder';
                return (
                  <Fragment key={item.id}>
                    {showIndicatorBefore && <DropIndicator />}
                    <div
                      ref={el => { if (el) itemRefs.current[item.id] = el; else delete itemRefs.current[item.id]; }}
                      data-item-id={item.id}
                      style={{
                        display: 'flex', flexDirection: 'column', gap: 8,
                        flexShrink: 0,
                        // Transform on the wrapper so children visually move with the folder during drag.
                        transform: isDragging
                          ? `translateY(${drag.deltaY}px) scale(1.02)`
                          : 'none',
                        zIndex: isDragging ? 10 : 1,
                        opacity: isDragging ? 0.96 : 1,
                        transition: isDragging
                          ? 'opacity 200ms ease'
                          : 'transform 220ms cubic-bezier(0.2,0.8,0.2,1)',
                        willChange: isDragging ? 'transform' : 'auto',
                      }}
                    >
                    <div
                      onClick={() => handleFolderClick(item)}
                      onPointerDown={(e) => handleRowPointerDown(e, item, idx)}
                      onPointerMove={handleRowPointerMove}
                      onPointerUp={handleRowPointerUp}
                      onPointerCancel={handleRowPointerCancel}
                      role="button"
                      tabIndex={0}
                      aria-label={`Folder ${folderName}, ${childCount} items, ${expanded ? 'expanded' : 'collapsed'}`}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleFolderExpanded(item.id); } }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: 'linear-gradient(180deg, rgba(168,118,255,0.10), rgba(168,118,255,0.03))',
                        border: `1px solid rgba(168,118,255,0.4)`,
                        borderRadius: 14, padding: '4px 4px 4px 4px',
                        fontFamily: T.display, fontSize: 14, color: T.text,
                        cursor: isDragging ? 'grabbing' : 'pointer', textAlign: 'left',
                        WebkitTapHighlightColor: 'transparent',
                        flexShrink: 0, minHeight: 48,
                        position: 'relative',
                        boxShadow: isDragging
                          ? `0 12px 32px rgba(168,118,255,0.32), 0 0 24px rgba(168,118,255,0.20)`
                          : `0 0 12px rgba(168,118,255,0.14)`,
                        transition: 'box-shadow 200ms ease, border-color 200ms ease',
                        touchAction: isTouchDeviceRef.current ? 'none' : 'auto',
                        animation: isHighlighted
                          ? `greenPulse 1s ease-out ${highlightDelay}ms, folderPop 360ms cubic-bezier(0.2,0.8,0.2,1)`
                          : undefined,
                      }}
                    >
                      {/* Folder badge */}
                      <div
                        aria-hidden="true"
                        style={{
                          flexShrink: 0,
                          height: 30, minWidth: 30, padding: '0 6px',
                          boxSizing: 'border-box',
                          borderRadius: 10,
                          background: `linear-gradient(180deg, ${T.purple}, rgba(168,118,255,0.6))`,
                          color: '#0e0820',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: `0 0 12px rgba(168,118,255,0.45), inset 0 1px 0 rgba(255,255,255,0.18)`,
                          pointerEvents: 'none',
                          marginLeft: 4,
                          transition: 'transform 200ms ease',
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14">
                          <path d="M1.5 3.5a1 1 0 0 1 1-1h3l1 1.2h5a1 1 0 0 1 1 1V11a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V3.5z" fill="currentColor"/>
                        </svg>
                      </div>
                      {/* Title + count */}
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1 }}>
                        <span style={{
                          fontFamily: T.display, fontSize: 14, fontWeight: 600,
                          color: item.name ? T.text : T.text2,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          letterSpacing: '-0.01em',
                        }}>{folderName}</span>
                        <span style={{
                          fontFamily: T.mono, fontSize: 9, letterSpacing: '0.18em',
                          color: T.text3, textTransform: 'uppercase',
                        }}>
                          {childCount} {childCount === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                      {/* Expand chevron */}
                      <div
                        aria-hidden="true"
                        style={{
                          flexShrink: 0,
                          width: 32, height: 32, borderRadius: 99,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          color: T.text2,
                          transition: 'transform 200ms ease, color 200ms ease',
                          transform: expanded ? 'rotate(180deg)' : 'none',
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12">
                          <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      {/* Delete folder — X opens confirmation */}
                      <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); setFolderDeleteConfirmId(item.id); }}
                        aria-label={`Delete folder ${folderName}`}
                        style={{
                          all: 'unset', cursor: 'pointer', flexShrink: 0,
                          width: 32, height: 32, borderRadius: 99,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          color: T.text3,
                          transition: 'color 150ms',
                          WebkitTapHighlightColor: 'transparent',
                        }}
                      >
                        <svg width="10" height="10" viewBox="0 0 10 10">
                          <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </div>
                    {/* Children list — visible when expanded. */}
                    {expanded && Array.isArray(item.children) && item.children.length > 0 && (
                      <div style={{
                        display: 'flex', flexDirection: 'column', gap: 6,
                        margin: '0 0 0 20px',
                        paddingLeft: 14,
                        borderLeft: `1px dashed rgba(168,118,255,0.32)`,
                        flexShrink: 0,
                      }}>
                        {item.children.map((child, ci) => {
                          const isChildDragging = drag?.id === child.id && drag?.dragSource?.type === 'folder-child';
                          const childSelected = selectedItemId === child.id;
                          const childEditing = editingItemId === child.id;
                          const childHighlightDelay = highlightedIds.get(child.id);
                          const isChildHighlighted = childHighlightDelay !== undefined;
                          return (
                          <div
                            key={child.id}
                            className={isChildHighlighted ? 'new-item-highlight' : undefined}
                            onClick={() => handleRowClick(child)}
                            onPointerDown={(e) => handleChildPointerDown(e, child, item.id)}
                            onPointerMove={handleRowPointerMove}
                            onPointerUp={handleRowPointerUp}
                            onPointerCancel={handleRowPointerCancel}
                            role="button"
                            tabIndex={0}
                            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleRowTap(child); } }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              background: childSelected
                                ? 'linear-gradient(180deg, rgba(0,229,255,0.14), rgba(0,229,255,0.04))'
                                : childEditing
                                  ? 'linear-gradient(180deg, rgba(168,118,255,0.14), rgba(168,118,255,0.04))'
                                  : 'rgba(255,255,255,0.02)',
                              border: `1px solid ${
                                childSelected ? 'rgba(0,229,255,0.6)'
                                : childEditing ? 'rgba(168,118,255,0.55)'
                                : T.hairlineSoft
                              }`,
                              borderRadius: 12, padding: '8px 10px',
                              fontFamily: T.display, fontSize: 13, color: T.text2,
                              cursor: isChildDragging ? 'grabbing' : 'pointer', textAlign: 'left',
                              WebkitTapHighlightColor: 'transparent',
                              flexShrink: 0,
                              position: 'relative',
                              transform: isChildDragging ? `translateY(${drag.deltaY}px) scale(1.03)` : 'none',
                              zIndex: isChildDragging ? 10 : 1,
                              opacity: isChildDragging ? 0.96 : 1,
                              boxShadow: isChildDragging
                                ? `0 12px 32px rgba(0,229,255,0.32), 0 0 24px rgba(0,229,255,0.20)`
                                : childSelected
                                  ? `0 0 14px rgba(0,229,255,0.22)`
                                  : childEditing
                                    ? `0 0 14px rgba(168,118,255,0.22)`
                                    : 'none',
                              transition: isChildDragging
                                ? 'box-shadow 200ms ease, opacity 200ms ease'
                                : 'transform 220ms cubic-bezier(0.2,0.8,0.2,1), box-shadow 120ms ease, border-color 200ms ease, background 200ms ease',
                              willChange: isChildDragging ? 'transform' : 'auto',
                              animationDelay: isChildHighlighted ? `${childHighlightDelay}ms` : undefined,
                              touchAction: isTouchDeviceRef.current ? 'none' : 'auto',
                            }}
                          >
                            <span style={{
                              width: 6, height: 6, borderRadius: 1,
                              background: T.purple, opacity: 0.6, flexShrink: 0,
                            }} />
                            <span style={{
                              flex: 1, minWidth: 0,
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>{child.text}</span>
                            <button
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                setItemOptionsId(prev => prev === child.id ? null : child.id);
                                setSelectedItemId(null);
                              }}
                              aria-label={`Options for ${child.text}`}
                              style={{
                                all: 'unset', cursor: 'pointer', flexShrink: 0,
                                width: 28, height: 28, borderRadius: 99,
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                color: T.text3,
                                background: 'rgba(255,255,255,0.05)',
                                border: `1px solid ${T.hairlineSoft}`,
                                WebkitTapHighlightColor: 'transparent',
                              }}
                            >
                              <svg width="13" height="13" viewBox="0 0 14 14">
                                <circle cx="2.5" cy="7" r="1.25" fill="currentColor"/>
                                <circle cx="7" cy="7" r="1.25" fill="currentColor"/>
                                <circle cx="11.5" cy="7" r="1.25" fill="currentColor"/>
                              </svg>
                            </button>
                            <button
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => { e.stopPropagation(); handleLaunchItem(child.text, { id: child.id, index: -1 }, child.description); }}
                              aria-label={`Launch ${child.text}`}
                              style={{
                                all: 'unset', cursor: 'pointer', flexShrink: 0,
                                width: 28, height: 28, borderRadius: 99,
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                color: T.cyan,
                                background: 'rgba(0,229,255,0.10)',
                                border: '1px solid rgba(0,229,255,0.28)',
                                boxShadow: '0 0 8px rgba(0,229,255,0.15)',
                                transition: 'color 150ms, background 150ms',
                                WebkitTapHighlightColor: 'transparent',
                              }}
                            >
                              <svg width="11" height="11" viewBox="0 0 14 14">
                                <path d="M7 1l5 6h-3v6H5V7H2l5-6z" fill="currentColor"/>
                              </svg>
                            </button>
                          </div>
                          );
                        })}
                      </div>
                    )}
                    </div>
                  </Fragment>
                );
              }

              return (
                <Fragment key={item.id}>
                  {showIndicatorBefore && <DropIndicator />}
                  <div
                    ref={el => { if (el) itemRefs.current[item.id] = el; else delete itemRefs.current[item.id]; }}
                    data-item-id={item.id}
                    className={isHighlighted ? 'new-item-highlight' : undefined}
                    onClick={() => handleRowClick(item)}
                    onPointerDown={(e) => handleRowPointerDown(e, item, idx)}
                    onPointerMove={handleRowPointerMove}
                    onPointerUp={handleRowPointerUp}
                    onPointerCancel={handleRowPointerCancel}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleRowTap(item); } }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: isHoverTarget
                        ? 'linear-gradient(180deg, rgba(168,118,255,0.22), rgba(168,118,255,0.08))'
                        : isSelected
                          ? 'linear-gradient(180deg, rgba(0,229,255,0.14), rgba(0,229,255,0.04))'
                          : isEditing
                            ? 'linear-gradient(180deg, rgba(168,118,255,0.14), rgba(168,118,255,0.04))'
                            : isFirstItem
                              ? 'linear-gradient(180deg, rgba(0,229,255,0.07), rgba(255,255,255,0.025))'
                              : 'rgba(255,255,255,0.025)',
                      border: `1px solid ${
                        isHoverTarget ? 'rgba(168,118,255,0.7)'
                        : isSelected ? 'rgba(0,229,255,0.6)'
                        : isEditing ? 'rgba(168,118,255,0.55)'
                        : isFirstItem ? 'rgba(0,229,255,0.32)'
                        : T.hairlineSoft
                      }`,
                      borderRadius: 14, padding: '4px 4px 4px 4px',
                      fontFamily: T.display, fontSize: 14, color: T.text,
                      cursor: isDragging ? 'grabbing' : 'pointer', textAlign: 'left',
                      WebkitTapHighlightColor: 'transparent',
                      flexShrink: 0, minHeight: 48,
                      position: 'relative',
                      transform: isDragging
                        ? `translateY(${drag.deltaY}px) scale(1.02)`
                        : isHoverTarget ? `scale(${1 + hoverProgress * 0.025})` : 'none',
                      zIndex: isDragging ? 10 : 1,
                      boxShadow: isDragging
                        ? `0 12px 32px rgba(0,229,255,0.32), 0 0 24px rgba(0,229,255,0.20)`
                        : isHoverTarget
                          ? `0 0 0 ${2 + hoverProgress * 4}px rgba(168,118,255,${0.18 + hoverProgress * 0.32}), 0 0 ${20 + hoverProgress * 20}px rgba(168,118,255,${0.25 + hoverProgress * 0.35})`
                          : isSelected
                            ? `0 0 18px rgba(0,229,255,0.30)`
                            : isEditing
                              ? `0 0 18px rgba(168,118,255,0.30)`
                              : isFirstItem
                                ? `0 0 12px rgba(0,229,255,0.10)`
                                : 'none',
                      opacity: isDragging ? 0.96 : 1,
                      transition: isDragging
                        ? 'box-shadow 200ms ease, opacity 200ms ease'
                        : 'transform 220ms cubic-bezier(0.2,0.8,0.2,1), box-shadow 120ms ease, border-color 200ms ease, background 200ms ease',
                      willChange: isDragging || isHoverTarget ? 'transform' : 'auto',
                      animationDelay: isHighlighted ? `${highlightDelay}ms` : undefined,
                      touchAction: isTouchDeviceRef.current ? 'none' : 'auto',
                    }}
                  >
                    {/* Priority badge — reflects the item's current rank.
                         Visual only (pointer-events: none) so the entire row
                         remains the drag target. */}
                    <div
                      aria-hidden="true"
                      style={{
                        flexShrink: 0,
                        height: 30, minWidth: 30,
                        padding: '0 8px',
                        boxSizing: 'border-box',
                        borderRadius: 99,
                        background: isFirstItem
                          ? `linear-gradient(180deg, ${T.cyan}, ${T.blue})`
                          : 'linear-gradient(180deg, rgba(0,229,255,0.16), rgba(0,229,255,0.06))',
                        border: `1px solid ${isFirstItem ? 'transparent' : 'rgba(0,229,255,0.42)'}`,
                        color: isFirstItem ? '#001018' : T.cyan,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: T.mono, fontSize: 12, fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums',
                        letterSpacing: '0.02em',
                        boxShadow: isFirstItem
                          ? `0 0 14px rgba(0,229,255,0.45), inset 0 1px 0 rgba(255,255,255,0.2)`
                          : 'inset 0 1px 0 rgba(255,255,255,0.04)',
                        textShadow: isFirstItem ? 'none' : `0 0 8px rgba(0,229,255,0.4)`,
                        pointerEvents: 'none',
                        marginLeft: 4,
                        transition: 'background 200ms ease, color 200ms ease, box-shadow 200ms ease',
                      }}
                    >
                      {priorityMapRef.current.get(item.id) ?? (idx + 1)}
                    </div>
                    <span style={{
                      flex: 1, minWidth: 0,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      fontWeight: isFirstItem ? 600 : 500,
                    }}>{item.text}</span>
                    {/* Options menu trigger — three dots, neutral; opens Remove / Check Off */}
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setItemOptionsId(prev => prev === item.id ? null : item.id);
                        setSelectedItemId(null);
                      }}
                      aria-label={`Options for ${item.text}`}
                      style={{
                        all: 'unset', cursor: 'pointer', flexShrink: 0,
                        width: 32, height: 32, borderRadius: 99,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        color: T.text3,
                        background: 'rgba(255,255,255,0.05)',
                        border: `1px solid ${T.hairlineSoft}`,
                        transition: 'color 150ms, background 150ms',
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14">
                        <circle cx="2.5" cy="7" r="1.25" fill="currentColor"/>
                        <circle cx="7" cy="7" r="1.25" fill="currentColor"/>
                        <circle cx="11.5" cy="7" r="1.25" fill="currentColor"/>
                      </svg>
                    </button>
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); handleLaunchItem(item.text, { id: item.id, index: idx }, item.description); }}
                      aria-label={`Launch ${item.text}`}
                      style={{
                        all: 'unset', cursor: 'pointer', flexShrink: 0,
                        width: 32, height: 32, borderRadius: 99,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        color: T.cyan,
                        background: 'rgba(0,229,255,0.10)',
                        border: '1px solid rgba(0,229,255,0.28)',
                        boxShadow: '0 0 8px rgba(0,229,255,0.15)',
                        transition: 'color 150ms, background 150ms',
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 14 14">
                        <path d="M7 1l5 6h-3v6H5V7H2l5-6z" fill="currentColor"/>
                      </svg>
                    </button>
                  </div>
                </Fragment>
              );
            })}
            {/* Drop indicator at end of list when pointer is past the last item */}
            {drag && drag.dropIdx === items.filter(i => i.id !== drag.id).length && <DropIndicator />}
          </div>
        </div>
      </div>

      {selectedItemId && (
        <div style={{ padding: '0 24px' }}>
          {/* ── Action menu for the selected item ───────────────────── */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleStartEdit}
              style={{
                flex: 1, height: 60, borderRadius: 18,
                background: 'linear-gradient(180deg, rgba(168,118,255,0.16), rgba(168,118,255,0.06))',
                border: `1px solid rgba(168,118,255,0.45)`,
                color: T.text,
                fontFamily: T.display, fontSize: 14, fontWeight: 600,
                letterSpacing: '0.04em', textTransform: 'uppercase',
                cursor: 'pointer',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 0 18px rgba(168,118,255,0.14)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13">
                <path d="M1.5 11.5l1.5-3.5L8 2.5l2.5 2.5-5.5 5.5L1.5 11.5z" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinejoin="round"/>
              </svg>
              Edit Item
            </button>
            <GlowButton
              onClick={handleSelectedLaunch}
              style={{ flex: 1, height: 60 }}
            >
              Launch
              <svg width="14" height="14" viewBox="0 0 14 14">
                <path d="M7 1l5 6h-3v6H5V7H2l5-6z" fill="currentColor"/>
              </svg>
            </GlowButton>
          </div>
        </div>
      )}

      {itemOptionsId && (
        <div style={{ padding: '0 24px' }}>
          {/* ── ⋯ options menu: Remove Item / Check Off ──────────────── */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => { handleDeleteItem(itemOptionsId); setItemOptionsId(null); }}
              style={{
                flex: 1, height: 60, borderRadius: 18,
                background: 'linear-gradient(180deg, rgba(255,179,71,0.14), rgba(255,179,71,0.04))',
                border: `1px solid rgba(255,179,71,0.4)`,
                color: T.warn,
                fontFamily: T.display, fontSize: 14, fontWeight: 600,
                letterSpacing: '0.04em', textTransform: 'uppercase',
                cursor: 'pointer',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 0 18px rgba(255,179,71,0.10)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13">
                <path d="M1 1l11 11M12 1L1 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
              Remove
            </button>
            <button
              onClick={() => handleCheckOff(itemOptionsId)}
              style={{
                flex: 1, height: 60, borderRadius: 18,
                background: 'linear-gradient(180deg, rgba(0,255,110,0.16), rgba(0,255,110,0.04))',
                border: `1px solid rgba(0,255,110,0.45)`,
                color: '#00e56e',
                fontFamily: T.display, fontSize: 14, fontWeight: 600,
                letterSpacing: '0.04em', textTransform: 'uppercase',
                cursor: 'pointer',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 0 18px rgba(0,255,110,0.12)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13">
                <path d="M2 7l3.5 3.5 5.5-7" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Check Off
            </button>
          </div>
        </div>
      )}

      {/* Edit-item overlay — appears centered over the screen when
          an item's Edit action is picked. Reuses the auto-expanding
          textarea pattern. The underlying checklist layout is
          unchanged when this opens/closes. */}
      {editingItemId && (
        <EditItemOverlay
          item={findItemAnywhere(editingItemId)?.item}
          saving={savingItem}
          startMode={overlayStartMode}
          onCancel={handleCancelEdit}
          onSave={handleSaveEdit}
        />
      )}

      {editingFolderId && (
        <EditItemOverlay
          item={(() => { const f = items.find(i => i.id === editingFolderId); return f ? { id: f.id, text: f.name || '' } : null; })()}
          saving={false}
          startMode="view"
          onCancel={handleCancelFolderEdit}
          onSave={handleSaveFolderEdit}
        />
      )}

      {namingFolderId && (
        <FolderNamingOverlay
          folder={items.find(i => i.id === namingFolderId)}
          onSkip={() => setNamingFolderId(null)}
          onSave={(name) => handleSaveFolderName(namingFolderId, name)}
        />
      )}

      {folderDeleteConfirmId && (() => {
        const confirmFolder = items.find(i => i.id === folderDeleteConfirmId);
        const confirmName = confirmFolder?.name || 'New Folder';
        return (
          <div
            onClick={() => setFolderDeleteConfirmId(null)}
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
                boxShadow: `0 0 0 1px rgba(255,255,255,0.05) inset, 0 30px 80px rgba(0,0,0,0.65), 0 0 60px rgba(168,118,255,0.30)`,
                backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
                animation: 'modalIn 280ms cubic-bezier(0.2,0.8,0.2,1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: `linear-gradient(180deg, ${T.purple}, rgba(168,118,255,0.6))`,
                  color: '#0e0820',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 0 14px rgba(168,118,255,0.5), inset 0 1px 0 rgba(255,255,255,0.18)`,
                  flexShrink: 0,
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
                  }}>Delete folder</div>
                  <div style={{
                    fontFamily: T.display, fontSize: 16, color: T.text, fontWeight: 600,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{confirmName}</div>
                </div>
              </div>
              <div style={{
                fontFamily: T.display, fontSize: 13, color: T.text2,
                marginBottom: 16, lineHeight: 1.4,
              }}>
                Are you sure you want to delete this folder? All items inside it will also be removed.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setFolderDeleteConfirmId(null)}
                  style={{
                    all: 'unset', cursor: 'pointer', flex: 1,
                    textAlign: 'center', padding: '12px 14px',
                    fontFamily: T.display, fontSize: 14, fontWeight: 600, color: T.text,
                    borderRadius: 12,
                    border: `1px solid ${T.hairlineSoft}`,
                    background: 'rgba(255,255,255,0.04)',
                  }}
                >No</button>
                <button
                  onClick={() => {
                    handleDeleteItem(folderDeleteConfirmId);
                    setFolderDeleteConfirmId(null);
                  }}
                  style={{
                    all: 'unset', cursor: 'pointer', flex: 1,
                    textAlign: 'center', padding: '12px 14px',
                    fontFamily: T.display, fontSize: 14, fontWeight: 600, color: '#0e0820',
                    borderRadius: 12,
                    background: `linear-gradient(180deg, ${T.purple}, rgba(168,118,255,0.7))`,
                    boxShadow: `0 0 16px rgba(168,118,255,0.4)`,
                  }}
                >Yes</button>
              </div>
            </div>
          </div>
        );
      })()}

      {emptyFolderPrompt && (
        <div
          onClick={() => resolveEmptyFolderPrompt('keep')}
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
              boxShadow: `0 0 0 1px rgba(255,255,255,0.05) inset, 0 30px 80px rgba(0,0,0,0.65), 0 0 60px rgba(168,118,255,0.30)`,
              backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
              animation: 'modalIn 280ms cubic-bezier(0.2,0.8,0.2,1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: `linear-gradient(180deg, ${T.purple}, rgba(168,118,255,0.6))`,
                color: '#0e0820',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 0 14px rgba(168,118,255,0.5), inset 0 1px 0 rgba(255,255,255,0.18)`,
                flexShrink: 0,
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
                  Folder is empty
                </div>
                <div style={{
                  fontFamily: T.display, fontSize: 16, color: T.text, fontWeight: 600,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {emptyFolderPrompt.folderName}
                </div>
              </div>
            </div>
            <div style={{
              fontFamily: T.display, fontSize: 13, color: T.text2,
              marginBottom: 16, lineHeight: 1.4,
            }}>
              You moved the last item out. Delete this folder, or keep it empty for later?
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => resolveEmptyFolderPrompt('keep')}
                style={{
                  all: 'unset', cursor: 'pointer', flex: 1,
                  textAlign: 'center', padding: '12px 14px',
                  fontFamily: T.display, fontSize: 14, fontWeight: 600, color: T.text,
                  borderRadius: 12,
                  border: `1px solid ${T.hairlineSoft}`,
                  background: 'rgba(255,255,255,0.04)',
                }}
              >Keep empty</button>
              <button
                onClick={() => resolveEmptyFolderPrompt('delete')}
                style={{
                  all: 'unset', cursor: 'pointer', flex: 1,
                  textAlign: 'center', padding: '12px 14px',
                  fontFamily: T.display, fontSize: 14, fontWeight: 600, color: '#0e0820',
                  borderRadius: 12,
                  background: `linear-gradient(180deg, ${T.purple}, rgba(168,118,255,0.7))`,
                  boxShadow: `0 0 16px rgba(168,118,255,0.4)`,
                }}
              >Delete folder</button>
            </div>
          </div>
        </div>
      )}

      {pendingUndo && (
        <div
          key={pendingUndo.deletedAt}
          role="status"
          style={{
            position: 'fixed',
            top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
            left: 16, right: 16,
            zIndex: 100,
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'rgba(11, 16, 26, 0.92)',
            border: `1px solid ${T.hairline}`,
            borderRadius: 14,
            padding: '11px 12px 11px 16px',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            boxShadow: '0 14px 36px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)',
            fontFamily: T.display,
            animation: 'toastIn 240ms cubic-bezier(0.2, 0.8, 0.2, 1)',
            maxWidth: 480, marginLeft: 'auto', marginRight: 'auto',
            overflow: 'hidden',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: T.mono, fontSize: 9.5, letterSpacing: '0.22em',
              color: T.text3, textTransform: 'uppercase', marginBottom: 2,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: 99, background: T.warn,
                boxShadow: `0 0 6px ${T.warn}`,
              }} />
              Item deleted
              {motionPermission === 'granted' && (
                <span style={{ color: T.text3, marginLeft: 4, fontSize: 9 }}>· shake to restore</span>
              )}
            </div>
            <div style={{
              fontSize: 13, color: T.text2, fontWeight: 500,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {pendingUndo.item.text}
            </div>
          </div>
          <button
            onClick={handleUndoDelete}
            style={{
              all: 'unset', cursor: 'pointer', flexShrink: 0,
              padding: '8px 16px', borderRadius: 99,
              background: `linear-gradient(180deg, rgba(0,229,255,0.20), rgba(61,127,255,0.12))`,
              border: `1px solid rgba(0,229,255,0.5)`,
              color: T.text,
              fontFamily: T.mono, fontSize: 11, letterSpacing: '0.2em',
              fontWeight: 600, textTransform: 'uppercase',
              boxShadow: `0 0 14px rgba(0,229,255,0.25)`,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Undo
          </button>
          {/* draining progress bar — visual countdown of the 10s window */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, height: 2,
            background: `linear-gradient(90deg, ${T.cyan}, ${T.blue})`,
            boxShadow: `0 0 8px ${T.cyan}88`,
            animation: 'toastDrain 10s linear forwards',
          }} />
        </div>
      )}

      {emptyListToast && (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 110px)',
            left: 16, right: 16,
            zIndex: 100,
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(11, 16, 26, 0.92)',
            border: `1px solid ${T.hairline}`,
            borderRadius: 14,
            padding: '12px 16px',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            boxShadow: '0 14px 36px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)',
            fontFamily: T.display,
            animation: 'toastIn 240ms cubic-bezier(0.2, 0.8, 0.2, 1)',
            maxWidth: 480, marginLeft: 'auto', marginRight: 'auto',
          }}
        >
          <span style={{
            width: 6, height: 6, borderRadius: 99, flexShrink: 0,
            background: T.text3,
          }} />
          <span style={{ fontSize: 14, color: T.text2, fontWeight: 500 }}>
            No items in your checklist
          </span>
        </div>
      )}
    </div>
  );
}
