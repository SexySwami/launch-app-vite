// Offline / dev fallback for Deep Focus. Each call returns exactly 4 steps
// for the requested batch. The frontend uses this when /api/generate-deep-focus
// isn't reachable. previousSteps is accepted so signatures match the real API.
export function generateDeepFocusSteps(mission, batchNumber = 1, _previousSteps = []) {
  const m = (mission || 'your task').toString().trim() || 'your task';
  const short = m.length > 24 ? `${m.slice(0, 24)}…` : m;
  const batch = Math.max(1, Math.floor(batchNumber));

  const BATCHES = [
    [
      { title: 'Open everything you need', description: 'Launch the tools this task requires.' },
      { title: 'Read the task once through', description: `Remind yourself what "${short}" means.` },
      { title: 'Write one concrete first step', description: 'Any starting action, however small.' },
      { title: 'Do just that first step', description: 'One action, nothing else yet.' },
    ],
    [
      { title: 'Pick the next logical piece', description: 'What naturally follows what you just did.' },
      { title: 'Clear distractions for one minute', description: 'Phone face-down, notifications off.' },
      { title: 'Work on the next piece', description: 'Focused effort, no perfection required.' },
      { title: 'Save or note your progress', description: 'Capture what you completed.' },
    ],
    [
      { title: 'Check what remains', description: 'Quick scan of what is left to do.' },
      { title: 'Choose the most important next thing', description: 'Highest-value piece still undone.' },
      { title: 'Do that thing now', description: 'Start immediately, decide details as you go.' },
      { title: 'Pause and acknowledge the win', description: 'You moved forward — that counts.' },
    ],
    [
      { title: 'Review what you have built', description: 'Read or skim everything done so far.' },
      { title: 'Fix one obvious rough spot', description: 'Smallest improvement you can make.' },
      { title: 'Add one meaningful finishing touch', description: 'One detail that raises the quality.' },
      { title: 'Save and close the loop', description: 'Commit, send, or file it away.' },
    ],
  ];

  if (batch <= BATCHES.length) return BATCHES[batch - 1];

  const tail = BATCHES[BATCHES.length - 1];
  return tail.map((s, i) => ({
    title: s.title,
    description: `Round ${batch}, beat ${i + 1}.`,
  }));
}
