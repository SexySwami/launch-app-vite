import { T } from '../tokens.js';
import { Eyebrow } from './Eyebrow.jsx';
import { Telemetry } from './Telemetry.jsx';
import { CountdownRing } from './CountdownRing.jsx';
import { AmbientField } from './AmbientField.jsx';

const GOLD = '#FFD27A';

export function BreakComplete({ onYes, onFiveMore }) {
  const rgba = (a) => hexToRgba(GOLD, a);
  return (
    <div style={{
      flex: 1, position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', minHeight: 0,
    }}>
      <AmbientField seed={2} />
      <div style={{ paddingTop: 8, position: 'relative', zIndex: 1 }}>
        <Telemetry time="BRK · TIME'S UP" code="BRK-01 / BREAK" state="COMPLETE" color={GOLD} />
      </div>
      <div style={{
        padding: '26px 24px 0', display: 'flex', justifyContent: 'center',
        position: 'relative', zIndex: 1,
      }}>
        <Eyebrow color={GOLD}>Break Complete</Eyebrow>
      </div>
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '0 28px', gap: 36,
        position: 'relative', zIndex: 1,
      }}>
        <CountdownRing time="" fraction={1} accent={GOLD} done />
        <h1 style={{
          fontFamily: T.display, fontWeight: 700, fontSize: 30, lineHeight: 1.18,
          letterSpacing: '-0.02em', color: T.text, textAlign: 'center', margin: 0,
          textShadow: `0 0 30px ${rgba(0.25)}`,
        }}>
          Ready to do<br />one small thing?
        </h1>
      </div>
      <div style={{
        padding: '0 24px 22px', display: 'flex', flexDirection: 'column', gap: 12,
        position: 'relative', zIndex: 1,
      }}>
        <button onClick={onYes} style={{
          all: 'unset', boxSizing: 'border-box', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          width: '100%', height: 58, borderRadius: 18,
          background: `linear-gradient(180deg, ${rgba(0.92)}, ${rgba(0.55)})`,
          border: `1px solid ${rgba(0.9)}`,
          color: '#1C1404',
          fontFamily: T.display, fontSize: 15, fontWeight: 700,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          boxShadow: `0 0 0 1px ${rgba(0.25)} inset, inset 0 1px 0 rgba(255,255,255,0.32), 0 10px 30px rgba(0,0,0,0.5), 0 0 44px ${rgba(0.5)}`,
          WebkitTapHighlightColor: 'transparent',
        }}>
          Yes&nbsp;&nbsp;→
        </button>
        <button onClick={onFiveMore} style={{
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
          5 More Min
        </button>
      </div>
    </div>
  );
}

function hexToRgba(hex, a) {
  const m = hex.replace('#', '');
  return `rgba(${parseInt(m.slice(0, 2), 16)},${parseInt(m.slice(2, 4), 16)},${parseInt(m.slice(4, 6), 16)},${a})`;
}
