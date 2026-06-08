// Web-Audio chime that plays when a break timer hits zero.
//
// Pre-create the AudioContext on a user gesture (Start Break / Quick 5)
// via primeBreakAudio(), then call playBreakAlarm(ctx) when the timer
// fires. Without the gesture priming, browser autoplay rules will
// silently drop the scheduled buffers when the tab is in the background.

export function primeBreakAudio(ref) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!ref.current) ref.current = new Ctx();
    if (ref.current.state === 'suspended') ref.current.resume();
  } catch {}
}

export function playBreakAlarm(ctx) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const audio = ctx || new Ctx();
    if (audio.state === 'suspended') audio.resume();

    const start = audio.currentTime + 0.05;
    const beep = (t, freq, dur, peak) => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.connect(gain); gain.connect(audio.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(peak, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    };

    // Two rising 3-note chimes, ~3s total.
    const pattern = [
      [0.00,  880, 0.32, 0.22],
      [0.30, 1108, 0.32, 0.22],
      [0.60, 1318, 0.55, 0.26],
      [1.60,  880, 0.32, 0.22],
      [1.90, 1108, 0.32, 0.22],
      [2.20, 1318, 0.55, 0.26],
    ];
    pattern.forEach(([dt, f, d, p]) => beep(start + dt, f, d, p));
  } catch {}
}
