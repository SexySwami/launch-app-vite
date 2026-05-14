// Local fallback step library — keyword-matches the mission text to a
// pre-baked set of 4 micro-steps. Used when /api/generate-steps fails or
// the app is running in a sandboxed preview where relative fetch URLs
// don't resolve. Step `reward` integers sum to exactly 15 (4-4-4-3).
export function generateSteps(mission) {
  if (!mission) return [];
  const lower = mission.toLowerCase();
  if (lower.includes('proposal') || lower.includes('deck')) {
    return [
      { tag: 'OPEN', title: 'Open proposal document', hint: "Just open the file. That's it.", reward: 4,
        altPool: ['Locate latest WSI file', 'Start proposal draft', 'Open template folder', "Resume yesterday's draft", 'Pull up the client brief', 'Open meeting notes'] },
      { tag: 'SCAN', title: 'Review previous edits', hint: "Skim — don't fix anything yet.", reward: 4,
        altPool: ['Skim last paragraph only', 'Read the conclusion first', 'Check the open comments', 'Diff against yesterday', 'Note any TODOs', 'Re-read your last note'] },
      { tag: 'EXEC', title: 'Rewrite title slide', hint: 'One sentence is enough.', reward: 4,
        altPool: ['Add one bullet point', 'Fix the opening line', 'Change one heading', 'Insert one image placeholder', 'Outline section 2', 'Tighten the intro'] },
      { tag: 'PUSH', title: 'Save progress', hint: 'Cmd+S. Lock it in.', reward: 3,
        altPool: ['Export to PDF', 'Share with team', 'Save and close', 'Push to drive', 'Snapshot a backup', 'Add changelog note'] },
    ];
  }
  if (lower.includes('email') || lower.includes('reply') || lower.includes('follow')) {
    return [
      { tag: 'OPEN', title: 'Open inbox, full screen', hint: 'Phone face down.', reward: 4,
        altPool: ['Mute notifications', 'Search the thread', 'Star the message', 'Open the relevant doc', 'Pull up the contract'] },
      { tag: 'SCAN', title: 'Re-read the last message', hint: 'No drafting yet.', reward: 4,
        altPool: ['Note key questions', 'Find the deadline', 'Identify the ask', 'Pull quotes you need'] },
      { tag: 'EXEC', title: 'Type three short bullets', hint: 'No editing while writing.', reward: 4,
        altPool: ['Answer in one sentence', 'Confirm + ask back', 'Reply with attachment', 'Schedule a call instead'] },
      { tag: 'PUSH', title: "Send. Don't reread.", hint: 'Trust the draft.', reward: 3,
        altPool: ['Send and snooze', 'Send and archive', 'Send + cc the team', 'Send + add to follow-ups'] },
    ];
  }
  if (lower.includes('workout') || lower.includes('gym') || lower.includes('run')) {
    return [
      { tag: 'GEAR', title: 'Put on workout clothes', hint: 'Shoes too.', reward: 4,
        altPool: ['Change shirt only', 'Lace up shoes first', 'Grab water bottle', 'Pick a playlist'] },
      { tag: 'HYDR', title: 'Drink a glass of water', hint: 'Full glass.', reward: 4,
        altPool: ['Eat a small snack', 'Take pre-workout', 'Stretch hamstrings', 'Foam roll legs'] },
      { tag: 'WARM', title: '60 seconds of stretching', hint: 'Light. Just to start moving.', reward: 4,
        altPool: ['Walk in place 1 min', '20 jumping jacks', 'Light cardio 90s', 'Mobility flow'] },
      { tag: 'EXEC', title: 'Begin first set', hint: "You're already there.", reward: 3,
        altPool: ['Start with cardio', 'Light warm-up set', 'Pick first exercise', 'Open workout log'] },
    ];
  }
  return [
    { tag: 'OPEN', title: `Open everything for "${mission.slice(0, 28)}${mission.length > 28 ? '…' : ''}"`, hint: 'No setup yet — just open it.', reward: 4,
      altPool: ['Pull up the relevant tab', 'Find your last note', 'Open the calendar', "Resume yesterday's draft"] },
    { tag: 'SCAN', title: 'Re-read the last thing you did', hint: 'Get oriented in 30 seconds.', reward: 4,
      altPool: ["List what's done", 'Note one blocker', 'Skim the brief', "Check today's plan"] },
    { tag: 'EXEC', title: 'Write the first line', hint: 'Imperfect is fine.', reward: 4,
      altPool: ['Sketch the structure', 'Make the smallest move', 'Write a bad first draft', 'Try one approach'] },
    { tag: 'PUSH', title: 'Continue for 60 more seconds', hint: 'Momentum > perfection.', reward: 3,
      altPool: ['Keep pushing — 60s more', 'Finish current sentence', 'Wrap and save', 'Note next step'] },
  ];
}
