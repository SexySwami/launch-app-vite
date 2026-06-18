// Offline / dev fallback for Deep Focus. Each call returns exactly 4 steps
// for the requested batch. The frontend uses this when /api/generate-deep-focus
// isn't reachable. previousSteps is accepted so signatures match the real API.
export function generateDeepFocusSteps(mission, batchNumber = 1, _previousSteps = []) {
  const m = (mission || 'your task').toString().trim() || 'your task';
  const short = m.length > 24 ? `${m.slice(0, 24)}…` : m;
  const batch = Math.max(1, Math.floor(batchNumber));

  const BATCHES = [
    [
      { title: 'Open everything you need', description: 'Launch the tools this task requires.', duration_seconds: 30 },
      { title: 'Read the task once through', description: `Remind yourself what "${short}" means.`, duration_seconds: 60 },
      { title: 'Write one concrete first step', description: 'Any starting action, however small.', duration_seconds: 60 },
      { title: 'Do just that first step', description: 'One action, nothing else yet.', duration_seconds: 120 },
    ],
    [
      { title: 'Pick the next logical piece', description: 'What naturally follows what you just did.', duration_seconds: 30 },
      { title: 'Clear distractions for one minute', description: 'Phone face-down, notifications off.', duration_seconds: 60 },
      { title: 'Work on the next piece', description: 'Focused effort, no perfection required.', duration_seconds: 180 },
      { title: 'Save or note your progress', description: 'Capture what you completed.', duration_seconds: 30 },
    ],
    [
      { title: 'Check what remains', description: 'Quick scan of what is left to do.', duration_seconds: 60 },
      { title: 'Choose the most important next thing', description: 'Highest-value piece still undone.', duration_seconds: 30 },
      { title: 'Do that thing now', description: 'Start immediately, decide details as you go.', duration_seconds: 300 },
      { title: 'Pause and acknowledge the win', description: 'You moved forward — that counts.', duration_seconds: 20 },
    ],
    [
      { title: 'Review what you have built', description: 'Read or skim everything done so far.', duration_seconds: 120 },
      { title: 'Fix one obvious rough spot', description: 'Smallest improvement you can make.', duration_seconds: 120 },
      { title: 'Add one meaningful finishing touch', description: 'One detail that raises the quality.', duration_seconds: 180 },
      { title: 'Save and close the loop', description: 'Commit, send, or file it away.', duration_seconds: 30 },
    ],
  ];

  if (batch <= BATCHES.length) return BATCHES[batch - 1];

  const tail = BATCHES[BATCHES.length - 1];
  return tail.map((s, i) => ({
    title: s.title,
    description: `Round ${batch}, beat ${i + 1}.`,
    duration_seconds: s.duration_seconds,
  }));
}
