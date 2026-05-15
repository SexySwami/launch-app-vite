import { useState, useMemo } from 'react';
import { T } from './tokens.js';
import { MissionInput } from './components/MissionInput.jsx';
import { Countdown } from './components/Countdown.jsx';
import { ExecutionStep } from './components/ExecutionStep.jsx';
import { Reward } from './components/Reward.jsx';
import { NextPhase } from './components/NextPhase.jsx';
import { Dashboard } from './components/Dashboard.jsx';
import { BottomNav } from './components/BottomNav.jsx';
import { CompletedSteps } from './components/CompletedSteps.jsx';
import { generateSteps } from './lib/generateSteps.js';

export default function App() {
  const [screen, setScreen] = useState('input');
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
  // - completionGroupId: unique id for the current mission's completed-entry
  //   in the backend. Generated when launchMission fires; reused for each
  //   "Log Completion" tap and the final auto-save.
  // - sourceItemId / sourceItemIndex: track which queue item this mission
  //   came from, so we can remove it from the queue on completion and
  //   restore it later via the X on the Completed Steps screen.
  // - loggedSteps: set of step indices the user has explicitly logged in
  //   this mission, so the Log button can flip to "Logged" and not double-fire.
  const [completionGroupId, setCompletionGroupId] = useState(null);
  const [sourceItemId, setSourceItemId] = useState(null);
  const [sourceItemIndex, setSourceItemIndex] = useState(null);
  const [loggedSteps, setLoggedSteps] = useState(() => new Set());

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
      // Final step → finalize the completion entry and remove the original
      // queue item (if this mission came from one).
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

    // Optimistically mark this step as logged so the button can flip state.
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
          text: mission,
          microStep: {
            tag: step.tag || '',
            title: stepOverrides[stepIdx]?.title || step.title || '',
            hint: step.hint || '',
          },
        }),
      });
    } catch (err) {
      // Rollback the local "logged" state so the user can retry.
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
            text: mission,
          }),
        });
        // Remove the original queue item server-side; MissionInput will
        // refetch on remount / visibility change.
        if (sourceItemId) {
          await fetch(`/api/queue?id=${encodeURIComponent(sourceItemId)}`, { method: 'DELETE' });
        }
      } catch {}
    }
  };

  const handleBackStep = () => {
    if (stepIdx > 0) {
      // Going back undoes the previous step's reward — it's no longer "done".
      const prevReward = steps[stepIdx - 1]?.reward || 4;
      setMomentumGained(g => Math.max(0, g - prevReward));
      setStepIdx(i => i - 1);
    } else {
      // From the first step, exit back to mission input. Mission text stays
      // populated so the user can relaunch or edit easily.
      setStepIdx(0);
      setMomentumGained(0);
      setStepOverrides({});
      setScreen('input');
    }
  };

  const startExecution = () => {
    setStepIdx(0);
    setMomentumGained(0);
    setScreen('step');
  };

  // Kick off Claude API call for step generation. Falls back to local
  // keyword logic if the API is unreachable or errors.
  // `source` (optional): { id, index } of the originating queue item, so we
  // can remove it from the queue on completion and restore later if needed.
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
    // Fresh completion session for this launch.
    setCompletionGroupId(typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `c_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    setSourceItemId(source?.id || null);
    setSourceItemIndex(typeof source?.index === 'number' ? source.index : null);
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
      // Fall back to the local keyword-matched generator.
      setSteps(generateSteps(m));
      if (err.message !== '__skip_api__') {
        setStepsError(err.message || 'Could not generate steps');
      }
    } finally {
      setStepsLoading(false);
    }
  };

  let body = null;
  if (screen === 'input')
    body = <MissionInput onLaunch={launchMission} mission={mission} setMission={setMission} />;
  else if (screen === 'countdown')
    body = <Countdown onComplete={startExecution} />;
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
        onKeepGoing={() => { setMission(''); setMomentumGained(0); setStepOverrides({}); setSteps([]); setScreen('input'); }}
        onAllDone={() => setScreen('dashboard')}
        onNextTask={() => { setMission(''); setMomentumGained(0); setStepOverrides({}); setSteps([]); setScreen('input'); }}
        onSeeCompleted={() => setScreen('completed')}
      />
    );
  else if (screen === 'completed')
    body = <CompletedSteps onBack={() => setScreen('nextphase')} />;
  else if (screen === 'dashboard')
    body = <Dashboard momentum={momentum} launchesToday={launchesToday} onNewMission={() => { setMission(''); setMomentumGained(0); setScreen('input'); }} />;

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

      {/* Bottom nav (visible on dashboard) */}
      {screen === 'dashboard' && <BottomNav screen={screen} onNav={setScreen} />}

      {/* Bottom safe-area pad */}
      <div style={{ height: 'max(12px, env(safe-area-inset-bottom))', flexShrink: 0 }} />
    </div>
  );
}
