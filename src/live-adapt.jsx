// src/live-adapt.jsx — Adapters between the API and the prototype's screens.
// - normalizeQuestion: API question → internal shape used by the quiz UI
// - pickFromPool: real adaptive engine (mirrors backend's find_next_tier logic)
// - ErrorPanel: shared error UI

function stripLetterPrefix(text) {
  return String(text).replace(/^[A-D][\)\.:\-]?\s*/i, "").trim();
}

function letterToIndex(letter) {
  return { A: 0, B: 1, C: 2, D: 3 }[String(letter || "").trim().toUpperCase()] ?? 0;
}

// Convert an API question to the internal shape the existing quiz UI expects.
function normalizeQuestion(apiQ) {
  const correctIdx = letterToIndex(apiQ.correct_answer);
  const options = (apiQ.options || []).map(stripLetterPrefix);
  // Map wrong-letter map → wrong-index map
  const wrongs = {};
  Object.entries(apiQ.explanation_wrong || {}).forEach(([k, v]) => {
    wrongs[letterToIndex(k)] = v;
  });
  return {
    tier: apiQ.difficulty_tier || apiQ.tier || 2,
    topic: apiQ.topic || "Question",
    question: apiQ.question,
    options,
    correct: correctIdx,
    explanation: apiQ.explanation_correct || apiQ.explanation || "",
    wrongs,
  };
}

// Picks the next question given an adaptive engine state.
// state = { pool: {1:[...],2:[...],3:[...],4:[...]}, asked: Set<"tier-idx"> }
// Mirrors backend app.py: pick at desired tier; if empty, search outward.
function pickFromPool(state, desiredTier) {
  const clamp = (t) => Math.max(1, Math.min(4, t));
  const target = clamp(desiredTier);

  const available = (t) =>
    (state.pool[t] || []).filter((_, i) => !state.asked.has(`${t}-${i}`));

  let attempt = available(target);
  if (attempt.length) return pickRandom(state, target, attempt);

  // Search higher first, then lower
  for (const t of [target + 1, target + 2, target + 3]) {
    if (t > 4) break;
    attempt = available(t);
    if (attempt.length) return pickRandom(state, t, attempt);
  }
  for (const t of [target - 1, target - 2, target - 3]) {
    if (t < 1) break;
    attempt = available(t);
    if (attempt.length) return pickRandom(state, t, attempt);
  }
  return null;
}

function pickRandom(state, tier, list) {
  // Find the original index in pool[tier]
  const allAtTier = state.pool[tier] || [];
  const pick = list[Math.floor(Math.random() * list.length)];
  const idx = allAtTier.indexOf(pick);
  return { tier, idx, q: pick };
}

function poolCounts(pool, asked) {
  const out = {};
  [1, 2, 3, 4].forEach((t) => {
    const total = (pool[t] || []).length;
    const askedAtTier = [...asked].filter((k) => k.startsWith(`${t}-`)).length;
    out[t] = { total, remaining: Math.max(0, total - askedAtTier) };
  });
  return out;
}

// Convert API's stringified-key pool to numeric-key pool
function poolFromApi(questionsByTier) {
  const out = {};
  [1, 2, 3, 4].forEach((t) => {
    const list = questionsByTier[String(t)] || questionsByTier[t] || [];
    out[t] = list.map(normalizeQuestion);
  });
  return out;
}

function ErrorPanel({ title = "Something went wrong", message, onRetry, onBack }) {
  return (
    <div className="container-narrow screen-enter">
      <div
        className="card card-pad-lg stack stack-4"
        style={{ marginTop: 60, textAlign: "left" }}
      >
        <span className="eyebrow" style={{ color: "var(--err)" }}>{title}</span>
        <h2 className="h2">We hit a snag.</h2>
        <p className="lead" style={{ whiteSpace: "pre-wrap" }}>{message}</p>
        <div className="row row-gap-3" style={{ marginTop: 8 }}>
          {onRetry && (
            <button className="btn btn-primary" onClick={onRetry}>Try again</button>
          )}
          {onBack && (
            <button className="btn btn-ghost" onClick={onBack}>Back to home</button>
          )}
        </div>
      </div>
    </div>
  );
}

// Top-right banner showing API base + health
function ApiStatusBadge() {
  const [base, setBase] = React.useState(getApiBase());
  const [ok, setOk] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;
    api.health()
      .then((h) => { if (!cancelled) setOk(h.gemini_configured ? "ok" : "no-key"); })
      .catch(() => { if (!cancelled) setOk("offline"); });
    return () => { cancelled = true; };
  }, [base]);

  const change = () => {
    const next = prompt(
      "API base URL (without trailing slash):",
      base,
    );
    if (next && next !== base) {
      setApiBase(next.replace(/\/$/, ""));
      setBase(getApiBase());
      setOk(null);
    }
  };

  const color =
    ok === "ok" ? "var(--ok)" :
    ok === "no-key" ? "var(--amber-2)" :
    ok === "offline" ? "var(--err)" :
    "var(--ink-3)";
  const text =
    ok === "ok" ? "Connected" :
    ok === "no-key" ? "GEMINI_API_KEY missing" :
    ok === "offline" ? "Backend offline" :
    "Checking…";

  return (
    <button
      onClick={change}
      title="Click to change API base URL"
      style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "5px 10px", borderRadius: 999,
        border: "1px solid var(--line)", background: "var(--surface)",
        fontSize: 11, fontWeight: 600, fontFamily: "var(--mono)",
        color: "var(--ink-2)", cursor: "pointer",
      }}
    >
      <span style={{
        width: 6, height: 6, borderRadius: "50%", background: color,
      }} />
      {text} · {base.replace(/^https?:\/\//, "")}
    </button>
  );
}

Object.assign(window, {
  normalizeQuestion, pickFromPool, poolCounts, poolFromApi,
  letterToIndex, stripLetterPrefix,
  ErrorPanel, ApiStatusBadge,
});
