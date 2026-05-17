// src/live-quiz.jsx — Quiz screen wired to the real question pool from the API.
// Adaptive engine matches backend's find_next_tier logic.

const QUIZ_LENGTH_LIVE = 20;

function LiveScreenQuiz({ user, run, pool: poolFromApi, onFinish, onHome }) {
  // poolFromApi: { 1: [normalized q], 2: [...], 3: [...], 4: [...] }
  const startTier = run?.starting_tier || 2;

  const [poolState] = React.useState(() => ({
    pool: poolFromApi,
    asked: new Set(),
  }));
  const [questionNum, setQuestionNum] = React.useState(1);
  const [currentTier, setCurrentTier] = React.useState(startTier);
  const [current, setCurrent] = React.useState(() => {
    const picked = pickFromPool(poolState, startTier);
    if (picked) poolState.asked.add(`${picked.tier}-${picked.idx}`);
    return picked;
  });
  const [selected, setSelected] = React.useState(null);
  const [submitted, setSubmitted] = React.useState(false);
  const [history, setHistory] = React.useState([]);

  // If pool exhausted (shouldn't happen with 30 q for 20-question quiz), finish.
  React.useEffect(() => {
    if (!current) onFinish({ history });
  }, [current]);

  if (!current) return null;

  const q = current.q;
  const isCorrect = selected === q.correct;
  const counts = poolCounts(poolState.pool, poolState.asked);

  const submit = () => {
    if (selected == null) return;
    const wasCorrect = selected === q.correct;
    setSubmitted(true);
    setHistory((h) => [...h, { tier: q.tier, correct: wasCorrect, qIdx: current.idx }]);
  };

  const next = () => {
    if (questionNum >= QUIZ_LENGTH_LIVE) {
      onFinish({ history });
      return;
    }
    const nextTier = isCorrect
      ? Math.min(4, currentTier + 1)
      : Math.max(1, currentTier - 1);
    const picked = pickFromPool(poolState, nextTier);
    if (picked) poolState.asked.add(`${picked.tier}-${picked.idx}`);
    setCurrent(picked);
    setCurrentTier(picked ? picked.tier : nextTier);
    setSelected(null);
    setSubmitted(false);
    setQuestionNum((n) => n + 1);
  };

  const correctCount = history.filter((h) => h.correct).length;

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
        <div className="stack" style={{ gap: 0 }}>
          <div className="quiz-header">
            <div className="quiz-header-left">
              <span className="num">{String(questionNum).padStart(2, "0")}</span>
              <span style={{ color: "var(--ink-3)" }}>/ {QUIZ_LENGTH_LIVE}</span>
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
              style={{ width: `${(questionNum - 1) / QUIZ_LENGTH_LIVE * 100}%` }}
            />
          </div>

          <div className="q-card" key={current.idx + "-" + questionNum}>
            <div className="q-eyebrow">
              <span className="eyebrow" style={{ color: "var(--ink-3)" }}>
                {q.topic}
              </span>
              <span style={{ color: "var(--ink-4)" }}>·</span>
              <span className="eyebrow" style={{ color: "var(--ink-3)" }}>
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
                      <span className="opt-mark" style={{ color: "var(--ok)" }}>✓</span>
                    )}
                    {submitted && i !== q.correct && selected === i && (
                      <span className="opt-mark" style={{ color: "var(--err)" }}>✕</span>
                    )}
                  </button>
                );
              })}
            </div>

            {submitted && (
              <LiveExplanationPanel question={q} isCorrect={isCorrect} />
            )}

            <div
              className="row"
              style={{
                marginTop: 26, gap: 12, justifyContent: "flex-end",
                alignItems: "center",
              }}
            >
              {!submitted && (
                <span style={{ fontSize: 12, color: "var(--ink-3)", marginRight: "auto" }}>
                  {selected != null
                    ? "Lock it in — no going back after submit."
                    : "Choose one of A–D to continue."}
                </span>
              )}
              {submitted && (
                <span style={{ fontSize: 12, color: "var(--ink-3)", marginRight: "auto" }}>
                  {questionNum < QUIZ_LENGTH_LIVE
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
                  {questionNum < QUIZ_LENGTH_LIVE ? "Next question" : "See results"}
                  <span style={{ opacity: 0.7, marginLeft: 4 }}>→</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <aside className="stack stack-4" style={{ position: "sticky", top: 96 }}>
          <div className="stack stack-2">
            <span className="eyebrow">Difficulty ladder</span>
            <TierLadder activeTier={currentTier} pool={counts} />
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
                title={run?.pdf_name}
              >
                {run?.pdf_name || "Untitled.pdf"}
              </div>
              <div style={{ color: "var(--ink-3)", fontSize: 12 }}>
                {run?.difficulty} mode · 30-question pool
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
                  {questionNum - 1}/{QUIZ_LENGTH_LIVE}
                </span>
              </div>
              <div className="quiz-progress" style={{ marginBottom: 0 }}>
                <div
                  className="quiz-progress-fill"
                  style={{ width: `${((questionNum - 1) / QUIZ_LENGTH_LIVE) * 100}%` }}
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

function LiveExplanationPanel({ question, isCorrect }) {
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

      {question.explanation && (
        <div className="explain-block">
          <h4>Why {correctLetter} is right</h4>
          <p>{question.explanation}</p>
        </div>
      )}

      {Object.keys(question.wrongs || {}).length > 0 && (
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
      )}
    </div>
  );
}

Object.assign(window, { LiveScreenQuiz, QUIZ_LENGTH_LIVE });
