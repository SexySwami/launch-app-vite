import { useState, useEffect, useMemo } from 'react';
import { T } from '../tokens.js';
import { Telemetry } from './Telemetry.jsx';
import { GlowButton } from './GlowButton.jsx';
import { MarqueeText } from './MarqueeText.jsx';
import { EditMicroStepModal } from './EditMicroStepModal.jsx';
import { WorkWithMeModal } from './WorkWithMeModal.jsx';

const BATCH_SIZE = 4;

export function SmallChunker({
  mission,
  description,
  completionGroupId,
  sourceItemId,
  sourceItemIndex,
  sourceFolderId,
  batchSteps,
  batchNumber,
  firstStepNumber,
  inBatchIdx,
  loading,
  cascadeLoading,
  allSteps,
  onAdvanceInBatch,
  onGoBack,
  onBatchComplete,
  onFinish,
  onStepEdited,
  onBack,
}) {
  const [exiting, setExiting] = useState(false);
  const [entering, setEntering] = useState(true);
  const [loggedCards, setLoggedCards] = useState(() => new Set()); // per-batch (resets on remount)
  const [overrides, setOverrides] = useState({}); // per-batch (resets on remount): inBatchIdx -> { title }
  const [editOpen, setEditOpen] = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);
  const [regenSeen, setRegenSeen] = useState([]);
  const [workWithMeOpen, setWorkWithMeOpen] = useState(false);

  // Close the edit modal whenever the active card changes.
  useEffect(() => { setEditOpen(false); setRegenLoading(false); setRegenSeen([]); }, [inBatchIdx]);

  // Re-trigger enter animation whenever the active card changes.
  useEffect(() => {
    setExiting(false);
    setEntering(true);
    const t = setTimeout(() => setEntering(false), 60);
    return () => clearTimeout(t);
  }, [inBatchIdx]);

  const baseStep = Array.isArray(batchSteps) ? batchSteps[inBatchIdx] : null;
  const step = useMemo(() => {
    if (!baseStep) return baseStep;
    const ov = overrides[inBatchIdx];
    return ov ? { ...baseStep, ...ov } : baseStep;
  }, [baseStep, overrides, inBatchIdx]);
  const isFinalInBatch = inBatchIdx + 1 === BATCH_SIZE;
  const absoluteStepNumber = (firstStepNumber || 1) + inBatchIdx;
  const lastStepNumber = (firstStepNumber || 1) + BATCH_SIZE - 1;
  const progress = ((inBatchIdx + (exiting ? 1 : 0)) / BATCH_SIZE) * 100;

  // For the regen modal: everything generated before the card being edited.
  const previousStepsForEdit = useMemo(() => {
    if (!Array.isArray(allSteps)) return [];
    const absoluteIdx = (firstStepNumber || 1) - 1 + inBatchIdx;
    return allSteps.slice(0, absoluteIdx);
  }, [allSteps, firstStepNumber, inBatchIdx]);

  const canCallAPI = typeof window !== 'undefined'
    && /^https?:$/.test(window.location?.protocol || '');

  const handleRegen = async () => {
    if (regenLoading || !step) return;
    const idx = inBatchIdx;
    const currentTitle = step.title;
    setRegenLoading(true);
    try {
      const res = await fetch('/api/generate-micro-options', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          mission: mission || '',
          ...(description ? { description: description.toString() } : {}),
          previousSteps: Array.isArray(previousStepsForEdit) ? previousStepsForEdit : [],
          currentStep: currentTitle,
          seenOptions: [...regenSeen, currentTitle],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.options) && data.options.length > 0) {
        const picked = data.options[0];
        setRegenSeen(prev => Array.from(new Set([...prev, currentTitle, ...data.options.map(o => o.title)])));
        setOverrides(prev => {
          const next = { ...prev, [idx]: { title: picked.title, description: picked.description || '' } };
          for (let i = idx + 1; i < BATCH_SIZE; i++) delete next[i];
          return next;
        });
        onStepEdited && onStepEdited(idx, picked.title);
      }
    } catch {}
    finally { setRegenLoading(false); }
  };

  const handleAdvance = () => {
    if (exiting || loading || !step) return;
    setExiting(true);
    setTimeout(() => {
      if (isFinalInBatch) onBatchComplete && onBatchComplete();
      else onAdvanceInBatch && onAdvanceInBatch();
    }, 320);
  };

  const handleBack = () => {
    if (inBatchIdx > 0) onGoBack && onGoBack();
    else onBack && onBack();
  };

  const handleFinished = () => {
    if (exiting) return;
    onFinish && onFinish();
  };

  const handleLog = async () => {
    if (!step) return;
    if (loggedCards.has(inBatchIdx)) return;
    setLoggedCards(prev => { const n = new Set(prev); n.add(inBatchIdx); return n; });
    if (!completionGroupId || !canCallAPI) return;

    try {
      await fetch('/api/completed?action=log-step', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: completionGroupId,
          sourceItemId: sourceItemId || null,
          sourceItemIndex: typeof sourceItemIndex === 'number' ? sourceItemIndex : null,
          folderId: sourceFolderId,
          text: mission,
          ...(description ? { description: description.toString() } : {}),
          microStep: {
            tag: 'CHUNK',
            title: step.title || '',
            hint: step.description || '',
          },
        }),
      });
    } catch {
      setLoggedCards(prev => { const n = new Set(prev); n.delete(inBatchIdx); return n; });
    }
  };

  const stepLogged = loggedCards.has(inBatchIdx);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '8px 0 24px', overflow: 'hidden', minHeight: 0 }}>
      <Telemetry
        time={`BATCH ${String(batchNumber || 1).padStart(2, '0')} · STEPS ${firstStepNumber || 1}–${lastStepNumber}`}
        code="MICRO / ON-DEMAND"
        state="LIVE"
      />

      <div style={{ padding: '20px 24px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <button
              onClick={handleBack}
              aria-label={inBatchIdx > 0 ? 'Back to previous card' : 'Back to mode select'}
              style={{
                all: 'unset', cursor: 'pointer', flexShrink: 0,
                width: 36, height: 36, borderRadius: 99,
                background: T.surface,
                border: `1px solid ${T.hairlineSoft}`,
                color: T.text2,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 150ms ease',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14">
                <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontFamily: T.mono, fontSize: 10, letterSpacing: '0.24em',
                color: T.text3, textTransform: 'uppercase', marginBottom: 4,
              }}>
                ▸ Steps {firstStepNumber || 1}–{lastStepNumber}
              </div>
              <div style={{
                fontFamily: T.display, fontSize: 18, fontWeight: 600,
                color: T.text, letterSpacing: '-0.01em', lineHeight: 1.1,
              }}>
                Step <span style={{ color: T.amber }}>{absoluteStepNumber}</span>
                <span style={{ color: T.text3, fontWeight: 500 }}> · card {inBatchIdx + 1} of {BATCH_SIZE}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setWorkWithMeOpen(true)}
            aria-label="Open Work With Me videos"
            style={{
              all: 'unset', cursor: 'pointer', flexShrink: 0,
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '8px 13px', borderRadius: 99,
              background: 'rgba(255,192,72,0.10)',
              border: `1px solid rgba(255,192,72,0.42)`,
              boxShadow: `0 0 16px rgba(255,192,72,0.18)`,
              transition: 'all 180ms ease',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" style={{ flexShrink: 0, color: T.amber }}>
              <path d="M2 2.4v9.2a.6.6 0 0 0 .92.5l7.3-4.6a.6.6 0 0 0 0-1L2.92 1.9A.6.6 0 0 0 2 2.4z" fill="currentColor"/>
            </svg>
            <span style={{
              fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em',
              fontWeight: 600, color: T.text, textTransform: 'uppercase',
            }}>
              Work With Me
            </span>
          </button>
        </div>

        <div style={{
          height: 6, borderRadius: 99,
          background: 'rgba(255,255,255,0.06)', overflow: 'hidden',
          border: `1px solid ${T.hairlineSoft}`,
        }}>
          <div style={{
            height: '100%', width: `${progress}%`,
            background: `linear-gradient(90deg, ${T.amber}, ${T.blue} 60%, ${T.amber})`,
            boxShadow: `0 0 12px ${T.amber}99`,
            transition: 'width 600ms cubic-bezier(0.2, 0.8, 0.2, 1)',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute', right: -2, top: -3, bottom: -3, width: 10,
              background: `radial-gradient(circle, ${T.amber}, transparent 70%)`,
              filter: 'blur(2px)',
            }} />
          </div>
        </div>

        <div style={{
          fontFamily: T.mono, fontSize: 10, letterSpacing: '0.18em',
          color: T.text3, textTransform: 'uppercase', marginTop: 12,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {mission}
        </div>
      </div>

      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px 24px', position: 'relative', minHeight: 0,
      }}>
        <div style={{
          position: 'absolute', width: 360, height: 360, borderRadius: '50%',
          background: `radial-gradient(circle, rgba(255,192,72,0.18), rgba(255,192,72,0.08) 40%, transparent 70%)`,
          animation: 'breathe 3.2s ease-in-out infinite',
          pointerEvents: 'none',
        }} />

        <div key={`${batchNumber}-${inBatchIdx}`} style={{
          position: 'relative', width: '100%', height: '100%',
          maxHeight: 460,
          background: 'linear-gradient(160deg, rgba(255,255,255,0.07), rgba(255,255,255,0.025) 60%, rgba(255,192,72,0.04))',
          border: `1px solid rgba(255,192,72,0.32)`,
          borderRadius: 28,
          display: 'flex', flexDirection: 'column',
          padding: '28px 24px 32px',
          boxShadow: `
            0 0 0 1px rgba(255,255,255,0.04) inset,
            0 30px 80px rgba(255,192,72,0.12),
            0 8px 32px rgba(0,0,0,0.5),
            inset 0 1px 0 rgba(255,255,255,0.08)
          `,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          overflow: 'hidden',
          transform: exiting ? 'translateY(-24px) scale(0.96)' : entering ? 'translateY(20px) scale(0.97)' : 'translateY(0) scale(1)',
          opacity: exiting ? 0 : entering ? 0 : 1,
          transition: 'transform 380ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 320ms ease',
        }}>
          <div style={{
            position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)',
            width: 280, height: 200,
            background: `radial-gradient(ellipse, rgba(255,192,72,0.35), transparent 70%)`,
            pointerEvents: 'none',
          }} />
          {[
            { top: 14, left: 14, b: 'l', r: 't' },
            { top: 14, right: 14, b: 'r', r: 't' },
            { bottom: 14, left: 14, b: 'l', r: 'b' },
            { bottom: 14, right: 14, b: 'r', r: 'b' },
          ].map((c, i) => (
            <div key={i} style={{
              position: 'absolute',
              top: c.top, left: c.left, right: c.right, bottom: c.bottom,
              width: 14, height: 14,
              borderTop: c.r === 't' ? `1px solid ${T.amber}88` : 'none',
              borderBottom: c.r === 'b' ? `1px solid ${T.amber}88` : 'none',
              borderLeft: c.b === 'l' ? `1px solid ${T.amber}88` : 'none',
              borderRight: c.b === 'r' ? `1px solid ${T.amber}88` : 'none',
            }} />
          ))}

          {cascadeLoading ? (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              position: 'relative', zIndex: 1, padding: '20px 8px', gap: 16,
            }}>
              <div style={{
                fontFamily: T.mono, fontSize: 10, letterSpacing: '0.32em',
                color: T.amber, textTransform: 'uppercase',
                textShadow: `0 0 12px ${T.amber}88`,
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: 99, background: T.amber,
                  boxShadow: `0 0 10px ${T.amber}`,
                  animation: 'pulse 1.4s ease-in-out infinite',
                }} />
                Recalibrating
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 260, marginTop: 4 }}>
                {[0, 1].map(i => (
                  <div key={i} style={{
                    height: 10, borderRadius: 99,
                    background: `linear-gradient(90deg, rgba(255,192,72,0.10) 0%, rgba(255,192,72,0.26) 50%, rgba(255,192,72,0.10) 100%)`,
                    backgroundSize: '200% 100%',
                    animation: `shimmer 1.6s ease-in-out ${i * 0.2}s infinite`,
                    width: `${[78, 55][i]}%`,
                    alignSelf: 'center',
                  }} />
                ))}
              </div>
              <p style={{
                fontFamily: T.mono, fontSize: 10, color: T.text3,
                letterSpacing: '0.18em', textTransform: 'uppercase',
                margin: 0, marginTop: 4, textAlign: 'center',
              }}>
                Adjusting step to match your edit
              </p>
            </div>
          ) : loading || !step ? (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              position: 'relative', zIndex: 1, padding: '20px 8px', gap: 18,
            }}>
              <div style={{
                fontFamily: T.mono, fontSize: 10, letterSpacing: '0.32em',
                color: T.amber, textTransform: 'uppercase',
                textShadow: `0 0 12px ${T.amber}88`,
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: 99, background: T.amber,
                  boxShadow: `0 0 10px ${T.amber}`,
                  animation: 'pulse 1.4s ease-in-out infinite',
                }} />
                Generating batch {batchNumber || 1}
              </div>

              <h2 style={{
                fontFamily: T.display, fontWeight: 600,
                fontSize: 28, lineHeight: 1.15, letterSpacing: '-0.02em',
                color: T.text, margin: 0, textAlign: 'center',
                textShadow: `0 0 40px rgba(255,192,72,0.4)`,
              }}>
                {(batchNumber || 1) === 1
                  ? <>Chunking your mission<br/>into 4 tiny steps…</>
                  : <>Generating 4 more<br/>tiny steps…</>}
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 260, marginTop: 4 }}>
                {[0, 1, 2, 3].map(i => (
                  <div key={i} style={{
                    height: 10, borderRadius: 99,
                    background: `linear-gradient(90deg, rgba(255,192,72,0.12) 0%, rgba(255,192,72,0.22) 50%, rgba(255,192,72,0.12) 100%)`,
                    backgroundSize: '200% 100%',
                    animation: `shimmer 1.6s ease-in-out ${i * 0.15}s infinite`,
                    width: `${[90, 70, 80, 60][i]}%`,
                    alignSelf: 'center',
                  }} />
                ))}
              </div>

              <p style={{
                fontFamily: T.mono, fontSize: 10, color: T.text3,
                letterSpacing: '0.22em', textTransform: 'uppercase',
                margin: 0, marginTop: 4, textAlign: 'center',
              }}>
                {(batchNumber || 1) === 1
                  ? `Tailoring 4 micro-steps to "${(mission || '').slice(0, 36)}${(mission || '').length > 36 ? '…' : ''}"`
                  : `Continuing from step ${(firstStepNumber || 1) - 1}`}
              </p>
            </div>
          ) : (
            <>
              <div style={{
                display: 'flex', alignSelf: 'stretch', alignItems: 'center', gap: 10,
                padding: '6px 12px 6px 8px', borderRadius: 99,
                background: 'rgba(255,192,72,0.12)',
                border: `1px solid rgba(255,192,72,0.4)`,
                position: 'relative', zIndex: 1,
                minWidth: 0,
              }}>
                <span style={{
                  width: 22, height: 22, borderRadius: 99, flexShrink: 0,
                  background: `linear-gradient(180deg, ${T.amber}, ${T.blue})`,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: T.mono, fontSize: 11, fontWeight: 700, color: '#001018',
                }}>
                  {absoluteStepNumber}
                </span>
                <MarqueeText
                  text={(mission || '').toString()}
                  textStyle={{
                    fontFamily: T.mono, fontSize: 10, letterSpacing: '0.22em',
                    color: T.amber, textTransform: 'uppercase', fontWeight: 600,
                  }}
                />
              </div>

              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                position: 'relative', zIndex: 1, padding: '0 4px',
              }}>
                <div style={{
                  fontFamily: T.mono, fontSize: 10, letterSpacing: '0.32em',
                  color: T.teal, textTransform: 'uppercase', marginBottom: 18,
                  textShadow: `0 0 12px ${T.teal}88`,
                }}>
                  ▸ Do this
                </div>
                <h2 style={{
                  fontFamily: T.display, fontWeight: 600,
                  fontSize: 32, lineHeight: 1.1, letterSpacing: '-0.025em',
                  color: T.text, margin: 0, textAlign: 'center',
                  textShadow: `0 0 40px rgba(255,192,72,0.4)`,
                }}>
                  {step.title}
                </h2>
                {step.description && (
                  <p style={{
                    fontFamily: T.display, fontSize: 14, color: T.text2,
                    margin: '14px 0 0', textAlign: 'center', maxWidth: 280, lineHeight: 1.4,
                  }}>
                    {step.description}
                  </p>
                )}
              </div>

              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                fontFamily: T.mono, fontSize: 9.5, letterSpacing: '0.22em',
                color: T.text3, textTransform: 'uppercase', position: 'relative', zIndex: 1,
              }}>
                <button onClick={() => setEditOpen(true)} style={{
                  all: 'unset', cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '6px 9px', borderRadius: 99,
                  background: 'rgba(255,192,72,0.08)',
                  border: `1px solid rgba(255,192,72,0.32)`,
                  color: T.amber,
                  fontFamily: T.mono, fontSize: 9, letterSpacing: '0.18em',
                  textTransform: 'uppercase', fontWeight: 600,
                  transition: 'all 200ms ease',
                  WebkitTapHighlightColor: 'transparent',
                }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" style={{ flexShrink: 0 }}>
                    <path d="M1 9l1.5-3.5L7 1l2 2-4.5 4.5L1 9z" stroke="currentColor" strokeWidth="1" fill="none" strokeLinejoin="round"/>
                  </svg>
                  Edit
                </button>

                <button
                  onClick={handleRegen}
                  disabled={regenLoading}
                  aria-label="Regenerate step"
                  style={{
                    all: 'unset', cursor: regenLoading ? 'default' : 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '6px 9px', borderRadius: 99,
                    background: 'rgba(255,192,72,0.08)',
                    border: `1px solid rgba(255,192,72,0.32)`,
                    color: T.amber,
                    fontFamily: T.mono, fontSize: 9, letterSpacing: '0.18em',
                    textTransform: 'uppercase', fontWeight: 600,
                    transition: 'all 200ms ease',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 12 12" style={{ flexShrink: 0, animation: regenLoading ? 'spin360 800ms linear infinite' : 'none' }}>
                    <path d="M10 6a4 4 0 1 1-1.2-2.85M10 1.5V4H7.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Regen
                </button>

              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <GlowButton onClick={handleAdvance} disabled={loading || !step || cascadeLoading}>
          {loading || !step
            ? `Generating batch ${batchNumber || 1}…`
            : cascadeLoading
              ? 'Recalibrating…'
              : 'Next'}
          {!loading && step && !cascadeLoading && (
            <svg width="14" height="14" viewBox="0 0 14 14">
              <path d="M2 7.5l3 3 7-7" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </GlowButton>
        <div style={{
          textAlign: 'center', marginTop: 4,
          fontFamily: T.mono, fontSize: 10, letterSpacing: '0.2em',
          color: T.text3, textTransform: 'uppercase',
        }}>
          {loading || !step
            ? 'Claude is chunking your batch'
            : isFinalInBatch
              ? 'Final card in batch · keep going for more'
              : `${BATCH_SIZE - inBatchIdx - 1} more card${BATCH_SIZE - inBatchIdx - 1 === 1 ? '' : 's'} in batch`}
        </div>
      </div>

      <EditMicroStepModal
        open={editOpen}
        step={step}
        absoluteStepNumber={absoluteStepNumber}
        mission={mission}
        description={description}
        previousSteps={previousStepsForEdit}
        onClose={() => setEditOpen(false)}
        onPick={(picked) => {
          const newTitle = typeof picked === 'string' ? picked : picked.title;
          const newDesc = typeof picked === 'string' ? '' : (picked.description || '');
          setOverrides(prev => {
            const next = { ...prev, [inBatchIdx]: { title: newTitle, description: newDesc } };
            for (let i = inBatchIdx + 1; i < BATCH_SIZE; i++) delete next[i];
            return next;
          });
          setEditOpen(false);
          onStepEdited && onStepEdited(inBatchIdx, newTitle);
        }}
      />

      <WorkWithMeModal
        open={workWithMeOpen}
        mission={mission}
        description={description}
        onClose={() => setWorkWithMeOpen(false)}
      />
    </div>
  );
}
