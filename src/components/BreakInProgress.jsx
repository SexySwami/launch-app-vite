import { useEffect, useState } from 'react';
import { T } from '../tokens.js';
import { Eyebrow } from './Eyebrow.jsx';
import { Telemetry } from './Telemetry.jsx';
import { CountdownRing } from './CountdownRing.jsx';
import { AmbientField } from './AmbientField.jsx';

export function BreakInProgress({ endsAt, totalSec, onComplete, onEndEarly }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const remaining = Math.max(0, Math.floor((endsAt - now) / 1000));
  const fraction = totalSec > 0 ? remaining / totalSec : 0;

  useEffect(() => {
    if (remaining <= 0) onComplete();
  }, [remaining, onComplete]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');

  return (
    <div style={{
      flex: 1, position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', minHeight: 0,
    }}>
      <AmbientField seed={1} />
      <div style={{ paddingTop: 8, position: 'relative', zIndex: 1 }}>
        <Telemetry time="BRK · LIVE" code="BRK-01 / BREAK" state="LIVE" color={T.cyan} />
      </div>
      <div style={{
        padding: '26px 24px 0', display: 'flex', justifyContent: 'center',
        position: 'relative', zIndex: 1,
      }}>
        <Eyebrow>On Break</Eyebrow>
      </div>
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '0 24px', gap: 30,
        position: 'relative', zIndex: 1,
      }}>
        <CountdownRing time={`${mm}:${ss}`} fraction={fraction} accent={T.cyan} />
        <p style={{
          fontFamily: T.display, fontSize: 15, color: T.text2, textAlign: 'center',
          margin: 0, maxWidth: 250, lineHeight: 1.5,
        }}>
          Rest up. Launch will fire when time's up.
        </p>
      </div>
      <div style={{ padding: '0 24px 22px', position: 'relative', zIndex: 1 }}>
        <button onClick={onEndEarly} style={{
          all: 'unset', boxSizing: 'border-box', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          width: '100%', height: 52, borderRadius: 16,
          background: T.surface,
          border: `1px solid ${T.hairline}`,
          color: T.text2,
          fontFamily: T.display, fontSize: 13, fontWeight: 600,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
          WebkitTapHighlightColor: 'transparent',
        }}>
          End Early
        </button>
      </div>
    </div>
  );
}
