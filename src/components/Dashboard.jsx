import { Fragment } from 'react';
import { T } from '../tokens.js';
import { Eyebrow } from './Eyebrow.jsx';
import { Telemetry } from './Telemetry.jsx';
import { GlowButton } from './GlowButton.jsx';

const STATES = [
  { id: 'idle',    label: 'Idle',        color: T.text3,  hint: 'No active momentum' },
  { id: 'warm',    label: 'Warming Up',  color: T.warn,   hint: '1+ launch today'    },
  { id: 'engaged', label: 'Engaged',     color: T.cyan,   hint: '3+ launches today'  },
  { id: 'locked',  label: 'Locked In',   color: T.purple, hint: '5+ launches today'  },
];

export function Dashboard({ momentum, launchesToday, onNewMission }) {
  const stateIdx = launchesToday >= 5 ? 3 : launchesToday >= 3 ? 2 : launchesToday >= 1 ? 1 : 0;
  const state = STATES[stateIdx];

  const days = [
    { d: 'M', v: 2 }, { d: 'T', v: 4 }, { d: 'W', v: 1 }, { d: 'T', v: 3 },
    { d: 'F', v: 5 }, { d: 'S', v: 2 }, { d: 'S', v: launchesToday, today: true },
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', minHeight: 0 }}>
      <div style={{ paddingTop: 8 }}>
        <Telemetry time="04:35:02 UTC" code={`MC-04 / ${state.label.toUpperCase()}`} state="DASHBOARD" />
      </div>

      <div style={{ padding: '20px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Eyebrow color={state.color} style={{ marginBottom: 8 }}>Momentum State</Eyebrow>
          <h1 style={{
            fontFamily: T.display, fontSize: 32, fontWeight: 600,
            color: T.text, margin: 0, letterSpacing: '-0.02em',
          }}>
            {state.label}
          </h1>
        </div>
        <button style={{
          width: 44, height: 44, borderRadius: 14,
          background: T.surface, border: `1px solid ${T.hairline}`,
          color: T.text2, cursor: 'pointer', display: 'inline-flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="18" height="18" viewBox="0 0 18 18">
            <circle cx="9" cy="4" r="1.3" fill="currentColor"/>
            <circle cx="9" cy="9" r="1.3" fill="currentColor"/>
            <circle cx="9" cy="14" r="1.3" fill="currentColor"/>
          </svg>
        </button>
      </div>

      <div style={{ padding: '20px 24px 0' }}>
        <div style={{
          position: 'relative',
          background: 'linear-gradient(160deg, rgba(0,229,255,0.10), rgba(168,118,255,0.06) 60%, rgba(255,255,255,0.02))',
          border: `1px solid ${T.hairline}`,
          borderRadius: 22, padding: '22px 22px 24px', overflow: 'hidden',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
        }}>
          <div style={{
            position: 'absolute', top: -60, right: -60,
            width: 200, height: 200, borderRadius: '50%',
            background: `radial-gradient(circle, ${state.color}33, transparent 70%)`,
          }} />
          <div style={{
            fontFamily: T.mono, fontSize: 10, letterSpacing: '0.24em',
            color: T.text3, textTransform: 'uppercase', marginBottom: 8,
          }}>
            ▸ Momentum Score
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <div style={{
              fontFamily: T.display, fontSize: 76, fontWeight: 600,
              letterSpacing: '-0.04em', lineHeight: 1, color: T.text,
              fontVariantNumeric: 'tabular-nums',
              textShadow: `0 0 30px ${state.color}66`,
            }}>{momentum}</div>
            <div style={{
              fontFamily: T.mono, fontSize: 11, color: T.teal, letterSpacing: '0.12em',
            }}>
              +47 / 7d
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontFamily: T.mono, fontSize: 9, letterSpacing: '0.18em',
              color: T.text3, textTransform: 'uppercase', marginBottom: 6,
            }}>
              <span>Today's pulse</span>
              <span>{launchesToday} launches</span>
            </div>
            <div style={{ display: 'flex', gap: 4, height: 36, alignItems: 'flex-end' }}>
              {days.map((d, i) => {
                const h = 6 + d.v * 6;
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{
                      width: '100%', height: h,
                      background: d.today
                        ? `linear-gradient(180deg, ${T.cyan}, ${T.blue})`
                        : 'rgba(255,255,255,0.12)',
                      borderRadius: 3,
                      boxShadow: d.today ? `0 0 12px ${T.cyan}` : 'none',
                    }} />
                    <div style={{ fontFamily: T.mono, fontSize: 9, color: d.today ? T.cyan : T.text3 }}>{d.d}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '18px 24px 0' }}>
        <div style={{
          fontFamily: T.mono, fontSize: 10, letterSpacing: '0.24em',
          color: T.text3, textTransform: 'uppercase', marginBottom: 10,
        }}>
          ▸ State Progression
        </div>
        <div style={{
          background: T.surface, border: `1px solid ${T.hairline}`,
          borderRadius: 16, padding: '16px 14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            {STATES.map((s, i) => {
              const reached = i <= stateIdx;
              return (
                <Fragment key={s.id}>
                  <div style={{
                    width: 10, height: 10, borderRadius: 99,
                    background: reached ? s.color : 'rgba(255,255,255,0.1)',
                    boxShadow: reached ? `0 0 12px ${s.color}` : 'none',
                    flexShrink: 0,
                    border: i === stateIdx ? `2px solid ${T.text}` : 'none',
                    outline: i === stateIdx ? `2px solid ${s.color}66` : 'none',
                    outlineOffset: 2,
                  }} />
                  {i < STATES.length - 1 && (
                    <div style={{
                      flex: 1, height: 1.5,
                      background: i < stateIdx
                        ? `linear-gradient(90deg, ${STATES[i].color}, ${STATES[i+1].color})`
                        : 'rgba(255,255,255,0.08)',
                    }} />
                  )}
                </Fragment>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {STATES.map((s, i) => (
              <div key={s.id} style={{
                fontFamily: T.mono, fontSize: 8.5, letterSpacing: '0.14em',
                color: i === stateIdx ? s.color : T.text3,
                textTransform: 'uppercase',
                fontWeight: i === stateIdx ? 600 : 400,
              }}>
                {s.label.split(' ')[0]}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: '18px 24px 0' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,
        }}>
          <div style={{
            fontFamily: T.mono, fontSize: 10, letterSpacing: '0.24em',
            color: T.text3, textTransform: 'uppercase',
          }}>
            ▸ Recent Launches
          </div>
          <div style={{ fontFamily: T.mono, fontSize: 10, color: T.text3, letterSpacing: '0.18em' }}>
            VIEW ALL
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { name: 'Finish proposal deck',   t: '2m ago',  dur: '1:30', mom: 15 },
            { name: 'Reply to Sarah',          t: '14m ago', dur: '0:45', mom: 8  },
            { name: 'Outline Q3 review',       t: '1h ago',  dur: '1:30', mom: 15 },
          ].map((m, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: T.surface, border: `1px solid ${T.hairlineSoft}`,
              borderRadius: 14, padding: '12px 14px',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: 'rgba(0,229,255,0.1)',
                border: `1px solid ${T.hairline}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="12" height="12" viewBox="0 0 12 12">
                  <path d="M6 1l4 5h-2.5v5h-3V6H2l4-5z" fill={T.cyan}/>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: T.display, fontSize: 14, fontWeight: 500, color: T.text,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {m.name}
                </div>
                <div style={{ fontFamily: T.mono, fontSize: 10, color: T.text3, letterSpacing: '0.1em', marginTop: 2 }}>
                  {m.t} · {m.dur}
                </div>
              </div>
              <div style={{
                fontFamily: T.mono, fontSize: 11, fontWeight: 600,
                color: T.teal, letterSpacing: '0.04em',
              }}>
                +{m.mom}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '20px 24px 24px', marginTop: 'auto' }}>
        <GlowButton onClick={onNewMission}>
          New Mission
          <svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 1l5 6h-3v6H5V7H2l5-6z" fill="currentColor"/></svg>
        </GlowButton>
      </div>
    </div>
  );
}
