import { T } from '../tokens.js';
import { Eyebrow } from './Eyebrow.jsx';
import { Telemetry } from './Telemetry.jsx';
import { AmbientField } from './AmbientField.jsx';

function hexToRgba(hex, a) {
  const m = hex.replace('#', '');
  return `rgba(${parseInt(m.slice(0,2),16)},${parseInt(m.slice(2,4),16)},${parseInt(m.slice(4,6),16)},${a})`;
}

// Screen between SetBreak and the break timer where the user can
// pre-select a task to land back on after the break ends.
//
// Two states:
// - No task picked yet: primary button is "Choose Task" (opens the
//   parent-supplied overlay) with a "Skip" ghost link.
// - Task already picked: shows the task name in a tappable card
//   (re-opens the picker to change), primary button becomes
//   "Start Break", "Skip" stays as a way to drop the pick.
export function WhatsNext({ selectedTask, onChoose, onSkip, onStart }) {
  const hasTask = !!selectedTask;
  const rgba = (a) => hexToRgba(T.cyan, a);

  return (
    <div style={{
      flex: 1, position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', minHeight: 0,
    }}>
      <AmbientField seed={5} />

      <div style={{ paddingTop: 8, position: 'relative', zIndex: 1 }}>
        <Telemetry time="BRK · QUEUE" code="BRK-02 / NEXT" state="STANDBY" color={T.cyan} />
      </div>

      <div style={{
        padding: '22px 24px 0', position: 'relative', zIndex: 1,
      }}>
        <Eyebrow style={{ marginBottom: 14 }}>Pre-Launch</Eyebrow>
        <h1 style={{
          fontFamily: T.display, fontWeight: 600, fontSize: 34, lineHeight: 1.04,
          letterSpacing: '-0.02em', color: T.text, margin: '0 0 8px',
        }}>What's your next task?</h1>
        <p style={{ fontFamily: T.display, fontSize: 15, color: T.text2, margin: 0 }}>
          Pick something now so it's ready the moment your break ends.
        </p>
      </div>

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '0 24px', gap: 18, minHeight: 0,
        position: 'relative', zIndex: 1,
      }}>
        {hasTask ? (
          <button
            onClick={onChoose}
            aria-label="Change selected task"
            style={{
              all: 'unset', cursor: 'pointer', display: 'block',
              padding: '20px 22px', borderRadius: 20,
              background: `linear-gradient(155deg, ${rgba(0.16)} 0%, rgba(255,255,255,0.025) 60%, ${rgba(0.06)} 100%)`,
              border: `1px solid ${rgba(0.55)}`,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), 0 12px 30px rgba(0,0,0,0.4), 0 0 36px ${rgba(0.2)}`,
              WebkitTapHighlightColor: 'transparent',
            }}>
            <div style={{
              fontFamily: T.mono, fontSize: 10, letterSpacing: '0.24em',
              color: T.cyan, textTransform: 'uppercase', marginBottom: 8,
              textShadow: `0 0 10px ${rgba(0.6)}`,
            }}>
              Locked In · Tap to change
            </div>
            <div style={{
              fontFamily: T.display, fontSize: 20, fontWeight: 600,
              color: T.text, lineHeight: 1.25, letterSpacing: '-0.01em',
              wordBreak: 'break-word',
            }}>
              {selectedTask.text}
            </div>
          </button>
        ) : (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 14, padding: '8px 0',
          }}>
            <div style={{
              fontFamily: T.mono, fontSize: 10.5, letterSpacing: '0.24em',
              color: T.text3, textTransform: 'uppercase',
            }}>
              No task selected
            </div>
            <p style={{
              fontFamily: T.display, fontSize: 14, color: T.text3, margin: 0,
              textAlign: 'center', maxWidth: 260, lineHeight: 1.5,
            }}>
              Skip if you'd rather decide later.
            </p>
          </div>
        )}
      </div>

      <div style={{
        padding: '0 24px 22px', display: 'flex', flexDirection: 'column', gap: 12,
        position: 'relative', zIndex: 1,
      }}>
        <PrimaryButton onClick={hasTask ? onStart : onChoose}>
          {hasTask ? 'Start Break' : 'Choose Task'}
        </PrimaryButton>
        <GhostButton onClick={onSkip}>Skip</GhostButton>
      </div>
    </div>
  );
}

function PrimaryButton({ children, onClick }) {
  const rgba = (a) => hexToRgba(T.cyan, a);
  return (
    <button onClick={onClick} style={{
      all: 'unset', boxSizing: 'border-box', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      width: '100%', height: 58, borderRadius: 18,
      background: `linear-gradient(180deg, ${rgba(0.92)}, ${rgba(0.55)})`,
      border: `1px solid ${rgba(0.9)}`,
      color: '#04121A',
      fontFamily: T.display, fontSize: 15, fontWeight: 700,
      letterSpacing: '0.12em', textTransform: 'uppercase',
      boxShadow: `0 0 0 1px ${rgba(0.25)} inset, inset 0 1px 0 rgba(255,255,255,0.28), 0 10px 30px rgba(0,0,0,0.5), 0 0 44px ${rgba(0.5)}`,
      WebkitTapHighlightColor: 'transparent',
    }}>
      {children}
    </button>
  );
}

function GhostButton({ children, onClick }) {
  return (
    <button onClick={onClick} style={{
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
      {children}
    </button>
  );
}
