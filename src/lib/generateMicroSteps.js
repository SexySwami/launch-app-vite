// Offline / dev fallback for the Small Chunker. Each call returns exactly 4
// generic gateway-style steps for the requested batch. The frontend uses
// this when /api/generate-micro-steps isn't reachable (e.g. when running
// `npm run dev` against the Vite-only server, or when the API key is
// missing). previousSteps is accepted so signatures match the real API.
export function generateMicroSteps(mission, batchNumber = 1, _previousSteps = []) {
  const m = (mission || 'your task').toString().trim() || 'your task';
  const short = m.length > 24 ? `${m.slice(0, 24)}…` : m;
  const batch = Math.max(1, Math.floor(batchNumber));

  const BATCHES = [
    [
      { title: 'Take one deep breath', description: 'Settle in before starting.' },
      { title: 'Sit down somewhere comfortable', description: 'Pick any spot that works.' },
      { title: 'Open the needed tool', description: 'Launch the app or doc.' },
      { title: 'Say the task out loud', description: `Just say "${short}".` },
    ],
    [
      { title: 'Write one rough note', description: 'Any first thought counts.' },
      { title: 'Pick the very first piece', description: 'Smallest part you can touch.' },
      { title: 'Do that first piece', description: 'Just that one thing.' },
      { title: 'Pause and notice progress', description: 'Acknowledge the tiny win.' },
    ],
    [
      { title: 'Choose the next tiny piece', description: 'One more small thing only.' },
      { title: 'Do the next piece', description: 'Quick and focused, no perfection.' },
      { title: 'Check what you have so far', description: 'Glance, no judgement allowed.' },
      { title: 'Tidy one rough edge', description: 'Fix the smallest obvious issue.' },
    ],
    [
      { title: 'Save or commit your work', description: 'Lock in what you just made.' },
      { title: 'Add one finishing touch', description: 'Any small improvement counts.' },
      { title: 'Skim the whole thing once', description: 'Quick read-through, nothing more.' },
      { title: 'Mark this batch complete', description: 'You moved — that is the win.' },
    ],
  ];

  // For batches beyond the canned set, recycle the last batch's structure
  // with a batch-number suffix so the user always gets fresh-looking copy.
  if (batch <= BATCHES.length) return BATCHES[batch - 1];

  const tail = BATCHES[BATCHES.length - 1];
  return tail.map((s, i) => ({
    title: s.title,
    description: `Round ${batch}, beat ${i + 1}.`,
  }));
}
