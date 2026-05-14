import { useState, useEffect, useRef } from 'react';

// MarqueeText — renders text statically when it fits, and seamlessly
// scrolls it right-to-left in a loop when it overflows the container.
// Used by the checkpoint badge on each execution card.
export function MarqueeText({ text, textStyle, gap = 36, pxPerSecond = 50 }) {
  const containerRef = useRef(null);
  const measureRef = useRef(null);
  const [shouldScroll, setShouldScroll] = useState(false);
  const [duration, setDuration] = useState(12);

  useEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    const check = () => {
      const containerW = container.clientWidth;
      const textW = measure.scrollWidth;
      const overflows = textW > containerW + 1;
      setShouldScroll(overflows);
      if (overflows) {
        // Speed scales with text length so longer strings don't whip by.
        setDuration(Math.max(8, (textW + gap) / pxPerSecond));
      }
    };

    const frame = requestAnimationFrame(check);
    let ro;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(check);
      ro.observe(container);
      ro.observe(measure);
    }
    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      document.fonts.ready.then(check).catch(() => {});
    }
    return () => {
      cancelAnimationFrame(frame);
      if (ro) ro.disconnect();
    };
  }, [text, gap, pxPerSecond]);

  const fadeMask = shouldScroll
    ? 'linear-gradient(to right, transparent 0, black 14px, black calc(100% - 14px), transparent 100%)'
    : 'none';

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1, minWidth: 0,
        overflow: 'hidden',
        position: 'relative',
        maskImage: fadeMask,
        WebkitMaskImage: fadeMask,
      }}
    >
      {/* hidden width probe — always reflects single-copy width */}
      <span
        ref={measureRef}
        aria-hidden="true"
        style={{
          ...textStyle,
          visibility: 'hidden',
          position: 'absolute',
          top: 0, left: 0,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}
      >
        {text}
      </span>

      {shouldScroll ? (
        <div
          style={{
            display: 'inline-flex',
            whiteSpace: 'nowrap',
            animation: `marqueeScroll ${duration}s linear infinite`,
            willChange: 'transform',
          }}
        >
          <span style={{ ...textStyle, paddingRight: gap }}>{text}</span>
          <span style={{ ...textStyle, paddingRight: gap }} aria-hidden="true">{text}</span>
        </div>
      ) : (
        <span style={{ ...textStyle, whiteSpace: 'nowrap' }}>{text}</span>
      )}
    </div>
  );
}
