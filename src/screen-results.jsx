// src/screen-results.jsx
function ScreenResults({ history, pdfName, difficulty, onHome, onRetry }) {
  const total = history.length || QUIZ_LENGTH;
  const correct = history.filter((h) => h.correct).length;
  const pct = Math.round((correct / total) * 100);

  // Tier breakdown
  const byTier = [1, 2, 3, 4].map((t) => {
    const items = history.filter((h) => h.tier === t);
    const ok = items.filter((h) => h.correct).length;
    return { tier: t, total: items.length, correct: ok };
  });

  // XP math (mock)
  const xpEarned = correct * 15 + (total - correct) * 3 + (pct >= 80 ? 50 : 0);
  const streakBonus = pct >= 70;

  const grade =
    pct >= 90 ? "Mastery" :
    pct >= 75 ? "Strong" :
    pct >= 60 ? "Developing" :
    "Reviewing";
  const gradeColor =
    pct >= 90 ? "var(--forest)" :
    pct >= 75 ? "var(--forest)" :
    pct >= 60 ? "var(--amber-2)" :
    "var(--rust)";

  // Highest tier reached
  const highestTier = history.reduce((max, h) => h.correct && h.tier > max ? h.tier : max, 1);

  return (
    <div className="container screen-enter stack stack-6">
      {/* Hero */}
      <div className="result-hero">
        {pct >= 70 && <CelebrateTicks count={18} />}
        <div className="result-eyebrow">Quiz complete</div>
        <div className="result-score">
          <span>{correct}</span>
          <span className="slash">/</span>
          <span className="of">{total}</span>
        </div>
        <div className="result-pct">
          {pct}% correct ·{" "}
          <span style={{ color: gradeColor, fontWeight: 700 }}>{grade}</span>
        </div>

        <div
          className="row row-gap-2"
          style={{ justifyContent: "center", marginTop: 18, position: "relative" }}
        >
          {streakBonus && <StreakPill days={MOCK_USER.streak + 1} />}
          <span className="xp-chip">
            <span className="xp-dot" />
            +{xpEarned} XP earned
          </span>
        </div>
      </div>

      {/* Stat grid */}
      <div className="stat-grid">
        <div className="stat">
          <div className="stat-label">Highest tier reached</div>
          <div className="stat-value">{TIER_LABELS[highestTier - 1]}</div>
          <div className="stat-sub">
            {highestTier === 4 ? "Synthesis-level questions." :
             highestTier === 3 ? "Application-level questions." :
             highestTier === 2 ? "Inference-level questions." :
                                  "Recall-level questions."}
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Avg time / question</div>
          <div className="stat-value">42s</div>
          <div className="stat-sub">A little quicker than your average.</div>
        </div>
        <div className="stat">
          <div className="stat-label">Streak</div>
          <div className="stat-value">{MOCK_USER.streak + (streakBonus ? 1 : 0)}<span style={{ fontSize: 18, color: "var(--ink-3)" }}> days</span></div>
          <div className="stat-sub">
            {streakBonus ? "Extended today — nice." : "Score 70%+ to extend."}
          </div>
        </div>
      </div>

      {/* Tier breakdown */}
      <div className="card card-pad stack stack-4">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
          <h3 className="h3">Performance by tier</h3>
          <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
            {pdfName} · {difficulty} mode
          </span>
        </div>
        <div className="tier-breakdown">
          {byTier.map((row) => {
            const pctRow = row.total > 0 ? Math.round((row.correct / row.total) * 100) : 0;
            const warm = pctRow < 60;
            return (
              <div key={row.tier} className="tier-row">
                <div className="row row-gap-2 name">
                  <TierBadge tier={row.tier} label={false} />
                  <span>{TIER_LABELS[row.tier - 1]}</span>
                </div>
                <div className="bar">
                  <div
                    className={"bar-fill " + (warm ? "warm" : "")}
                    style={{ width: `${row.total ? pctRow : 0}%` }}
                  />
                </div>
                <div className="count">
                  {row.correct}/{row.total || 0}
                </div>
              </div>
            );
          })}
        </div>

        <hr className="divider" />

        <div
          style={{
            display: "flex", gap: 14,
            padding: "14px 16px",
            background: "var(--surface-2)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-md)",
            fontSize: 13.5, lineHeight: 1.55, color: "var(--ink-2)",
          }}
        >
          <span style={{
            fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 22,
            color: "var(--amber-2)", lineHeight: 1, flexShrink: 0,
          }}>“</span>
          <div>
            <b style={{ color: "var(--ink)" }}>Suggested next:</b>{" "}
            {pct < 60
              ? "Re-read the source PDF and retry — same material, same mix. We'll start one tier easier."
              : pct < 80
              ? "Try the same PDF on Hard mode — you're ready for more synthesis questions."
              : "You're at mastery. Move on to the next chapter, or try a related reading."}
          </div>
        </div>
      </div>

      {/* CTA row */}
      <div className="row row-gap-3">
        <button className="btn btn-primary btn-lg" onClick={onHome} style={{ flex: 1 }}>
          Back to home
        </button>
        <button className="btn btn-ghost btn-lg" onClick={onRetry}>
          Retry same PDF
        </button>
        <button className="btn btn-ghost btn-lg" title="Download question pool as JSON">
          ↓ Question pool
        </button>
      </div>
    </div>
  );
}

window.ScreenResults = ScreenResults;
