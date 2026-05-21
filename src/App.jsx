import { useState, useMemo, useRef, useEffect } from 'react';
import { T } from './tokens.js';
import { MissionInput } from './components/MissionInput.jsx';
import { Countdown } from './components/Countdown.jsx';
import { ExecutionStep } from './components/ExecutionStep.jsx';
import { Reward } from './components/Reward.jsx';
import { NextPhase } from './components/NextPhase.jsx';
import { Dashboard } from './components/Dashboard.jsx';
import { BottomNav } from './components/BottomNav.jsx';
import { CompletedSteps } from './components/CompletedSteps.jsx';
import { HomeScreen } from './components/HomeScreen.jsx';
import { StandUp } from './components/StandUp.jsx';
import { ProfileScreen } from './components/ProfileScreen.jsx';
import { RootFolderScreen } from './components/RootFolderScreen.jsx';
import { generateSteps } from './lib/generateSteps.js';

// Root folders the Checklists tab can drill into. Order is preserved in the UI.
const FOLDERS = [
  { id: 'work',     name: 'Work',     accent: T.cyan,   iconKey: 'work',     code: 'RT-01', tagline: 'Mission Ops' },
  { id: 'personal', name: 'Personal', accent: T.purple, iconKey: 'personal', code: 'RT-02', tagline: 'Off-Duty'    },
  { id: 'health',   name: 'Health',   accent: T.teal,   iconKey: 'health',   code: 'RT-03', tagline: 'Vital Signs' },
  { id: 'dailies',  name: 'Dailies',  accent: T.amber,  iconKey: 'dailies',  code: 'RT-04', tagline: 'Daily Reset' },
];
const DEFAULT_FOLDER_ID = 'work';

export default function App() {
  const [screen, setScreen] = useState('home');
  const [mission, setMission] = useState('');
  const [stepIdx, setStepIdx] = useState(0);
  const [momentumGained, setMomentumGained] = useState(0);
  const [momentum, setMomentum] = useState(232);
  const [launchesToday, setLaunchesToday] = useState(2);
  const [stepOverrides, setStepOverrides] = useState({});
  const [steps, setSteps] = useState([]);
  const [stepsLoading, setStepsLoading] = useState(false);
  const [stepsError, setStepsError] = useState(null);

  // Completion-logging state.
  const [completionGroupId, setCompletionGroupId] = useState(null);
  const [sourceItemId, setSourceItemId] = useState(null);
  const [sourceItemIndex, setSourceItemIndex] = useState(null);
  const [sourceFolderId, setSourceFolderId] = useState(DEFAULT_FOLDER_ID);
  const [sourceDescription, setSourceDescription] = useState(null);
  const [loggedSteps, setLoggedSteps] = useState(() => new Set());

  // On Break toggle — persisted across sessions.
  const [onBreak, setOnBreak] = useState(() => {
    try { return localStorage.getItem('onBreak') === 'true'; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem('onBreak', onBreak); } catch {}
  }, [onBreak]);

  // Home-screen Generate/History navigation.
  const [currentItemIdx, setCurrentItemIdx] = useState(-1);

  // Dailies midnight reset. Incremented each time a reset fires so the
  // Dailies MissionInput and RootFolderScreen know to refetch queue data.
  const [dailiesResetKey, setDailiesResetKey] = useState(0);
  const midnightTimerRef = useRef(null);

  useEffect(() => {
    const canCall = typeof window !== 'undefined'
      && /^https?:$/.test(window.location?.protocol || '');
    if (!canCall) return;

    const doReset = async () => {
      try {
        const localDate = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
        const res = await fetch(`/api/dailies-reset?localDate=${encodeURIComponent(localDate)}`);
        const data = await res.json().catch(() => ({}));
        if (data?.reset) setDailiesResetKey(k => k + 1);
      } catch {}
    };

    const scheduleMidnight = () => {
      const now = new Date();
      const next = new Date(now);
      next.setHours(24, 0, 0, 0); // next local midnight
      midnightTimerRef.current = setTimeout(() => {
        doReset();
        scheduleMidnight(); // reschedule for the following night
      }, next - now);
    };

    doReset(); // check on mount in case reset was missed while app was closed
    scheduleMidnight();

    return () => { if (midnightTimerRef.current) clearTimeout(midnightTimerRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Root-folder routing inside the Checklists tab.
  // - openFolderId: null → root folder selection; otherwise the folder being shown.
  // - mountedFolderIds: lazy-mount set so once a folder is opened, its
  //   MissionInput stays mounted (hidden) — Back never loses its state.
  // - lastLaunchedFolderId: which checklist the user launched from, so the
  //   post-completion "Keep Going" button can return there.
  const [openFolderId, setOpenFolderId] = useState(null);
  const [mountedFolderIds, setMountedFolderIds] = useState(() => new Set());
  const lastLaunchedFolderIdRef = useRef(DEFAULT_FOLDER_ID);

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

  const handleEditStep = (newTitle) => {
    setStepOverrides(prev => ({ ...prev, [stepIdx]: { title: newTitle } }));
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

    setLoggedSteps(prev => {
      const next = new Set(prev);
      next.add(stepIdx);
      return next;
    });

    if (!canCallAPI) return true;
    try {
      await fetch('/api/completed?action=log-step', {
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
    if (canCallAPI) {
      try {
        await fetch('/api/completed?action=finalize', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            id: completionGroupId,
            sourceItemId: sourceItemId || null,
            sourceItemIndex: typeof sourceItemIndex === 'number' ? sourceItemIndex : null,
            folderId: sourceFolderId,
            text: mission,
            ...(sourceDescription ? { description: sourceDescription } : {}),
          }),
        });
        // Remove the original queue item from the *source* folder, not the
        // legacy default. MissionInput refetches on visibility change so its
        // local items will catch up.
        if (sourceItemId) {
          const folderParam = encodeURIComponent(sourceFolderId || DEFAULT_FOLDER_ID);
          await fetch(`/api/queue?folder=${folderParam}&id=${encodeURIComponent(sourceItemId)}`, { method: 'DELETE' });
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
      if (lastLaunchedFolderIdRef.current) {
        openFolder(lastLaunchedFolderIdRef.current);
      } else {
        setOpenFolderId(null);
      }
      setScreen('input');
    }
  };

  const startExecution = () => {
    setStepIdx(0);
    setMomentumGained(0);
    setScreen(onBreak ? 'standup' : 'step');
  };

  // `source` may include { id, index, folderId }. If no folderId is supplied
  // (e.g. Home-screen launches) we fall back to the default folder so the
  // queue DELETE on completion still hits a sensible Redis key.
  const launchMission = async (missionText, source, description) => {
    const m = (missionText || '').trim();
    if (!m) return;
    setMission(m);
    setStepIdx(0);
    setMomentumGained(0);
    setStepOverrides({});
    setSteps([]);
    setStepsError(null);
    setStepsLoading(true);
    setCompletionGroupId(typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `c_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    setSourceItemId(source?.id || null);
    setSourceItemIndex(typeof source?.index === 'number' ? source.index : null);
    const launchFolderId = source?.folderId || DEFAULT_FOLDER_ID;
    setSourceFolderId(launchFolderId);
    setSourceDescription(description ? description.toString().trim() : null);
    lastLaunchedFolderIdRef.current = launchFolderId;
    setLoggedSteps(new Set());
    setScreen('countdown');

    try {
      if (!canCallAPI) throw new Error('__skip_api__');
      const res = await fetch('/api/generate-steps', {
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
  // (per spec). Other tabs are unchanged.
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
    setSourceDescription(null);
  };
  const handleKeepGoing = () => {
    resetMissionState();
    const target = lastLaunchedFolderIdRef.current;
    if (target) openFolder(target);
    else setOpenFolderId(null);
    setScreen('input');
  };
  const handleAllDone = () => {
    resetMissionState();
    setOpenFolderId(null);
    setScreen('input');
  };
  const handleNextTask = () => {
    resetMissionState();
    setOpenFolderId(null);
    setScreen('input');
  };

  // Render the Checklists tab as a layered stack: the root folder selection
  // takes layout, and each lazily-mounted folder MissionInput overlays it
  // (absolutely positioned). Switching folders hides via visibility:hidden
  // so component state — fetched items, drag/edit state, etc. — survives.
  const renderInputBranch = () => {
    const foldersById = Object.fromEntries(FOLDERS.map(f => [f.id, f]));
    return (
      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {!openFolderId && (
          <RootFolderScreen folders={FOLDERS} onOpen={openFolder} resetKey={dailiesResetKey} />
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
                onLaunch={launchMission}
                mission={mission}
                setMission={setMission}
                onBack={() => setOpenFolderId(null)}
                refetchKey={fid === 'dailies' ? dailiesResetKey : 0}
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
        folders={FOLDERS}
        onBreak={onBreak}
        setOnBreak={setOnBreak}
      />
    );
  else if (screen === 'profile')
    body = <ProfileScreen />;
  else if (screen === 'input')
    body = renderInputBranch();
  else if (screen === 'countdown')
    body = <Countdown onComplete={startExecution} />;
  else if (screen === 'standup')
    body = <StandUp onDone={() => setScreen('step')} />;
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
        loading={stepsLoading || !resolvedStep}
      />
    );
  else if (screen === 'reward')
    body = <Reward onNext={() => setScreen('nextphase')} onLog={() => setScreen('dashboard')} momentum={momentum - 15} />;
  else if (screen === 'nextphase')
    body = (
      <NextPhase
        onKeepGoing={handleKeepGoing}
        onAllDone={handleAllDone}
        onNextTask={handleNextTask}
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
    </div>
  );
}
