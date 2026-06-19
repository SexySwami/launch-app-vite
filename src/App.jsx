import { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { identifyUser, resetAnalytics, track } from './lib/analytics.js';
import { T } from './tokens.js';
import { SignIn } from './components/SignIn.jsx';
import { Onboarding, ONBOARDING_KEY } from './components/Onboarding.jsx';
import { registerTokenGetter } from './lib/authToken.js';
import { apiFetch } from './lib/apiFetch.js';
import { MissionInput } from './components/MissionInput.jsx';
import { Countdown } from './components/Countdown.jsx';
import { ExecutionStep } from './components/ExecutionStep.jsx';
import { Reward } from './components/Reward.jsx';
import { NextPhase } from './components/NextPhase.jsx';
import { Dashboard } from './components/Dashboard.jsx';
import { BottomNav } from './components/BottomNav.jsx';
import { CompletedSteps } from './components/CompletedSteps.jsx';
import { HomeScreen } from './components/HomeScreen.jsx';
import { ModeSelect } from './components/ModeSelect.jsx';
import { SmallChunker } from './components/SmallChunker.jsx';
import { DeepFocus } from './components/DeepFocus.jsx';
import { ProfileScreen } from './components/ProfileScreen.jsx';
import { RootFolderScreen } from './components/RootFolderScreen.jsx';
import { SetBreak } from './components/SetBreak.jsx';
import { BreakInProgress } from './components/BreakInProgress.jsx';
import { BreakComplete } from './components/BreakComplete.jsx';
import { BreakTransition } from './components/BreakTransition.jsx';
import { WhatsNext } from './components/WhatsNext.jsx';
import { ChooseTaskOverlay } from './components/ChooseTaskOverlay.jsx';
import { primeBreakAudio, startBreakAlarmLoop } from './lib/breakAlarm.js';
import { requestNotificationPermission, scheduleBreakAlarm, cancelBreakAlarm } from './lib/pushNotification.js';
import { generateSteps } from './lib/generateSteps.js';
import { generateMicroSteps } from './lib/generateMicroSteps.js';
import { generateDeepFocusSteps } from './lib/generateDeepFocusSteps.js';

// Root folders the Checklists tab can drill into. Order is preserved in the UI.
const BASE_FOLDERS = [
  { id: 'short-list', name: 'Short List', accent: T.rose,  iconKey: 'short-list', code: 'RT-00', tagline: "Today's Focus" },
  { id: 'work',       name: 'Work',       accent: T.cyan,   iconKey: 'work',       code: 'RT-01', tagline: 'Mission Ops'   },
  { id: 'personal',   name: 'Personal',   accent: T.purple, iconKey: 'personal',   code: 'RT-02', tagline: 'Off-Duty'      },
  { id: 'health',     name: 'Health',     accent: T.teal,   iconKey: 'health',     code: 'RT-03', tagline: 'Vital Signs'   },
  { id: 'dailies',    name: 'Dailies',    accent: T.amber,  iconKey: 'dailies',    code: 'RT-04', tagline: 'Recurring'     },
];
const CUSTOM_ACCENT_CYCLE = [T.blue, T.rose, T.teal, T.amber, T.cyan, T.purple];
const DEFAULT_FOLDER_ID = 'work';

// Thin auth wrapper — handles Clerk loading + sign-in gate, then renders
// AppInner. Keeping it separate means AppInner's hooks are never called
// conditionally, which satisfies React's Rules of Hooks.
export default function App() {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const { user } = useUser();
  useEffect(() => { registerTokenGetter(getToken); }, [getToken]);

  // Identify the signed-in user in PostHog. Reset first if the user ID
  // changed (account switch) or went away (sign-out) so each account gets its
  // own distinct PostHog person — without reset(), signing in as a different
  // account on the same browser merges all identities into one profile.
  const prevUserIdRef = useRef(null);
  useEffect(() => {
    if (user?.id) {
      if (prevUserIdRef.current && prevUserIdRef.current !== user.id) {
        resetAnalytics(); // account switched — fresh slate for new user
      }
      identifyUser(user.id, user.primaryEmailAddress?.emailAddress);
      prevUserIdRef.current = user.id;
    } else if (prevUserIdRef.current) {
      resetAnalytics(); // signed out
      prevUserIdRef.current = null;
      setShowOnboarding(true);
    }
  }, [user?.id]);

  // First-time sign-up detection. Fires `sign_up` exactly once per Clerk
  // account per browser by combining two guards:
  //   1. A per-account localStorage flag so it can never double-fire in the
  //      same browser (even if the user returns later).
  //   2. A 1-hour Clerk account-age check so returning users who log in on a
  //      new device don't trigger a false sign-up event.
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user?.id) return;
    try {
      const storageKey = `launch:signed_up:${user.id}`;
      if (localStorage.getItem(storageKey)) return;     // already fired in this browser
      localStorage.setItem(storageKey, '1');
      const accountAgeMs = Date.now() - new Date(user.createdAt).getTime();
      if (accountAgeMs < 60 * 60 * 1000) {             // account < 1 hour old → genuine new sign-up
        track('sign_up', {
          // 'oauth' = Google / social login; 'email' = email+password
          method: user.externalAccounts?.length > 0 ? 'oauth' : 'email',
        });
      }
    } catch {}
  }, [isLoaded, isSignedIn, user?.id]);

  // Show onboarding whenever the user is not signed in — always.
  const [showOnboarding, setShowOnboarding] = useState(true);

  // Dismiss the native HTML boot loader (visible before JS runs) once Clerk
  // has resolved auth state. Fade it out so the transition is seamless.
  useEffect(() => {
    if (!isLoaded) return;
    const el = document.getElementById('app-boot-loader');
    if (!el) return;
    el.classList.add('hide');
    const id = setTimeout(() => el.remove(), 280);
    return () => clearTimeout(id);
  }, [isLoaded]);

  if (!isLoaded) return null;
  if (!isSignedIn) {
    if (showOnboarding) return <Onboarding onDone={() => setShowOnboarding(false)} />;
    return <SignIn />;
  }
  return <AppInner />;
}

function AppInner() {
  const [screen, setScreen] = useState('home');
  const [mission, setMission] = useState('');
  const [stepIdx, setStepIdx] = useState(0);
  const [momentumGained, setMomentumGained] = useState(0);
  const [momentum, setMomentum] = useState(232);
  const [launchesToday, setLaunchesToday] = useState(2);
  const [stepOverrides, setStepOverrides] = useState({});
  const [steps, setSteps] = useState([]);
  const [completedFourSteps, setCompletedFourSteps] = useState([]); // accumulates across keep-going batches
  const hasFinalizedRef = useRef(false); // prevents duplicate finalize calls across keep-going batches
  const [stepsLoading, setStepsLoading] = useState(false);
  const [stepsError, setStepsError] = useState(null);
  const [cascadeLoading, setCascadeLoading] = useState(false);
  const [cascadeFromIdx, setCascadeFromIdx] = useState(-1);
  const [microCascadeLoading, setMicroCascadeLoading] = useState(false);
  const [microCascadeFromBatchPos, setMicroCascadeFromBatchPos] = useState(-1);
  const [deepCascadeLoading, setDeepCascadeLoading] = useState(false);
  const [deepCascadeFromBatchPos, setDeepCascadeFromBatchPos] = useState(-1);

  // Completion-logging state.
  const [completionGroupId, setCompletionGroupId] = useState(null);
  const [sourceItemId, setSourceItemId] = useState(null);
  const [sourceItemIndex, setSourceItemIndex] = useState(null);
  const [sourceFolderId, setSourceFolderId] = useState(DEFAULT_FOLDER_ID);
  const [sourceDescription, setSourceDescription] = useState(null);
  const [shortListEntryId, setShortListEntryId] = useState(null);
  const [loggedSteps, setLoggedSteps] = useState(() => new Set());

  // Which mode the user picked on the ModeSelect screen. Read by the
  // Countdown's onComplete to decide which card flow to land on.
  const [selectedMode, setSelectedMode] = useState(null); // 'fourStep' | 'smallChunker' | 'deepFocus' | null

  // Small Chunker on-demand batch state. Each batch generates 4 steps via a
  // fresh /api/generate-micro-steps call. microSteps accumulates across
  // batches so subsequent calls can pass full history for AI continuity.
  const [microMode, setMicroMode] = useState(false);
  const [microSteps, setMicroSteps] = useState([]);
  const [microBatch, setMicroBatch] = useState(0);          // 1-indexed batch number
  const [microInBatchIdx, setMicroInBatchIdx] = useState(0); // 0-3 within current batch
  const [microLoading, setMicroLoading] = useState(false);

  // Deep Focus on-demand batch state. Parallel to micro* — keeps the two
  // modes fully independent so neither can interfere with the other.
  const [deepMode, setDeepMode] = useState(false);
  const [deepSteps, setDeepSteps] = useState([]);
  const [deepBatch, setDeepBatch] = useState(0);
  const [deepInBatchIdx, setDeepInBatchIdx] = useState(0);
  const [deepLoading, setDeepLoading] = useState(false);

  // On Break toggle — persisted across sessions.
  const [onBreak, setOnBreak] = useState(() => {
    try { return localStorage.getItem('onBreak') !== 'false'; } catch { return true; }
  });
  useEffect(() => {
    try { localStorage.setItem('onBreak', onBreak); } catch {}
  }, [onBreak]);

  // ── Analytics: app_opened ─────────────────────────────────────────────────
  // Fires once per page load / app mount while the user is signed in.
  // Distinct from mission_launched — lets us see users who open the app but
  // don't start a mission (engagement gap), and is the basis for D1/D7
  // retention cohorts (returning to the app, not just completing tasks).
  useEffect(() => {
    track('app_opened');
  }, []); // empty deps = once per mount

  // ── Analytics: mission_abandoned ──────────────────────────────────────────
  // Fires when the user navigates away from the active mission flow without
  // completing it. Tells us exactly where people drop off inside a session:
  //   step_reached 0  = bailed before finishing step 1
  //   step_reached 1  = finished step 1, quit before step 2
  //   abandoned_from_screen = which screen they were on when they left
  //   mode = which mode they had chosen (or 'not_selected' if they quit on modeSelect)
  const prevScreenRef = useRef(null);
  useEffect(() => {
    const EXECUTION_SCREENS = new Set([
      'modeSelect', 'countdown', 'step', 'reward', 'nextphase', 'smallChunker', 'deepFocus',
    ]);
    const prev = prevScreenRef.current;
    prevScreenRef.current = screen;

    if (
      prev !== null &&
      EXECUTION_SCREENS.has(prev) &&
      !EXECUTION_SCREENS.has(screen) &&
      mission &&
      !hasFinalizedRef.current
    ) {
      track('mission_abandoned', {
        mission,
        mode: selectedMode || 'not_selected',
        step_reached: stepIdx,
        abandoned_from_screen: prev,
      });
    }
  }, [screen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Break Flow (tab-driven): the user picks a duration, the timer counts
  // down, an alarm fires at zero, then they get a tiny-commitment prompt
  // and a transition ritual before landing back home.
  const [breakDurationMin, setBreakDurationMin] = useState(20);
  const [breakEndsAt, setBreakEndsAt] = useState(null);
  const [breakTotalSec, setBreakTotalSec] = useState(0);
  const breakAudioCtxRef = useRef(null);

  // Post-break landing task. Survives the entire break flow so the
  // user can pick on `break-next` and have it pre-fill the home
  // input the moment they return after the Transition Ritual.
  const [preselectedTask, setPreselectedTask] = useState(null);
  const [choosingTask, setChoosingTask] = useState(false);

  const startBreak = (mins) => {
    const total = Math.max(1, Math.round(mins * 60));
    const endsAt = Date.now() + total * 1000;
    setBreakTotalSec(total);
    setBreakEndsAt(endsAt);
    primeBreakAudio(breakAudioCtxRef);
    requestNotificationPermission().then((granted) => {
      if (granted) scheduleBreakAlarm(endsAt);
    });
    setScreen('break-progress');
  };

  // SetBreak's Start / Quick5 land here so the user can pre-pick a
  // post-break task before the timer starts.
  const goToWhatsNext = (mins) => {
    setBreakDurationMin(mins);
    setScreen('break-next');
  };

  const handleBreakComplete = () => {
    cancelBreakAlarm();
    setScreen('break-complete');
  };

  // Ring the alarm on a loop the entire time the BreakComplete screen
  // is up. The cleanup fires when the screen changes (Yes, 5 More Min,
  // tab nav) so the chime always stops once the user commits.
  useEffect(() => {
    if (screen !== 'break-complete') return undefined;
    const stop = startBreakAlarmLoop(breakAudioCtxRef);
    return stop;
  }, [screen]);

  const handleBreakFiveMore = () => {
    const total = 5 * 60;
    const endsAt = Date.now() + total * 1000;
    setBreakTotalSec(total);
    setBreakEndsAt(endsAt);
    primeBreakAudio(breakAudioCtxRef);
    requestNotificationPermission().then((granted) => {
      if (granted) scheduleBreakAlarm(endsAt);
    });
    setScreen('break-progress');
  };

  const handleBreakDone = () => {
    setBreakEndsAt(null);
    setBreakTotalSec(0);
    const task = preselectedTask;
    setPreselectedTask(null);

    if (!task?.text) {
      // Nothing pre-selected: go home with a blank input.
      setMission('');
      setScreen('home');
      return;
    }

    // Jump straight into the first execution card, skipping StandUp,
    // ModeSelect, and Countdown entirely to reduce post-break friction.
    // Use whichever mode the user last selected; fall back to fourStep.
    const source = { id: task.id ?? null, folderId: task.folderId ?? null };

    if (selectedMode === 'deepFocus') {
      setDeepMode(true);
      setDeepSteps([]);
      setDeepBatch(1);
      setDeepInBatchIdx(0);
      fetchDeepBatch(1, [], task.text);
      launchMission(task.text, source, task.description ?? null, 'deepFocus');
    } else if (selectedMode === 'smallChunker') {
      // Prime the Small Chunker micro-step state before calling launchMission
      // so the screen is ready to render; pass the mission text explicitly
      // since the React state update from launchMission won't flush until
      // after this synchronous handler completes.
      setMicroMode(true);
      setMicroSteps([]);
      setMicroBatch(1);
      setMicroInBatchIdx(0);
      fetchMicroBatch(1, [], task.text);
      launchMission(task.text, source, task.description ?? null, 'smallChunker');
    } else {
      // fourStep (or first-ever launch with no prior mode): land on the
      // step cards. ExecutionStep handles the loading state while steps arrive.
      stepReturnScreenRef.current = 'home';
      launchMission(task.text, source, task.description ?? null, 'step');
    }
  };

  // Home-screen Generate/History navigation.
  const [currentItemIdx, setCurrentItemIdx] = useState(-1);

  // User-created custom root folders, persisted to localStorage.
  const [customFolders, setCustomFolders] = useState(() => {
    try { return JSON.parse(localStorage.getItem('launch:custom-folders') || '[]'); }
    catch { return []; }
  });
  const [hiddenFolderIds, setHiddenFolderIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('launch:hidden-folders') || '[]'); }
    catch { return []; }
  });
  const folders = useMemo(
    () => [...BASE_FOLDERS, ...customFolders].filter(f => !hiddenFolderIds.includes(f.id)),
    [customFolders, hiddenFolderIds],
  );

  const handleCreateFolder = (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const accent = CUSTOM_ACCENT_CYCLE[customFolders.length % CUSTOM_ACCENT_CYCLE.length];
    const idx = BASE_FOLDERS.length + customFolders.length;
    const newFolder = {
      id: `custom-${Date.now()}`,
      name: trimmed,
      accent,
      iconKey: 'custom',
      code: `RT-${String(idx).padStart(2, '0')}`,
      tagline: trimmed.split(' ')[0],
    };
    const next = [...customFolders, newFolder];
    setCustomFolders(next);
    try { localStorage.setItem('launch:custom-folders', JSON.stringify(next)); } catch {}
  };

  const handleDeleteFolder = (folderId) => {
    const nextCustom = customFolders.filter(f => f.id !== folderId);
    setCustomFolders(nextCustom);
    try { localStorage.setItem('launch:custom-folders', JSON.stringify(nextCustom)); } catch {}
    if (BASE_FOLDERS.some(f => f.id === folderId)) {
      const nextHidden = [...hiddenFolderIds.filter(id => id !== folderId), folderId];
      setHiddenFolderIds(nextHidden);
      try { localStorage.setItem('launch:hidden-folders', JSON.stringify(nextHidden)); } catch {}
    }
    if (openFolderId === folderId) setOpenFolderId(null);
  };

  // Root-folder routing inside the Checklists tab.
  // - openFolderId: null → root folder selection; otherwise the folder being shown.
  // - mountedFolderIds: lazy-mount set so once a folder is opened, its
  //   MissionInput stays mounted (hidden) — Back never loses its state.
  // - lastLaunchedFolderId: which checklist the user launched from, so the
  //   post-completion "Keep Going" button can return there.
  const [openFolderId, setOpenFolderId] = useState(null);
  const [mountedFolderIds, setMountedFolderIds] = useState(() => new Set());
  const lastLaunchedFolderIdRef = useRef(DEFAULT_FOLDER_ID);
  const stepReturnScreenRef = useRef('home');
  // Remember which screen was active when we navigated to modeSelect so
  // the Back button returns the user to where they came from.
  const modeSelectReturnScreenRef = useRef('home');

  const openFolder = (folderId) => {
    setMountedFolderIds(prev => {
      if (prev.has(folderId)) return prev;
      const next = new Set(prev);
      next.add(folderId);
      return next;
    });
    setOpenFolderId(folderId);
  };

  const resolvedStep = useMemo(() => {
    const base = steps[stepIdx];
    if (!base) return base;
    const ov = stepOverrides[stepIdx];
    return ov ? { ...base, ...ov } : base;
  }, [steps, stepIdx, stepOverrides]);

  const handleEditStep = async (stepUpdate) => {
    const newTitle = typeof stepUpdate === 'string' ? stepUpdate : stepUpdate.title;
    const overrideFields = typeof stepUpdate === 'string'
      ? { title: stepUpdate }
      : { title: stepUpdate.title, ...(typeof stepUpdate.hint === 'string' ? { hint: stepUpdate.hint } : {}) };
    setStepOverrides(prev => ({ ...prev, [stepIdx]: overrideFields }));

    const total = steps.length;
    if (stepIdx >= total - 1 || !canCallAPI) return;

    const lockedSteps = steps.slice(0, stepIdx + 1).map((s, i) => ({
      tag: s.tag,
      title: i === stepIdx ? newTitle : (stepOverrides[i]?.title || s.title),
      hint: s.hint || '',
    }));
    const remainingTags = steps.slice(stepIdx + 1).map(s => s.tag);
    setCascadeFromIdx(stepIdx);
    setCascadeLoading(true);
    try {
      const res = await apiFetch('/api/regenerate-remaining', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          mission,
          ...(sourceDescription ? { description: sourceDescription } : {}),
          lockedSteps,
          remainingTags,
          count: total - stepIdx - 1,
          mode: 'fourStep',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.steps) && data.steps.length > 0) {
        setSteps(prev => {
          const next = [...prev];
          data.steps.forEach((s, i) => { next[stepIdx + 1 + i] = s; });
          return next;
        });
        setStepOverrides(prev => {
          const next = { ...prev };
          for (let i = stepIdx + 1; i < total; i++) delete next[i];
          return next;
        });
      }
    } catch {}
    finally {
      setCascadeLoading(false);
      setCascadeFromIdx(-1);
    }
  };

  const handleMicroStepEdited = async (batchPos, newTitle) => {
    if (batchPos >= 3 || !canCallAPI) return;
    const batchStart = (microBatch - 1) * 4;
    const absolutePos = batchStart + batchPos;
    const lockedSteps = microSteps.slice(0, absolutePos + 1).map((s, i) => ({
      title: i === absolutePos ? newTitle : (s.title || ''),
      description: s.description || '',
    }));
    const count = 4 - batchPos - 1;
    setMicroCascadeFromBatchPos(batchPos);
    setMicroCascadeLoading(true);
    try {
      const res = await apiFetch('/api/regenerate-remaining', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          mission,
          ...(sourceDescription ? { description: sourceDescription } : {}),
          lockedSteps,
          count,
          mode: 'micro',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.steps) && data.steps.length > 0) {
        setMicroSteps(prev => {
          const next = [...prev];
          next[absolutePos] = { ...next[absolutePos], title: newTitle };
          data.steps.forEach((s, i) => { next[absolutePos + 1 + i] = s; });
          return next;
        });
      }
    } catch {}
    finally {
      setMicroCascadeLoading(false);
      setMicroCascadeFromBatchPos(-1);
    }
  };

  const handleDeepStepEdited = async (batchPos, newTitle) => {
    if (batchPos >= 3 || !canCallAPI) return;
    const batchStart = (deepBatch - 1) * 4;
    const absolutePos = batchStart + batchPos;
    const lockedSteps = deepSteps.slice(0, absolutePos + 1).map((s, i) => ({
      title: i === absolutePos ? newTitle : (s.title || ''),
      description: s.description || '',
    }));
    const count = 4 - batchPos - 1;
    setDeepCascadeFromBatchPos(batchPos);
    setDeepCascadeLoading(true);
    try {
      const res = await apiFetch('/api/regenerate-remaining', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          mission,
          ...(sourceDescription ? { description: sourceDescription } : {}),
          lockedSteps,
          count,
          mode: 'deep',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.steps) && data.steps.length > 0) {
        setDeepSteps(prev => {
          const next = [...prev];
          next[absolutePos] = { ...next[absolutePos], title: newTitle };
          data.steps.forEach((s, i) => { next[absolutePos + 1 + i] = s; });
          return next;
        });
      }
    } catch {}
    finally {
      setDeepCascadeLoading(false);
      setDeepCascadeFromBatchPos(-1);
    }
  };

  const advanceStep = () => {
    const reward = steps[stepIdx]?.reward || 4;
    setMomentumGained(g => g + reward);
    if (stepIdx + 1 >= steps.length) {
      finalizeCompletion();
      setMomentum(m => m + 15);
      setLaunchesToday(n => n + 1);
      setStepIdx(0);
      setScreen('reward');
    } else {
      setStepIdx(i => i + 1);
    }
  };

  const canCallAPI = typeof window !== 'undefined'
    && /^https?:$/.test(window.location?.protocol || '');

  const handleLogStep = async () => {
    if (!completionGroupId) return false;
    if (loggedSteps.has(stepIdx)) return false;
    const step = steps[stepIdx];
    if (!step) return false;

    track('step_completed', {
      mission,
      step_index: stepIdx,
      step_tag: step.tag || '',
      step_title: stepOverrides[stepIdx]?.title || step.title || '',
      is_final_step: stepIdx === steps.length - 1,
    });

    setLoggedSteps(prev => {
      const next = new Set(prev);
      next.add(stepIdx);
      return next;
    });

    if (!canCallAPI) return true;
    try {
      await apiFetch('/api/completed?action=log-step', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: completionGroupId,
          sourceItemId: sourceItemId || null,
          sourceItemIndex: typeof sourceItemIndex === 'number' ? sourceItemIndex : null,
          folderId: sourceFolderId,
          text: mission,
          ...(sourceDescription ? { description: sourceDescription } : {}),
          microStep: {
            tag: step.tag || '',
            title: stepOverrides[stepIdx]?.title || step.title || '',
            hint: step.hint || '',
          },
        }),
      });
    } catch (err) {
      setLoggedSteps(prev => {
        const next = new Set(prev);
        next.delete(stepIdx);
        return next;
      });
    }
    return true;
  };

  const finalizeCompletion = async () => {
    if (!completionGroupId) return;
    if (hasFinalizedRef.current) return; // already finalized for this mission — skip duplicates
    hasFinalizedRef.current = true;
    track('session_completed', { mission, steps_completed: loggedSteps.size });
    if (canCallAPI) {
      try {
        let wasOnShortList = false;
        // Remove the Short List reference for this item. Match by sourceItemId
        // first (precise, covers "Add to Short List" items) then fall back to
        // text match (covers items typed directly into the Short List).
        if (sourceFolderId !== 'short-list') {
          try {
            const slRes = await apiFetch('/api/queue?folder=short-list', { cache: 'no-store' });
            const slData = await slRes.json().catch(() => ({}));
            const slFlat = [];
            for (const item of Array.isArray(slData?.items) ? slData.items : []) {
              if (item?.type === 'folder' && Array.isArray(item.children)) {
                slFlat.push(...item.children.filter(c => c?.text));
              } else if (item?.text) {
                slFlat.push(item);
              }
            }
            const needle = mission.trim().toLowerCase();
            const slMatch = slFlat.find(i =>
              (sourceItemId && i.sourceItemId === sourceItemId) ||
              (i.text || '').trim().toLowerCase() === needle
            );
            if (slMatch) {
              wasOnShortList = true;
              await apiFetch(`/api/queue?folder=short-list&id=${encodeURIComponent(slMatch.id)}`, { method: 'DELETE' });
            }
          } catch {}
        }
        // When launched from the Short List itself or from another folder where
        // the item is also on the Short List, shortListEntryId is set at launch
        // time — delete the reference and flag wasOnShortList.
        if (shortListEntryId) {
          try {
            await apiFetch(`/api/queue?folder=short-list&id=${encodeURIComponent(shortListEntryId)}`, { method: 'DELETE' });
            wasOnShortList = true;
          } catch {}
        }

        // NOTE: the API also performs server-authoritative Short List detection
        // on finalize, so restore works even if the client checks above miss.
        await apiFetch('/api/completed?action=finalize', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            id: completionGroupId,
            sourceItemId: sourceItemId || null,
            sourceItemIndex: typeof sourceItemIndex === 'number' ? sourceItemIndex : null,
            folderId: sourceFolderId,
            text: mission,
            wasOnShortList,
            ...(sourceDescription ? { description: sourceDescription } : {}),
          }),
        });
        // Remove the original queue item from the *source* folder, not the
        // legacy default. MissionInput refetches on visibility change so its
        // local items will catch up.
        if (sourceItemId) {
          const folderParam = encodeURIComponent(sourceFolderId || DEFAULT_FOLDER_ID);
          await apiFetch(`/api/queue?folder=${folderParam}&id=${encodeURIComponent(sourceItemId)}`, { method: 'DELETE' });
        }
      } catch {}
    }
  };

  const handleBackStep = () => {
    if (stepIdx > 0) {
      const prevReward = steps[stepIdx - 1]?.reward || 4;
      setMomentumGained(g => Math.max(0, g - prevReward));
      setStepIdx(i => i - 1);
    } else {
      // First step → exit back to whichever checklist this launch came from
      // (or the root folder screen if we don't know).
      setStepIdx(0);
      setMomentumGained(0);
      setStepOverrides({});
      const returnScreen = stepReturnScreenRef.current || 'home';
      if (returnScreen === 'input') {
        if (lastLaunchedFolderIdRef.current) {
          openFolder(lastLaunchedFolderIdRef.current);
        } else {
          setOpenFolderId(null);
        }
      }
      setScreen(returnScreen);
    }
  };

  // Countdown's onComplete handler. By the time the countdown fires, the
  // user has already chosen a mode on ModeSelect, so we route straight to
  // the matching card flow.
  const startExecution = () => {
    track('countdown_completed', { mission, mode: selectedMode || 'step' });
    setStepIdx(0);
    setMomentumGained(0);
    stepReturnScreenRef.current = 'modeSelect';
    if (selectedMode === 'smallChunker') setScreen('smallChunker');
    else if (selectedMode === 'deepFocus') setScreen('deepFocus');
    else setScreen('step');
  };

  // `source` may include { id, index, folderId }. If no folderId is supplied
  // (e.g. Home-screen launches) we fall back to the default folder so the
  // queue DELETE on completion still hits a sensible Redis key.
  const launchMission = async (missionText, source, description, skipToScreen = null) => {
    const m = (missionText || '').trim();
    if (!m) return;
    track('mission_launched', { mission: m, source: source?.folderId || 'unknown' });
    setMission(m);
    setStepIdx(0);
    setMomentumGained(0);
    setStepOverrides({});
    setSteps([]);
    setCompletedFourSteps([]);
    hasFinalizedRef.current = false;
    setStepsError(null);
    setStepsLoading(true);
    setCascadeLoading(false);
    setCascadeFromIdx(-1);
    setCompletionGroupId(typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `c_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    setSourceItemId(source?.id || null);
    setSourceItemIndex(typeof source?.index === 'number' ? source.index : null);
    const launchFolderId = source?.folderId || DEFAULT_FOLDER_ID;
    setSourceFolderId(launchFolderId);
    setSourceDescription(description ? description.toString().trim() : null);
    setShortListEntryId(source?.shortListEntryId || null);
    lastLaunchedFolderIdRef.current = launchFolderId;
    setLoggedSteps(new Set());
    setSelectedMode(null);
    // Reset any lingering mode flags from a previous session so handleKeepGoing
    // always routes based on the mode the user picks for *this* launch, not a
    // stale deepMode/microMode left over from navigating away mid-run.
    resetMicroState();
    resetDeepState();
    const nextScreen = skipToScreen ?? 'modeSelect';
    if (nextScreen === 'modeSelect') modeSelectReturnScreenRef.current = screen;
    setScreen(nextScreen);

    try {
      if (!canCallAPI) throw new Error('__skip_api__');
      const res = await apiFetch('/api/generate-steps', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mission: m, ...(description ? { description: description.toString().trim() } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !Array.isArray(data.steps) || data.steps.length === 0) {
        throw new Error(data.error || `Generator returned ${res.status}`);
      }
      setSteps(data.steps);
    } catch (err) {
      setSteps(generateSteps(m));
      if (err.message !== '__skip_api__') {
        setStepsError(err.message || 'Could not generate steps');
      }
    } finally {
      setStepsLoading(false);
    }
  };

  // Tab nav: tapping Checklists always returns to the root folder screen
  // (per spec). Other tabs are unchanged. Break tab always lands on the
  // duration-picker; if the user re-taps it mid-countdown they'll get a
  // fresh setup screen rather than rejoining the running timer.
  const handleNav = (id) => {
    if (id === 'input') setOpenFolderId(null);
    setScreen(id);
  };

  // Post-completion routing (spec):
  //   I'm Good Now / Next Task → category (root folder) screen
  //   Keep Going               → the checklist the user launched from
  const resetMissionState = () => {
    setMission('');
    setMomentumGained(0);
    setStepOverrides({});
    setSteps([]);
    setCompletedFourSteps([]);
    setSourceDescription(null);
    setShortListEntryId(null);
  };
  // Small Chunker: fetch the next batch of 4. Appends to microSteps on success;
  // falls back to the local generator if the API is unavailable so the screen
  // never gets stuck on the loading state.
  // missionOverride is used by the post-break direct-launch path so the
  // correct mission text reaches the API before the mission state update
  // from launchMission has been flushed through a React render.
  const fetchMicroBatch = async (batchNumber, accumulatedSteps, missionOverride = null) => {
    const batchMission = missionOverride ?? mission;
    setMicroLoading(true);
    try {
      if (!canCallAPI) throw new Error('__skip_api__');
      const res = await apiFetch('/api/generate-micro-steps', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          mission: batchMission,
          ...(sourceDescription ? { description: sourceDescription } : {}),
          previousSteps: accumulatedSteps,
          batchNumber,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !Array.isArray(data.steps) || data.steps.length !== 4) {
        throw new Error(data.error || `Generator returned ${res.status}`);
      }
      setMicroSteps([...accumulatedSteps, ...data.steps]);
    } catch {
      const fallback = generateMicroSteps(batchMission, batchNumber, accumulatedSteps);
      setMicroSteps([...accumulatedSteps, ...fallback]);
    } finally {
      setMicroLoading(false);
    }
  };

  const resetMicroState = () => {
    setMicroMode(false);
    setMicroSteps([]);
    setMicroBatch(0);
    setMicroInBatchIdx(0);
    setMicroLoading(false);
  };

  const startSmallChunker = () => {
    // mode_selected: user picked Small Chunker on the mode screen.
    // Compare breakdown by mode in PostHog to see which resonates with users.
    track('mode_selected', { mode: 'smallChunker', mission });
    setSelectedMode('smallChunker');
    setMicroMode(true);
    setMicroSteps([]);
    setMicroBatch(1);
    setMicroInBatchIdx(0);
    fetchMicroBatch(1, []);
    setScreen('countdown');
  };

  const handleMicroBatchComplete = () => {
    track('step_completed', { mission, step_index: microInBatchIdx, mode: 'smallChunker', is_final_step: true });
    finalizeCompletion();
    setMomentum(m => m + 15);
    setLaunchesToday(n => n + 1);
    setScreen('reward');
  };

  // Deep Focus batch fetcher — calls /api/generate-deep-focus with the same
  // batch context structure as the Small Chunker, but uses the Four Step
  // Breakdown's style prompt. Falls back to local generator if API is down.
  const fetchDeepBatch = async (batchNumber, accumulatedSteps, missionOverride = null) => {
    const batchMission = missionOverride ?? mission;
    setDeepLoading(true);
    try {
      if (!canCallAPI) throw new Error('__skip_api__');
      const res = await apiFetch('/api/generate-deep-focus', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          mission: batchMission,
          ...(sourceDescription ? { description: sourceDescription } : {}),
          previousSteps: accumulatedSteps,
          batchNumber,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !Array.isArray(data.steps) || data.steps.length !== 4) {
        throw new Error(data.error || `Generator returned ${res.status}`);
      }
      setDeepSteps([...accumulatedSteps, ...data.steps]);
    } catch {
      const fallback = generateDeepFocusSteps(batchMission, batchNumber, accumulatedSteps);
      setDeepSteps([...accumulatedSteps, ...fallback]);
    } finally {
      setDeepLoading(false);
    }
  };

  const resetDeepState = () => {
    setDeepMode(false);
    setDeepSteps([]);
    setDeepBatch(0);
    setDeepInBatchIdx(0);
    setDeepLoading(false);
  };

  const startDeepFocus = () => {
    // mode_selected: user picked Deep Focus on the mode screen.
    track('mode_selected', { mode: 'deepFocus', mission });
    setSelectedMode('deepFocus');
    setDeepMode(true);
    setDeepSteps([]);
    setDeepBatch(1);
    setDeepInBatchIdx(0);
    fetchDeepBatch(1, []);
    setScreen('countdown');
  };

  const handleDeepBatchComplete = () => {
    track('step_completed', { mission, step_index: deepInBatchIdx, mode: 'deepFocus', is_final_step: true });
    finalizeCompletion();
    setMomentum(m => m + 15);
    setLaunchesToday(n => n + 1);
    setScreen('reward');
  };

  const handleKeepGoing = () => {
    if (deepMode) {
      const nextBatch = deepBatch + 1;
      setDeepBatch(nextBatch);
      setDeepInBatchIdx(0);
      fetchDeepBatch(nextBatch, deepSteps);
      setScreen('deepFocus');
      return;
    }
    if (microMode) {
      const nextBatch = microBatch + 1;
      setMicroBatch(nextBatch);
      setMicroInBatchIdx(0);
      fetchMicroBatch(nextBatch, microSteps);
      setScreen('smallChunker');
      return;
    }
    // Good (fourStep) mode — fetch the next batch of steps, passing the full
    // history of already-completed steps so Claude generates continuations,
    // not repeats. Accumulates across multiple keep-going presses.
    if (selectedMode === 'fourStep') {
      // Snapshot completed steps (current batch) before resetting state.
      const allCompleted = [...completedFourSteps, ...steps];
      setCompletedFourSteps(allCompleted);
      setStepIdx(0);
      setMomentumGained(0);
      setStepOverrides({});
      setLoggedSteps(new Set());
      setSteps([]);
      setStepsLoading(true);
      setStepsError(null);
      // Intentionally keep the same completionGroupId across keep-going batches.
      // Creating a new UUID here meant the server saw an unknown id on the second
      // finalize call and created a brand-new completed entry — duplicating the task.
      // With the same id, the server just updates the existing entry's completedAt.
      (async () => {
        try {
          if (!canCallAPI) throw new Error('__skip_api__');
          const res = await apiFetch('/api/generate-steps', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              mission,
              ...(sourceDescription ? { description: sourceDescription } : {}),
              ...(allCompleted.length > 0 ? {
                previousSteps: allCompleted.map(s => ({ title: s.title, hint: s.hint || '' })),
              } : {}),
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !Array.isArray(data.steps) || data.steps.length === 0) {
            throw new Error(data.error || `Generator returned ${res.status}`);
          }
          setSteps(data.steps);
        } catch (err) {
          setSteps(generateSteps(mission));
          if (err.message !== '__skip_api__') setStepsError(err.message || 'Could not generate steps');
        } finally {
          setStepsLoading(false);
        }
      })();
      setScreen('step');
      return;
    }
    resetMissionState();
    const target = lastLaunchedFolderIdRef.current;
    if (target) openFolder(target);
    else setOpenFolderId(null);
    setScreen('input');
  };
  const handleAllDone = () => {
    resetMissionState();
    if (microMode) resetMicroState();
    if (deepMode) resetDeepState();
    setOpenFolderId(null);
    setScreen('input');
  };
  const handleNextTask = () => {
    resetMissionState();
    if (microMode) resetMicroState();
    if (deepMode) resetDeepState();
    setOpenFolderId(null);
    setScreen('input');
  };

  // Render the Checklists tab as a layered stack: the root folder selection
  // takes layout, and each lazily-mounted folder MissionInput overlays it
  // (absolutely positioned). Switching folders hides via visibility:hidden
  // so component state — fetched items, drag/edit state, etc. — survives.
  const renderInputBranch = () => {
    const foldersById = Object.fromEntries(folders.map(f => [f.id, f]));
    return (
      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {!openFolderId && (
          <RootFolderScreen
            folders={folders}
            onOpen={openFolder}
            onSearchSelect={(item) => { setMission(item.text); setScreen('home'); }}
            onCreateFolder={handleCreateFolder}
            onDeleteFolder={handleDeleteFolder}
          />
        )}
        {Array.from(mountedFolderIds).map(fid => {
          const folder = foldersById[fid];
          if (!folder) return null;
          const active = openFolderId === fid;
          return (
            <div
              key={fid}
              style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                visibility: active ? 'visible' : 'hidden',
                pointerEvents: active ? 'auto' : 'none',
              }}
              aria-hidden={!active}
            >
              <MissionInput
                folderId={fid}
                folder={folder}
                active={active}
                onLaunch={launchMission}
                mission={mission}
                setMission={setMission}
                onBack={() => setOpenFolderId(null)}
              />
            </div>
          );
        })}
      </div>
    );
  };

  let body = null;
  if (screen === 'home')
    body = (
      <HomeScreen
        mission={mission}
        setMission={setMission}
        onLaunch={(text, folderId) => launchMission(text, { folderId: folderId || DEFAULT_FOLDER_ID })}
        currentItemIdx={currentItemIdx}
        setCurrentItemIdx={setCurrentItemIdx}
        folders={folders}
        onProfile={() => setScreen('profile')}
      />
    );
  else if (screen === 'profile')
    body = <ProfileScreen />;
  else if (screen === 'input')
    body = renderInputBranch();
  else if (screen === 'break-set')
    body = (
      <SetBreak
        duration={breakDurationMin}
        onDurationChange={setBreakDurationMin}
        onStart={() => goToWhatsNext(breakDurationMin)}
        onQuick5={() => goToWhatsNext(5)}
      />
    );
  else if (screen === 'break-next')
    body = (
      <WhatsNext
        selectedTask={preselectedTask}
        onChoose={() => setChoosingTask(true)}
        onSkip={() => { setPreselectedTask(null); startBreak(breakDurationMin); }}
        onStart={() => startBreak(breakDurationMin)}
      />
    );
  else if (screen === 'break-progress')
    body = (
      <BreakInProgress
        endsAt={breakEndsAt}
        totalSec={breakTotalSec}
        onComplete={handleBreakComplete}
        onEndEarly={handleBreakComplete}
      />
    );
  else if (screen === 'break-complete')
    body = (
      <BreakComplete
        onYes={() => setScreen('break-transition')}
        onFiveMore={handleBreakFiveMore}
      />
    );
  else if (screen === 'break-transition')
    body = (
      <ModeSelect
        onSelectFourStep={() => { setSelectedMode('fourStep'); handleBreakDone(); }}
        onSelectSmallChunker={() => { setSelectedMode('smallChunker'); handleBreakDone(); }}
        onSelectDeepFocus={() => { setSelectedMode('deepFocus'); handleBreakDone(); }}
        onBack={handleBreakDone}
        onTooMuch={() => setScreen('break-ritual')}
      />
    );
  else if (screen === 'break-ritual')
    body = <BreakTransition onDone={() => setScreen('break-transition')} onBack={() => setScreen('break-transition')} />;
  else if (screen === 'countdown')
    body = <Countdown onComplete={startExecution} />;
  else if (screen === 'mode-ritual')
    body = <BreakTransition onDone={() => setScreen('modeSelect')} onBack={() => setScreen('modeSelect')} />;
  else if (screen === 'modeSelect')
    body = (
      <ModeSelect
        onSelectFourStep={() => { track('mode_selected', { mode: 'fourStep', mission }); setSelectedMode('fourStep'); setScreen('countdown'); }}
        onSelectSmallChunker={startSmallChunker}
        onSelectDeepFocus={startDeepFocus}
        onBack={() => setScreen(modeSelectReturnScreenRef.current)}
        onTooMuch={() => setScreen('mode-ritual')}
      />
    );
  else if (screen === 'smallChunker')
    body = (
      <SmallChunker
        mission={mission}
        description={sourceDescription}
        completionGroupId={completionGroupId}
        sourceItemId={sourceItemId}
        sourceItemIndex={sourceItemIndex}
        sourceFolderId={sourceFolderId}
        batchSteps={microSteps.slice((microBatch - 1) * 4, microBatch * 4)}
        batchNumber={microBatch}
        firstStepNumber={(microBatch - 1) * 4 + 1}
        inBatchIdx={microInBatchIdx}
        loading={microLoading}
        cascadeLoading={microCascadeLoading && microInBatchIdx > microCascadeFromBatchPos}
        allSteps={microSteps}
        onAdvanceInBatch={() => {
          track('step_completed', { mission, step_index: microInBatchIdx, mode: 'smallChunker', is_final_step: microInBatchIdx === 3 });
          setMicroInBatchIdx(i => i + 1);
        }}
        onGoBack={() => setMicroInBatchIdx(i => i - 1)}
        onBatchComplete={handleMicroBatchComplete}
        onFinish={handleMicroBatchComplete}
        onStepEdited={handleMicroStepEdited}
        onBack={() => { resetMicroState(); setScreen('modeSelect'); }}
      />
    );
  else if (screen === 'deepFocus')
    body = (
      <DeepFocus
        mission={mission}
        description={sourceDescription}
        completionGroupId={completionGroupId}
        sourceItemId={sourceItemId}
        sourceItemIndex={sourceItemIndex}
        sourceFolderId={sourceFolderId}
        batchSteps={deepSteps.slice((deepBatch - 1) * 4, deepBatch * 4)}
        batchNumber={deepBatch}
        firstStepNumber={(deepBatch - 1) * 4 + 1}
        inBatchIdx={deepInBatchIdx}
        loading={deepLoading}
        cascadeLoading={deepCascadeLoading && deepInBatchIdx > deepCascadeFromBatchPos}
        allSteps={deepSteps}
        onAdvanceInBatch={() => {
          track('step_completed', { mission, step_index: deepInBatchIdx, mode: 'deepFocus', is_final_step: deepInBatchIdx === 3 });
          setDeepInBatchIdx(i => i + 1);
        }}
        onGoBack={() => setDeepInBatchIdx(i => i - 1)}
        onBatchComplete={handleDeepBatchComplete}
        onFinish={handleDeepBatchComplete}
        onStepEdited={handleDeepStepEdited}
        onBack={() => { resetDeepState(); setScreen('modeSelect'); }}
      />
    );
  else if (screen === 'step')
    body = (
      <ExecutionStep
        step={resolvedStep}
        stepIdx={stepIdx}
        totalSteps={steps.length || 4}
        momentumGained={momentumGained}
        onComplete={advanceStep}
        onEditStep={handleEditStep}
        onBack={handleBackStep}
        onLogStep={handleLogStep}
        stepLogged={loggedSteps.has(stepIdx)}
        mission={mission}
        description={sourceDescription}
        loading={stepsLoading || !resolvedStep}
        cascadeLoading={cascadeLoading && stepIdx > cascadeFromIdx}
      />
    );
  else if (screen === 'reward')
    body = <Reward onNext={() => setScreen('nextphase')} momentum={momentum - 15} />;
  else if (screen === 'nextphase')
    body = (
      <NextPhase
        onKeepGoing={handleKeepGoing}
        onSeeCompleted={() => setScreen('completed')}
      />
    );
  else if (screen === 'completed')
    body = <CompletedSteps onBack={() => { setOpenFolderId(null); setScreen('input'); }} />;
  else if (screen === 'dashboard')
    body = <Dashboard momentum={momentum} launchesToday={launchesToday} onNewMission={() => { setMission(''); setMomentumGained(0); setOpenFolderId(null); setScreen('input'); }} />;

  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative',
      background: T.bg,
      color: T.text, fontFamily: T.display,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 600px 400px at 50% 0%, rgba(0,229,255,0.10), transparent 70%),
          radial-gradient(ellipse 500px 600px at 100% 100%, rgba(168,118,255,0.08), transparent 70%),
          radial-gradient(ellipse 400px 300px at 0% 80%, rgba(61,127,255,0.07), transparent 70%)
        `,
      }} />
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.5,
        backgroundImage: `linear-gradient(rgba(140,200,255,0.04) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(140,200,255,0.04) 1px, transparent 1px)`,
        backgroundSize: '32px 32px',
        maskImage: 'radial-gradient(ellipse at 50% 30%, black 30%, transparent 80%)',
        WebkitMaskImage: 'radial-gradient(ellipse at 50% 30%, black 30%, transparent 80%)',
      }} />

      {/* Top safe-area / status bar pad */}
      <div style={{ height: 'max(12px, env(safe-area-inset-top))', flexShrink: 0 }} />

      {/* Screen body */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {body}
      </div>

      <BottomNav screen={screen} onNav={handleNav} />

      {choosingTask && (
        <ChooseTaskOverlay
          folders={folders}
          onSelect={(task) => { setPreselectedTask(task); setChoosingTask(false); }}
          onClose={() => setChoosingTask(false)}
        />
      )}
    </div>
  );
}
