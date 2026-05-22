// Offline / dev fallback for the Small Chunker. Returns exactly 15 generic
// micro-steps so the screen still works without the /api/generate-micro-steps
// endpoint (e.g. when opened via file:// or before the API key is set).
export function generateMicroSteps(mission) {
  const m = (mission || 'your task').toString().trim() || 'your task';
  return [
    { title: 'Take one deep breath', description: 'Settle in before starting.' },
    { title: 'Say the task out loud', description: `Just say "${m.slice(0, 24)}".` },
    { title: 'Find a comfortable spot', description: 'Sit or stand somewhere good.' },
    { title: 'Clear one small space', description: 'Move one item out of the way.' },
    { title: 'Open the needed tool', description: 'Launch the app, doc, or notebook.' },
    { title: 'Write one rough note', description: 'Anything — first thought counts.' },
    { title: 'Pick the very first piece', description: 'Smallest part you can touch.' },
    { title: 'Do that first piece', description: 'Just that one thing, nothing else.' },
    { title: 'Pause and notice progress', description: 'Acknowledge the tiny win.' },
    { title: 'Choose the next tiny piece', description: 'One more small thing only.' },
    { title: 'Do the next piece', description: 'Quick and focused, no perfection.' },
    { title: 'Check what you have so far', description: 'Glance, no judgement allowed.' },
    { title: 'Tidy one rough edge', description: 'Fix the smallest obvious issue.' },
    { title: 'Save or commit your work', description: 'Lock in what you just made.' },
    { title: 'Celebrate finishing', description: 'You moved — that is the win.' },
  ];
}
