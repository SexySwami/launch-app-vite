import { T } from '../tokens.js';
import { Eyebrow } from './Eyebrow.jsx';
import { Telemetry } from './Telemetry.jsx';

export function NextPhase({ onKeepGoing, onAllDone, onNextTask, onSeeCompleted }) {
  const choices = [
    {
      id: 'keep',
      title: 'Keep Going',
      sub: 'Start another mission · ride the wave',
      color: T.cyan,
      onClick: onKeepGoing,
      icon: <path d="M7 1l5 6h-3v6H5V7H2l5-6z" fill="currentColor"/>,
    },
    {
      id: 'done',
      title: "I'm Good Now",
      sub: 'Lock it in · view your momentum',
      color: T.teal,
      onClick: onAllDone,
      icon: <path d="M2 7.5l3 3 7-7" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>,
    },
    {
      id: 'next',
      title: 'Next Task',
      sub: 'Pick the next item from your queue',
      color: T.purple,
      onClick: onNextTask,
      icon: <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>,
    },
    {
      id: 'log',
      title: 'See Completed Steps',
      sub: 'Review what you logged · across all missions',
      color: T.blue,
      onClick: onSeeCompleted,
      icon: <g><path d="M2 3h10M2 7h10M2 11h7" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round"/><path d="M9.5 11.5l1 1 2-2" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/></g>,
    },
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', minHeight: 0 }}>
      <Telemetry time="04:34:42 UTC" code="MC-04 / DECISION" state="STANDBY" />

      {/* ambient glow blob */}
      <div style={{
        position: 'absolute', top: '24%', left: '50%', transform: 'translateX(-50%)',
        width: 380, height: 320, pointerEvents: 'none',
        background: `radial-gradient(ellipse, rgba(0,229,255,0.18), rgba(168,118,255,0.08) 50%, transparent 75%)`,
        animation: 'breathe 3.6s ease-in-out infinite',
      }} />

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '24px 24px 0',
        position: 'relative', zIndex: 1, gap: 28, minHeight: 0,
      }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Eyebrow color={T.teal} style={{ marginBottom: 14 }}>Phase Complete</Eyebrow>
          <h1 style={{
            fontFamily: T.display, fontWeight: 600, fontSize: 36, lineHeight: 1.1,
            letterSpacing: '-0.025em', color: T.text, margin: 0,
            textShadow: `0 0 36px rgba(0,229,255,0.3)`,
          }}>
            What's next?
          </h1>
          <p style={{
            fontFamily: T.display, fontSize: 14, color: T.text2,
            marginTop: 12, marginBottom: 0, lineHeight: 1.5, maxWidth: 280,
          }}>
            You've still got momentum. Pick your next move.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {choices.map((c) => (
            <button
              key={c.id}
              onClick={c.onClick}
              style={{
                all: 'unset', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px',
                background: `linear-gradient(160deg, ${c.color}1c, rgba(255,255,255,0.025) 60%, rgba(255,255,255,0.02))`,
                border: `1px solid ${c.color}55`,
                borderRadius: 16,
                transition: 'all 200ms ease',
                boxShadow: `0 0 0 1px rgba(255,255,255,0.03) inset, 0 6px 24px ${c.color}22`,
                WebkitTapHighlightColor: 'transparent',
              }}
              onTouchStart={e => e.currentTarget.style.transform = 'scale(0.985)'}
              onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.985)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: T.display, fontSize: 17, fontWeight: 600,
                  color: T.text, letterSpacing: '-0.01em', marginBottom: 4,
                }}>
                  {c.title}
                </div>
                <div style={{
                  fontFamily: T.mono, fontSize: 10, letterSpacing: '0.16em',
                  color: T.text3, textTransform: 'uppercase',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {c.sub}
                </div>
              </div>
              <div style={{
                width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                background: `${c.color}22`,
                border: `1px solid ${c.color}66`,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                color: c.color,
                boxShadow: `0 0 14px ${c.color}55`,
              }}>
                <svg width="14" height="14" viewBox="0 0 14 14">{c.icon}</svg>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ height: 24, flexShrink: 0 }} />
    </div>
  );
}
