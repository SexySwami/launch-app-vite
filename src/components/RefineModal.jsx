import { useState, useEffect } from 'react';
import { T } from '../tokens.js';

export function RefineModal({ open, mission, description, currentSteps, onClose, onConfirm }) {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) {
      setLoading(true);
      setQuestions([]);
      setAnswers({});
      setError(null);
      return;
    }

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/generate-refine-questions', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            mission: mission || '',
            ...(description ? { description: description.toString() } : {}),
            currentSteps: Array.isArray(currentSteps)
              ? currentSteps.map(s => ({ title: s?.title || '' }))
              : [],
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && Array.isArray(data.questions) && data.questions.length > 0) {
          setQuestions(data.questions);
        } else {
          setError('Could not generate questions — try again.');
        }
      } catch {
        setError('Could not generate questions — try again.');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  const toggle = (qi, chip) =>
    setAnswers(prev => ({ ...prev, [qi]: prev[qi] === chip ? null : chip }));

  const hasAnswers = Object.values(answers).some(Boolean);

  const handleConfirm = () => {
    const lines = questions
      .map((q, i) => answers[i] ? `- ${q.text} → ${answers[i]}` : null)
      .filter(Boolean);
    onConfirm(lines.length ? `User clarifications:\n${lines.join('\n')}` : '');
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        background: 'rgba(2,4,8,0.66)',
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        animation: 'backdropIn 220ms ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 400,
          background: 'linear-gradient(160deg, rgba(255,255,255,0.08), rgba(255,255,255,0.025) 55%, rgba(168,118,255,0.05))',
          border: '1px solid rgba(168,118,255,0.42)',
          borderRadius: 24,
          padding: '20px 20px 24px',
          boxShadow: `
            0 0 0 1px rgba(255,255,255,0.05) inset,
            0 30px 80px rgba(0,0,0,0.6),
            0 0 60px rgba(168,118,255,0.18)
          `,
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          animation: 'modalIn 280ms cubic-bezier(0.2,0.8,0.2,1)',
          position: 'relative', overflow: 'hidden',
        }}
      >
        <div style={{
          position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)',
          width: 240, height: 160,
          background: 'radial-gradient(ellipse, rgba(168,118,255,0.28), transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Header */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 6, height: 6, borderRadius: 99, background: T.purple,
              boxShadow: `0 0 8px ${T.purple}`,
            }} />
            <span style={{
              fontFamily: T.mono, fontSize: 10, letterSpacing: '0.24em',
              color: T.purple, textTransform: 'uppercase', fontWeight: 600,
              textShadow: `0 0 8px ${T.purple}66`,
            }}>Refine Steps</span>
          </div>
          <button onClick={onClose} aria-label="Close" style={{
            all: 'unset', cursor: 'pointer',
            width: 28, height: 28, borderRadius: 99,
            background: 'rgba(255,255,255,0.05)',
            border: `1px solid ${T.hairlineSoft}`,
            color: T.text2,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="9" height="9" viewBox="0 0 10 10">
              <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {loading ? (
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 14, padding: '28px 0',
          }}>
            <div style={{
              fontFamily: T.mono, fontSize: 10, letterSpacing: '0.3em',
              color: T.purple, textTransform: 'uppercase',
              display: 'inline-flex', alignItems: 'center', gap: 8,
              textShadow: `0 0 12px ${T.purple}88`,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: 99, background: T.purple,
                boxShadow: `0 0 10px ${T.purple}`,
                animation: 'pulse 1.4s ease-in-out infinite',
              }} />
              Analyzing your task…
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 8, height: 8, borderRadius: 99, background: T.purple,
                  animation: `pulse 1.2s ease-in-out ${i * 0.18}s infinite`,
                }} />
              ))}
            </div>
          </div>
        ) : error ? (
          <div style={{
            textAlign: 'center', padding: '28px 0',
            fontFamily: T.display, fontSize: 14, color: T.text2, lineHeight: 1.5,
          }}>
            {error}
          </div>
        ) : (
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 22 }}>
            {questions.map((q, qi) => (
              <div key={qi}>
                <div style={{
                  fontFamily: T.display, fontSize: 15, fontWeight: 500,
                  color: T.text, letterSpacing: '-0.01em', lineHeight: 1.38,
                  marginBottom: 12,
                }}>
                  {q.text}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {q.chips.map(chip => {
                    const selected = answers[qi] === chip;
                    return (
                      <button
                        key={chip}
                        onClick={() => toggle(qi, chip)}
                        style={{
                          all: 'unset', cursor: 'pointer',
                          padding: '7px 14px', borderRadius: 99,
                          fontFamily: T.mono, fontSize: 10, letterSpacing: '0.14em',
                          textTransform: 'uppercase', fontWeight: selected ? 700 : 500,
                          color: selected ? '#fff' : T.text2,
                          background: selected
                            ? `linear-gradient(135deg, ${T.purple}, rgba(61,127,255,0.9))`
                            : 'rgba(255,255,255,0.06)',
                          border: `1px solid ${selected ? 'rgba(168,118,255,0.7)' : 'rgba(140,200,255,0.18)'}`,
                          boxShadow: selected ? '0 0 18px rgba(168,118,255,0.4)' : 'none',
                          transition: 'all 160ms ease',
                          WebkitTapHighlightColor: 'transparent',
                        }}
                      >
                        {chip}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <button
              onClick={handleConfirm}
              disabled={!hasAnswers}
              style={{
                all: 'unset', cursor: hasAnswers ? 'pointer' : 'default',
                marginTop: 4,
                width: '100%', height: 52, borderRadius: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, boxSizing: 'border-box',
                background: hasAnswers
                  ? `linear-gradient(135deg, ${T.purple}, rgba(61,127,255,0.9))`
                  : 'rgba(255,255,255,0.05)',
                border: `1px solid ${hasAnswers ? 'rgba(168,118,255,0.6)' : 'rgba(140,200,255,0.12)'}`,
                boxShadow: hasAnswers ? '0 0 28px rgba(168,118,255,0.35)' : 'none',
                opacity: hasAnswers ? 1 : 0.4,
                transition: 'all 200ms ease',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none"
                stroke={hasAnswers ? '#fff' : T.text3}
                strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 7h10M8 3l4 4-4 4"/>
              </svg>
              <span style={{
                fontFamily: T.mono, fontSize: 10, letterSpacing: '0.2em',
                fontWeight: 700, textTransform: 'uppercase',
                color: hasAnswers ? '#fff' : T.text3,
              }}>Regenerate Steps</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
