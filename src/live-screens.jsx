// src/live-screens.jsx — Login, Home, Loading screens wired to the API.
// Quiz screen lives in live-quiz.jsx (it's bigger).

// ============================================================
// Login
// ============================================================
function LiveScreenLogin({ onLogin }) {
  const [mode, setMode] = React.useState("signin");
  const [username, setUsername] = React.useState("");
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!username.trim()) {
      setError("Please enter a username.");
      return;
    }
    if (mode === "signup" && username.trim().length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    setError(""); setBusy(true);
    try {
      const user = mode === "signin"
        ? await api.login(username.trim())
        : await api.signup(username.trim());
      onLogin(user);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap screen-enter">
      <aside className="login-aside">
        <div>
          <div className="wm-large">
            <span className="italic">Ascend</span>Quiz<span style={{ color: "var(--amber)" }}>.</span>
          </div>
          <div
            style={{
              marginTop: 16, fontSize: 13, letterSpacing: "0.12em",
              textTransform: "uppercase", color: "rgba(245,239,226,0.6)", fontWeight: 600,
            }}
          >
            Adaptive mastery · Built for studying
          </div>
        </div>
        <div>
          <div className="quote">
            “Tell me and I forget. Teach me and I remember. Involve me and I learn.”
          </div>
          <div className="quote-attr">— Benjamin Franklin</div>
        </div>
        <div className="footer-stats">
          <div><b>30</b> questions per pool</div>
          <div><b>4</b> adaptive difficulty tiers</div>
          <div><b>20</b> questions per quiz</div>
        </div>
      </aside>

      <section className="login-panel">
        <form className="login-card" onSubmit={submit}>
          <div className="stack stack-2" style={{ marginBottom: 8 }}>
            <span className="eyebrow">{mode === "signin" ? "Welcome back" : "New here?"}</span>
            <h1 className="h1">
              {mode === "signin" ? "Pick up where you left off." : "Make your study space."}
            </h1>
            <p className="lead">
              {mode === "signin"
                ? "Log in to see your streak, recent quizzes, and pick up your next study session."
                : "Choose a username — that's it. No email required."}
            </p>
          </div>

          <div className="tab-toggle" role="tablist">
            <button type="button"
              className={mode === "signin" ? "on" : ""}
              onClick={() => { setMode("signin"); setError(""); }}>
              Sign in
            </button>
            <button type="button"
              className={mode === "signup" ? "on" : ""}
              onClick={() => { setMode("signup"); setError(""); }}>
              Create account
            </button>
          </div>

          <div className="stack stack-2">
            <label className="field-label" htmlFor="login-user">Username</label>
            <input
              id="login-user"
              type="text"
              className={"input " + (error ? "input-error" : "")}
              placeholder={mode === "signin" ? "your-username" : "pick something memorable"}
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(""); }}
              autoFocus
              disabled={busy}
            />
            {error && (
              <div style={{ color: "var(--err)", fontSize: 13, fontWeight: 500 }}>{error}</div>
            )}
          </div>

          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy}>
            {busy ? "…" : (mode === "signin" ? "Continue" : "Create account")}
          </button>

          <div
            style={{ fontSize: 12, color: "var(--ink-3)", textAlign: "center", marginTop: -4 }}
          >
            By continuing you agree to study with intent.
          </div>

          <div style={{ display: "flex", justifyContent: "center", marginTop: 4 }}>
            <ApiStatusBadge />
          </div>
        </form>
      </section>
    </div>
  );
}

// ============================================================
// Home
// ============================================================
function LiveScreenHome({ user, onStart }) {
  const [diff, setDiff] = React.useState("Medium");
  const [pdfFile, setPdfFile] = React.useState(null);
  const [recent, setRecent] = React.useState([]);
  const [recentLoading, setRecentLoading] = React.useState(true);
  const fileInputRef = React.useRef(null);

  React.useEffect(() => {
    let cancelled = false;
    api.recent(user.user_id, 5)
      .then((r) => { if (!cancelled) { setRecent(r); setRecentLoading(false); } })
      .catch(() => { if (!cancelled) setRecentLoading(false); });
    return () => { cancelled = true; };
  }, [user.user_id]);

  return (
    <div className="container screen-enter stack stack-6">
      <div className="stack stack-3">
        <span className="eyebrow">Today's session</span>
        <h1 className="h1">
          Good evening, {user.username.split(" ")[0]}.<br />
          <span style={{ color: "var(--ink-3)" }}>
            Pick a reading and we'll build your next quiz.
          </span>
        </h1>
      </div>

      <div className="stack stack-4">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
          <h3 className="h3">Study material</h3>
          <span style={{ fontSize: 12, color: "var(--ink-3)" }}>PDF · up to 20 MB</span>
        </div>

        <label
          className="dropzone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer?.files?.[0];
            if (f) setPdfFile(f);
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            style={{ display: "none" }}
            onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
          />
          <div className="dropzone-icon" aria-hidden />
          {pdfFile ? (
            <>
              <div style={{ fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
                {pdfFile.name}
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-3)" }}>
                {(pdfFile.size / 1024).toFixed(0)} KB · Ready.{" "}
                <span
                  style={{ textDecoration: "underline", cursor: "pointer", color: "var(--forest)" }}
                  onClick={(e) => { e.preventDefault(); fileInputRef.current?.click(); }}
                >
                  Swap file
                </span>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
                Drop a PDF here, or{" "}
                <span style={{ color: "var(--forest)", textDecoration: "underline" }}>browse</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-3)" }}>
                Lecture notes, textbook chapters, papers — anything you'd want to be quizzed on.
              </div>
            </>
          )}
        </label>
      </div>

      <div className="stack stack-4">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
          <h3 className="h3">Difficulty mode</h3>
          <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
            Affects starting tier & question mix
          </span>
        </div>
        <DifficultyPicker value={diff} onChange={setDiff} />
      </div>

      <div className="row row-gap-3">
        <button
          className="btn btn-primary btn-lg"
          disabled={!pdfFile}
          onClick={() => onStart({ pdfFile, difficulty: diff })}
          style={{ flex: 1 }}
        >
          Generate quiz
          <span style={{ fontFamily: "var(--mono)", fontSize: 12, opacity: 0.7, marginLeft: 4, fontWeight: 500 }}>⏎</span>
        </button>
      </div>

      <hr className="divider" />

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24 }}>
        <div className="stack stack-4">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
            <h3 className="h3">Recent quizzes</h3>
            <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
              {recentLoading ? "Loading…" : `${recent.length} sessions`}
            </span>
          </div>
          {recentLoading ? (
            <div className="card card-pad text-muted" style={{ fontSize: 13 }}>
              Loading recent quizzes…
            </div>
          ) : recent.length === 0 ? (
            <div className="card card-pad text-muted" style={{ fontSize: 13 }}>
              No quizzes yet. Upload a PDF above to take your first one.
            </div>
          ) : (
            <div className="recent-list">
              {recent.map((r, i) => (
                <RecentRow key={i} name={r.name} sub={r.sub} score={r.score} />
              ))}
            </div>
          )}
        </div>

        <div className="card card-pad stack stack-3">
          <span className="eyebrow">Your stats</span>
          <div
            style={{
              fontFamily: "var(--serif)", fontSize: 44, fontWeight: 500, lineHeight: 1,
              color: "var(--ink)", letterSpacing: "-0.02em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {user.xp.toLocaleString()}{" "}
            <span style={{ fontSize: 16, color: "var(--ink-3)", fontStyle: "italic" }}>XP</span>
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-2)" }}>
            Level {user.level} · {user.streak}-day streak
          </div>
          <hr className="divider" style={{ margin: "4px 0" }} />
          <div className="stack stack-2">
            <div
              style={{
                display: "flex", justifyContent: "space-between",
                fontSize: 12, color: "var(--ink-3)",
              }}
            >
              <span>Next level</span>
              <span className="tabular">
                {user.xp % 500} / 500
              </span>
            </div>
            <div className="quiz-progress" style={{ marginBottom: 0 }}>
              <div className="quiz-progress-fill" style={{ width: `${(user.xp % 500) / 5}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Loading — animation runs while the real API call resolves
// ============================================================
function LiveScreenLoading({ pdfFile, difficulty, onDone, onError, onBack }) {
  const dist = POOL_DISTS[difficulty] || POOL_DISTS.Medium;
  const [progress, setProgress] = React.useState([0, 0, 0, 0]);
  const [phase, setPhase] = React.useState("extracting");
  const [error, setError] = React.useState(null);
  const apiDoneRef = React.useRef(null); // holds the API result when it arrives

  // Kick off the real API call on mount
  React.useEffect(() => {
    let cancelled = false;
    setTimeout(() => !cancelled && setPhase("generating"), 700);
    api.generateQuiz(pdfFile, difficulty)
      .then((result) => {
        if (cancelled) return;
        apiDoneRef.current = result;
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
      });
    return () => { cancelled = true; };
  }, []);

  // Drive the animation
  React.useEffect(() => {
    if (phase !== "generating" || error) return;
    const rates = [220, 260, 320, 360];
    const intervals = rates.map((rate, tierIdx) =>
      setInterval(() => {
        setProgress((p) => {
          if (p[tierIdx] >= dist[tierIdx]) return p;
          const next = [...p];
          next[tierIdx] += 1;
          return next;
        });
      }, rate)
    );
    return () => intervals.forEach(clearInterval);
  }, [phase, error, dist]);

  // When both animation done AND API done → finish
  React.useEffect(() => {
    const animDone = progress.every((p, i) => p >= dist[i]);
    if (!animDone) return;
    if (phase !== "finalizing") setPhase("finalizing");
    const check = setInterval(() => {
      if (apiDoneRef.current) {
        clearInterval(check);
        onDone(apiDoneRef.current);
      }
    }, 250);
    return () => clearInterval(check);
  }, [progress, dist, phase, onDone]);

  if (error) {
    return (
      <ErrorPanel
        title="Couldn't generate the quiz"
        message={error}
        onRetry={() => window.location.reload()}
        onBack={onBack}
      />
    );
  }

  const statusText = {
    extracting: "Reading your PDF…",
    generating: "Drafting questions across four difficulty tiers…",
    finalizing: apiDoneRef.current
      ? "Almost ready — shuffling the pool."
      : "Waiting for the model to finish…",
  }[phase];

  return (
    <div className="container-narrow screen-enter">
      <div className="gen-wrap">
        <div className="stack stack-3" style={{ alignItems: "center" }}>
          <span className="eyebrow">Building your quiz</span>
          <div className="gen-status">{statusText}</div>
          <div className="gen-sub">
            We're generating four pools in parallel — easy through hard. The model usually
            takes 20–40 seconds.
          </div>
        </div>

        <div className="gen-stacks">
          {dist.map((target, tierIdx) => {
            const filled = progress[tierIdx];
            const isDone = filled >= target;
            return (
              <div key={tierIdx} className="gen-col">
                {Array.from({ length: target }, (_, i) => {
                  const state =
                    i < filled ? "done" : i === filled && phase === "generating" ? "loading" : "";
                  return <div key={i} className={`gen-tile ${state}`} />;
                })}
                <div className={"gen-col-label " + (isDone ? "done" : "")}>
                  {TIER_LABELS[tierIdx]}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            display: "flex", gap: 18, fontSize: 12, color: "var(--ink-3)",
            fontFamily: "var(--mono)",
          }}
        >
          <span>{progress.reduce((a, b) => a + b, 0)} / 30 drafted</span>
          <span>·</span>
          <span>4 workers</span>
          <span>·</span>
          <span>{difficulty} pool</span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { LiveScreenLogin, LiveScreenHome, LiveScreenLoading });
