import { useMemo } from 'react';
import { T } from '../tokens.js';

// Decorative motion field for the Break Flow screens — twinkling
// particles in cyan/teal/purple and a small set of slow-rising motes.
// Sits absolutely behind screen content (zIndex: 0), so the screen's
// root must be `position: relative` and content `position: relative`
// (or higher z-index) to draw above.
//
// `seed` desyncs each screen so the field doesn't pulse in lockstep
// across the flow.
export function AmbientField({ seed = 0 }) {
  const stars = useMemo(() => Array.from({ length: 26 }).map((_, i) => ({
    x: rand(seed, i) * 100,
    y: rand(seed, i + 100) * 100,
    s: 1 + rand(seed, i + 200) * 1.6,
    dur: 2.6 + rand(seed, i + 300) * 3.4,
    delay: rand(seed, i + 400) * 4,
    c: pickColor(rand(seed, i + 500), rand(seed, i + 600)),
  })), [seed]);

  const motes = useMemo(() => Array.from({ length: 7 }).map((_, i) => ({
    x: 8 + rand(seed, i + 700) * 84,
    s: 1.5 + rand(seed, i + 800) * 2,
    dur: 9 + rand(seed, i + 900) * 7,
    delay: rand(seed, i + 1000) * 9,
    drift: (rand(seed, i + 1100) * 40 - 20),
    c: rand(seed, i + 1200) > 0.6 ? T.purple : T.cyan,
  })), [seed]);

  return (
    <div style={{
      position: 'absolute', inset: 0,
      pointerEvents: 'none', overflow: 'hidden', zIndex: 0,
    }}>
      {stars.map((p, i) => (
        <span key={`s${i}`} style={{
          position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
          width: p.s, height: p.s, borderRadius: 99, background: p.c,
          boxShadow: `0 0 ${p.s * 3}px ${p.c}`,
          animation: `twinkle ${p.dur}s ease-in-out ${p.delay}s infinite`,
        }} />
      ))}
      {motes.map((m, i) => (
        <span key={`m${i}`} style={{
          position: 'absolute', left: `${m.x}%`, bottom: -10,
          width: m.s, height: m.s, borderRadius: 99, background: m.c,
          boxShadow: `0 0 ${m.s * 4}px ${m.c}`,
          '--drift': `${m.drift}px`,
          animation: `floatUp ${m.dur}s linear ${m.delay}s infinite`,
        }} />
      ))}
    </div>
  );
}

function rand(seed, n) {
  const x = Math.sin((seed + 1) * 9301 + n * 49297) * 233280;
  return x - Math.floor(x);
}

function pickColor(a, b) {
  if (a > 0.78) return T.purple;
  if (b > 0.55) return T.teal;
  return T.cyan;
}
