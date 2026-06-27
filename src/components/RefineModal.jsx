import { useState, useEffect } from 'react';
import { T } from '../tokens.js';

export function RefineModal({ open, mission, description, currentSteps, onClose, onConfirm }) {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) {
      setLoading(true);
      setQuestions([]);
      setCurrentQ(0);
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

  const q = questions[currentQ];
  const isLast = currentQ >= questions.length - 1;
  const curAnswer = answers[currentQ] || { chip: null, text: '' };

  const toggleChip = (chip) =>
    setAnswers(prev => {
      const cur = prev[currentQ] || { chip: null, text: '' };
      return { ...prev, [currentQ]: { ...cur, chip: cur.chip === chip ? null : chip } };
    });

  const setText = (text) =>
    setAnswers(prev => {
      const cur = prev[currentQ] || { chip: null, text: '' };
      return { ...prev, [currentQ]: { ...cur, text } };
    });

  const handleFinish = () => {
    const lines = questions
      .map((qt, i) => {
        const a = answers[i];
        if (!a) return null;
        const parts = [a.chip, a.text?.trim()].filter(Boolean);
        if (!parts.length) return null;
        return `- ${qt.text} → ${parts.join('; ')}`;
      })
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
      <style>{`.refine-text::placeholder { color: rgba(255,255,255,0.22); font-family: inherit; }`}</style>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {questions.length > 0 && !loading && (
              <span style={{
                fontFamily: T.mono, fontSize: 9, letterSpacing: '0.16em',
                color: T.text3, textTransform: 'uppercase',
              }}>{currentQ + 1} / {questions.length}</span>
            )}
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
        ) : q ? (
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              fontFamily: T.display, fontSize: 16, fontWeight: 500,
              color: T.text, letterSpacing: '-0.01em', lineHeight: 1.38,
            }}>
              {q.text}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {q.chips.map(chip => {
                const selected = curAnswer.chip === chip;
                return (
                  <button
                    key={chip}
                    onClick={() => toggleChip(chip)}
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

            <textarea
              className="refine-text"
              value={curAnswer.text}
              onChange={e => setText(e.target.value)}
              placeholder="Or describe in your own words…"
              rows={3}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${T.hairlineSoft}`,
                borderRadius: 12,
                padding: '10px 14px',
                fontFamily: T.display,
                fontSize: 14,
                color: T.text,
                lineHeight: 1.5,
                resize: 'none',
                outline: 'none',
                width: '100%',
                boxSizing: 'border-box',
                caretColor: T.purple,
              }}
            />

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {!isLast && (
                <button
                  onClick={() => setCurrentQ(i => i + 1)}
                  style={{
                    all: 'unset', cursor: 'pointer',
                    flex: 1.4, height: 48, borderRadius: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: T.mono, fontSize: 10, letterSpacing: '0.16em',
                    textTransform: 'uppercase', fontWeight: 700,
                    color: '#fff',
                    background: `linear-gradient(135deg, ${T.purple}, rgba(61,127,255,0.9))`,
                    border: '1px solid rgba(168,118,255,0.6)',
                    boxShadow: '0 0 28px rgba(168,118,255,0.35)',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Next question
                </button>
              )}
              <button
                onClick={handleFinish}
                style={{
                  all: 'unset', cursor: 'pointer',
                  flex: 1, height: 48, borderRadius: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: T.mono, fontSize: 10, letterSpacing: '0.16em',
                  textTransform: 'uppercase', fontWeight: isLast ? 700 : 600,
                  color: isLast ? '#fff' : T.text2,
                  background: isLast
                    ? `linear-gradient(135deg, ${T.purple}, rgba(61,127,255,0.9))`
                    : 'rgba(255,255,255,0.05)',
                  border: isLast ? '1px solid rgba(168,118,255,0.6)' : `1px solid ${T.hairlineSoft}`,
                  boxShadow: isLast ? '0 0 28px rgba(168,118,255,0.35)' : 'none',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {isLast ? 'Finished. Generate the steps.' : 'Generate the steps.'}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
