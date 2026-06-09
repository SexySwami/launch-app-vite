// Web-Audio chime that plays when a break timer hits zero.
//
// Pre-create the AudioContext on a user gesture (Start Break / Quick 5)
// via primeBreakAudio(), then call playBreakAlarm(ctx) when the timer
// fires. Without the gesture priming, browser autoplay rules will
// silently drop the scheduled buffers.
//
// iOS-specific notes:
//   1. primeBreakAudio() installs a silent looping BufferSource so iOS
//      doesn't auto-suspend the AudioContext between the user gesture and
//      the alarm firing (~30 s inactivity threshold without it).
//   2. playBreakAlarm() awaits ctx.resume() before scheduling any nodes —
//      iOS requires the resume Promise to settle before currentTime/start()
//      are meaningful; fire-and-forget resume silently drops all notes.
//
// One chime pattern is ~2.85 s long. startBreakAlarmLoop() repeats the
// pattern every PATTERN_MS until its returned stop() is invoked.

const PATTERN_MS = 3000;

export function primeBreakAudio(ref) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!ref.current) ref.current = new Ctx();
    const ctx = ref.current;
    if (ctx.state === 'suspended') ctx.resume();

    // Keep-alive: a silent (gain ≈ 0) looping BufferSource prevents iOS
    // from suspending the AudioContext during a long break. Without an
    // active audio node iOS suspends after ~30 s of inactivity and
    // resume() called outside a user gesture is blocked.
    if (ctx._keepAlive) return;
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); // 1 s silence
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.00001, ctx.currentTime); // inaudible but non-zero
    src.connect(g);
    g.connect(ctx.destination);
    src.start();
    ctx._keepAlive = src; // prevent GC + guard against double-init
  } catch {}
}

export async function playBreakAlarm(ctx) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const audio = ctx || new Ctx();

    // Must await — iOS blocks scheduling on a suspended context and the
    // resume Promise must settle before currentTime is reliable.
    if (audio.state === 'suspended') await audio.resume();
    if (audio.state !== 'running') return;

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

    // Two rising 3-note chimes, ~3 s total.
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

export function startBreakAlarmLoop(ctxRef) {
  primeBreakAudio(ctxRef);
  playBreakAlarm(ctxRef.current);
  const id = setInterval(() => playBreakAlarm(ctxRef.current), PATTERN_MS);
  return () => clearInterval(id);
}
