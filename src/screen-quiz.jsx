// src/screen-quiz.jsx
//
// Adaptive quiz — picks next mock question based on tier movement.
// For this prototype we cycle a small mock bank of ~5 questions to
// keep the flow demoable end-to-end (real app uses the pool from the API).

const QUIZ_LENGTH = 20;

function pickNextQuestion(currentTier, askedIds) {
  // Try to find a mock question at the current tier first, then expand outwards.
  const sameTier = MOCK_QUESTIONS.filter(
    (q) => q.tier === currentTier && !askedIds.has(MOCK_QUESTIONS.indexOf(q))
  );
  if (sameTier.length) {
    const q = sameTier[Math.floor(Math.random() * sameTier.length)];
    return { q, idx: MOCK_QUESTIONS.indexOf(q) };
  }
  // Fall back: any unasked
  const unasked = MOCK_QUESTIONS.filter((_, i) => !askedIds.has(i));
  if (unasked.length) {
    const q = unasked[Math.floor(Math.random() * unasked.length)];
    return { q, idx: MOCK_QUESTIONS.indexOf(q) };
  }
  // Reset bank (since we have only 5 mock questions but quiz length is 20)
  return null;
}

function ScreenQuiz({ difficulty, pdfName, onFinish, onHome }) {
  const startTier = difficulty === "Easy" ? 1 : difficulty === "Hard" ? 3 : 2;

  const [questionNum, setQuestionNum] = React.useState(1);
  const [currentTier, setCurrentTier] = React.useState(startTier);
  const [askedIds, setAskedIds] = React.useState(() => new Set());
  const [current, setCurrent] = React.useState(() => pickNextQuestion(startTier, new Set()));

  const [selected, setSelected] = React.useState(null);
  const [submitted, setSubmitted] = React.useState(false);
  const [history, setHistory] = React.useState([]); // [{tier, correct}]
  const [pool, setPool] = React.useState({
    1: { remaining: 12, total: 12 },
    2: { remaining: 7, total: 7 },
    3: { remaining: 8, total: 8 },
    4: { remaining: 3, total: 3 },
  });

  React.useEffect(() => {
    if (!current) onFinish({ history });
  }, [current]);

  if (!current) return null;

  const q = current.q;
  const isCorrect = selected === q.correct;

  const submit = () => {
    if (selected == null) return;
    setSubmitted(true);
    const wasCorrect = selected === q.correct;
    setHistory((h) => [...h, { tier: q.tier, correct: wasCorrect, qIdx: current.idx }]);
    // decrement that tier in pool viz
    setPool((p) => ({
      ...p,
      [q.tier]: { ...p[q.tier], remaining: Math.max(0, p[q.tier].remaining - 1) },
    }));
  };

  const next = () => {
    if (questionNum >= QUIZ_LENGTH) {
      const finalHistory = [...history];
      onFinish({ history: finalHistory });
      return;
    }
    // Adaptive: move up if correct, down if wrong (clamped 1..4)
    const nextTier = isCorrect
      ? Math.min(4, currentTier + 1)
      : Math.max(1, currentTier - 1);

    // For mock: reset askedIds when exhausted so we can keep going to 20
    let newAsked = new Set(askedIds);
    newAsked.add(current.idx);
    let picked = pickNextQuestion(nextTier, newAsked);
    if (!picked) {
      newAsked = new Set();
      picked = pickNextQuestion(nextTier, newAsked);
    }
    setAskedIds(newAsked);
    setCurrent(picked);
    setCurrentTier(picked.q.tier);
    setSelected(null);
    setSubmitted(false);
    setQuestionNum((n) => n + 1);
  };

  const correctCount = history.filter((h) => h.correct).length;

  // Tier movement arrow indicator (shown after submit, hints next direction)
  const TierShift = () => {
    if (!submitted) return null;
    const dir = isCorrect ? "up" : "down";
    const sym = dir === "up" ? "↑" : "↓";
    const txt = isCorrect ? "Next: harder" : "Next: easier";
    const color = isCorrect ? "var(--forest)" : "var(--amber-2)";
    return (
      <span
        style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          fontFamily: "var(--mono)", fontSize: 11,
          color, fontWeight: 600,
          padding: "3px 8px", borderRadius: 999,
          background: isCorrect ? "var(--forest-tint)" : "var(--amber-tint)",
          border: `1px solid ${isCorrect ? "var(--forest-soft)" : "var(--amber-soft)"}`,
        }}
      >
        {sym} {txt}
      </span>
    );
  };

  return (
    <div className="container-wide screen-enter">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 220px",
          gap: 32,
          alignItems: "start",
        }}
      >
        {/* Main column */}
        <div className="stack" style={{ gap: 0 }}>
          {/* Header */}
          <div className="quiz-header">
            <div className="quiz-header-left">
              <span className="num">{String(questionNum).padStart(2, "0")}</span>
              <span style={{ color: "var(--ink-3)" }}>/ {QUIZ_LENGTH}</span>
              <span style={{ color: "var(--ink-4)" }}>·</span>
              <span>
                <b style={{ color: "var(--forest)" }}>{correctCount}</b>{" "}
                <span style={{ color: "var(--ink-3)" }}>correct</span>
              </span>
            </div>
            <div className="quiz-header-right">
              <TierBadge tier={currentTier} warm={submitted && !isCorrect} />
              <button
                className="btn btn-quiet btn-sm"
                onClick={onHome}
                title="Exit quiz"
              >
                Exit
              </button>
            </div>
          </div>

          <div className="quiz-progress">
            <div
              className="quiz-progress-fill"
              style={{ width: `${(questionNum - 1) / QUIZ_LENGTH * 100}%` }}
            />
          </div>

          {/* Question card */}
          <div className="q-card" key={current.idx + "-" + questionNum}>
            <div className="q-eyebrow">
              <span
                className="eyebrow"
                style={{ color: "var(--ink-3)" }}
              >
                {q.topic}
              </span>
              <span style={{ color: "var(--ink-4)" }}>·</span>
              <span
                className="eyebrow"
                style={{ color: "var(--ink-3)" }}
              >
                {TIER_LABELS[q.tier - 1]}
              </span>
              <span style={{ marginLeft: "auto" }}>
                <TierShift />
              </span>
            </div>

            <div className="q-text">{q.question}</div>

            <div className="opt-list">
              {q.options.map((opt, i) => {
                const letter = ["A", "B", "C", "D"][i];
                let cls = "opt";
                if (!submitted) {
                  if (selected === i) cls += " sel";
                } else {
                  if (i === q.correct) cls += " correct";
                  else if (selected === i) cls += " wrong";
                  else cls += " muted";
                }
                return (
                  <button
                    key={i}
                    type="button"
                    className={cls}
                    onClick={() => !submitted && setSelected(i)}
                    disabled={submitted}
                  >
                    <span className="opt-letter">{letter}</span>
                    <span className="opt-body">{opt}</span>
                    {submitted && i === q.correct && (
                      <span className="opt-mark" style={{ color: "var(--ok)" }}>
                        ✓
                      </span>
                    )}
                    {submitted && i !== q.correct && selected === i && (
                      <span className="opt-mark" style={{ color: "var(--err)" }}>
                        ✕
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {submitted && (
              <ExplanationPanel question={q} isCorrect={isCorrect} selected={selected} />
            )}

            <div
              className="row"
              style={{
                marginTop: 26, gap: 12, justifyContent: "flex-end",
                alignItems: "center",
              }}
            >
              {!submitted && (
                <span
                  style={{ fontSize: 12, color: "var(--ink-3)", marginRight: "auto" }}
                >
                  {selected != null
                    ? "Lock it in — no going back after submit."
                    : "Choose one of A–D to continue."}
                </span>
              )}
              {submitted && (
                <span
                  style={{ fontSize: 12, color: "var(--ink-3)", marginRight: "auto" }}
                >
                  {questionNum < QUIZ_LENGTH
                    ? "Take your time — the next question will adapt."
                    : "That was the last one — let's see how you did."}
                </span>
              )}

              {!submitted ? (
                <button
                  className="btn btn-primary"
                  disabled={selected == null}
                  onClick={submit}
                >
                  Submit answer
                </button>
              ) : (
                <button className="btn btn-primary" onClick={next}>
                  {questionNum < QUIZ_LENGTH ? "Next question" : "See results"}
                  <span style={{ opacity: 0.7, marginLeft: 4 }}>→</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="stack stack-4" style={{ position: "sticky", top: 96 }}>
          <div className="stack stack-2">
            <span className="eyebrow">Difficulty ladder</span>
            <TierLadder activeTier={currentTier} pool={pool} />
          </div>

          <div className="card card-pad stack stack-3" style={{ padding: 16 }}>
            <span className="eyebrow">Run</span>
            <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5 }}>
              <div
                style={{
                  fontWeight: 600, color: "var(--ink)",
                  marginBottom: 4, fontSize: 14,
                  overflow: "hidden", textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={pdfName}
              >
                {pdfName || "Untitled.pdf"}
              </div>
              <div style={{ color: "var(--ink-3)", fontSize: 12 }}>
                {difficulty} mode · 30-question pool
              </div>
            </div>
            <hr className="divider" style={{ margin: "2px 0" }} />
            <div className="stack stack-2">
              <div
                style={{
                  display: "flex", justifyContent: "space-between",
                  fontSize: 12, color: "var(--ink-3)",
                }}
              >
                <span>Progress</span>
                <span className="tabular">
                  {questionNum - 1}/{QUIZ_LENGTH}
                </span>
              </div>
              <div className="quiz-progress" style={{ marginBottom: 0 }}>
                <div
                  className="quiz-progress-fill"
                  style={{ width: `${((questionNum - 1) / QUIZ_LENGTH) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div
            style={{
              padding: 14, background: "var(--surface-2)",
              border: "1px dashed var(--line-2)", borderRadius: "var(--r-md)",
              fontSize: 12, color: "var(--ink-2)", lineHeight: 1.5,
            }}
          >
            <b style={{ color: "var(--ink)" }}>How adapting works:</b> answer correctly to climb a
            rung; answer wrong to drop one. The quiz seeks the edge of what you know.
          </div>
        </aside>
      </div>
    </div>
  );
}

// ------------------------------------------------
// Explanation panel
// ------------------------------------------------
function ExplanationPanel({ question, isCorrect, selected }) {
  const correctLetter = ["A", "B", "C", "D"][question.correct];
  const wrongLetters = ["A", "B", "C", "D"].filter((_, i) => i !== question.correct);

  return (
    <div className="explain">
      <div className={"explain-banner " + (isCorrect ? "ok" : "err")}>
        {isCorrect ? (
          <>
            <span style={{ fontSize: 18 }}>✓</span>
            <span>Correct.</span>
            <span className="badge">+15 XP</span>
          </>
        ) : (
          <>
            <span style={{ fontSize: 18 }}>✕</span>
            <span>
              Not quite — the answer was <b>{correctLetter}</b>.
            </span>
            <span className="badge">+3 XP for trying</span>
          </>
        )}
      </div>

      <div className="explain-block">
        <h4>Why {correctLetter} is right</h4>
        <p>{question.explanation}</p>
      </div>

      <div className="explain-block">
        <h4>Why the others miss</h4>
        <div className="explain-wrong-list">
          {wrongLetters.map((letter) => {
            const i = ["A", "B", "C", "D"].indexOf(letter);
            const text = question.wrongs?.[i];
            if (!text) return null;
            return (
              <div key={letter} className="explain-wrong-row">
                <span className="letter">{letter}</span>
                <span>{text}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

window.ScreenQuiz = ScreenQuiz;
window.QUIZ_LENGTH = QUIZ_LENGTH;
