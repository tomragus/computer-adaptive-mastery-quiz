// src/live-app.jsx — Root of the live (backend-connected) prototype.

const TWEAK_DEFAULTS_LIVE = /*EDITMODE-BEGIN*/{
  "palette": ["#2E4D3E", "#E08B3C", "#FBF7EF"],
  "density": "regular",
  "motion": "standard"
}/*EDITMODE-END*/;

const PALETTES_LIVE = [
  ["#2E4D3E", "#E08B3C", "#FBF7EF"],
  ["#1F2A36", "#C8A24A", "#F4EFE3"],
  ["#4A2B4F", "#D17B7B", "#FBF3F1"],
  ["#1F4F5C", "#D4673C", "#F2EEE2"],
];

function hexToRgbL(hex) {
  const m = hex.replace("#", "");
  const v = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}
function rgbToHexL(r, g, b) {
  return "#" + [r, g, b].map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0")).join("");
}
function mixL(a, b, t) {
  const ar = hexToRgbL(a), br = hexToRgbL(b);
  return rgbToHexL(ar[0] + (br[0] - ar[0]) * t, ar[1] + (br[1] - ar[1]) * t, ar[2] + (br[2] - ar[2]) * t);
}
function shadeL(hex, amt) {
  const [r, g, b] = hexToRgbL(hex);
  return rgbToHexL(r * (1 + amt), g * (1 + amt), b * (1 + amt));
}
function applyTweaksLive(t) {
  const root = document.documentElement;
  root.dataset.density = t.density || "regular";
  root.dataset.motion = t.motion || "standard";
  const [p, a, bg] = t.palette || PALETTES_LIVE[0];
  root.style.setProperty("--forest", p);
  root.style.setProperty("--forest-2", shadeL(p, -0.12));
  root.style.setProperty("--forest-soft", mixL(p, "#FFFFFF", 0.78));
  root.style.setProperty("--forest-tint", mixL(p, "#FFFFFF", 0.9));
  root.style.setProperty("--amber", a);
  root.style.setProperty("--amber-2", shadeL(a, -0.12));
  root.style.setProperty("--amber-soft", mixL(a, "#FFFFFF", 0.72));
  root.style.setProperty("--amber-tint", mixL(a, "#FFFFFF", 0.86));
  root.style.setProperty("--bg", bg);
  root.style.setProperty("--bg-2", shadeL(bg, -0.04));
  root.style.setProperty("--surface", mixL(bg, "#FFFFFF", 0.5));
  root.style.setProperty("--surface-2", shadeL(bg, -0.02));
}

// ============================================================
// Live results — same look as the mock prototype, but uses the
// authenticated user object instead of MOCK_USER.
// ============================================================
function LiveScreenResults({ user, history, run, onHome, onRetry }) {
  const total = history.length || QUIZ_LENGTH_LIVE;
  const correct = history.filter((h) => h.correct).length;
  const pct = Math.round((correct / total) * 100);
  const xpEarned = correct * 15 + (total - correct) * 3 + (pct >= 80 ? 50 : 0);
  const streakBonus = pct >= 70;
  const grade =
    pct >= 90 ? "Mastery" :
    pct >= 75 ? "Strong" :
    pct >= 60 ? "Developing" : "Reviewing";
  const gradeColor =
    pct >= 75 ? "var(--forest)" :
    pct >= 60 ? "var(--amber-2)" : "var(--rust)";
  const highestTier = history.reduce((m, h) => h.correct && h.tier > m ? h.tier : m, 1);
  const byTier = [1, 2, 3, 4].map((t) => {
    const items = history.filter((h) => h.tier === t);
    return { tier: t, total: items.length, correct: items.filter((h) => h.correct).length };
  });

  // Save the result once on mount
  const saveRef = React.useRef(false);
  React.useEffect(() => {
    if (saveRef.current) return;
    saveRef.current = true;
    api.saveResult({
      userId: user.user_id,
      pdfName: run.pdf_name,
      correct,
      total,
    }).catch((err) => console.warn("Failed to save result:", err.message));
  }, []);

  return (
    <div className="container screen-enter stack stack-6">
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
          {streakBonus && <StreakPill days={user.streak + 1} />}
          <span className="xp-chip">
            <span className="xp-dot" />
            +{xpEarned} XP earned
          </span>
        </div>
      </div>

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
          <div className="stat-label">Questions answered</div>
          <div className="stat-value">{total}</div>
          <div className="stat-sub">Pulled from a pool of 30.</div>
        </div>
        <div className="stat">
          <div className="stat-label">Streak</div>
          <div className="stat-value">
            {user.streak + (streakBonus ? 1 : 0)}
            <span style={{ fontSize: 18, color: "var(--ink-3)" }}> days</span>
          </div>
          <div className="stat-sub">
            {streakBonus ? "Extended today — nice." : "Score 70%+ to extend."}
          </div>
        </div>
      </div>

      <div className="card card-pad stack stack-4">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
          <h3 className="h3">Performance by tier</h3>
          <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
            {run.pdf_name} · {run.difficulty} mode
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
                <div className="count">{row.correct}/{row.total || 0}</div>
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
              ? "Re-read the source PDF and retry — same material. We'll start one tier easier."
              : pct < 80
              ? "Try the same PDF on Hard mode — you're ready for more synthesis questions."
              : "You're at mastery. Move on to the next chapter, or try a related reading."}
          </div>
        </div>
      </div>

      <div className="row row-gap-3">
        <button className="btn btn-primary btn-lg" onClick={onHome} style={{ flex: 1 }}>
          Back to home
        </button>
        <button className="btn btn-ghost btn-lg" onClick={onRetry}>
          Retry same PDF
        </button>
      </div>
    </div>
  );
}

// ============================================================
// App
// ============================================================
function LiveApp() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS_LIVE);
  const [screen, setScreen] = React.useState("login");
  const [user, setUser] = React.useState(null);
  const [pdfFile, setPdfFile] = React.useState(null);
  const [difficulty, setDifficulty] = React.useState("Medium");
  const [run, setRun] = React.useState(null); // API generate result
  const [pool, setPool] = React.useState(null);
  const [history, setHistory] = React.useState([]);

  React.useEffect(() => applyTweaksLive(t), [t]);

  const showTopbar = screen !== "login";

  return (
    <div className="app-shell" data-screen-label={screen}>
      {showTopbar && user && (
        <Topbar
          user={user.username}
          streak={user.streak}
          level={user.level}
          xp={user.xp}
          onHome={() => setScreen("home")}
          onLogout={() => {
            setUser(null); setPool(null); setRun(null); setHistory([]);
            setScreen("login");
          }}
        />
      )}

      <main className="app-content">
        {screen === "login" && (
          <LiveScreenLogin
            onLogin={(u) => {
              setUser(u);
              setScreen("home");
            }}
          />
        )}
        {screen === "home" && user && (
          <LiveScreenHome
            user={user}
            onStart={({ pdfFile, difficulty }) => {
              setPdfFile(pdfFile);
              setDifficulty(difficulty);
              setScreen("loading");
            }}
          />
        )}
        {screen === "loading" && pdfFile && (
          <LiveScreenLoading
            pdfFile={pdfFile}
            difficulty={difficulty}
            onDone={(result) => {
              setRun(result);
              setPool(poolFromApi(result.questions_by_tier));
              setHistory([]);
              setScreen("quiz");
            }}
            onBack={() => setScreen("home")}
          />
        )}
        {screen === "quiz" && pool && (
          <LiveScreenQuiz
            user={user}
            run={run}
            pool={pool}
            onFinish={({ history }) => {
              setHistory(history);
              setScreen("results");
            }}
            onHome={() => setScreen("home")}
          />
        )}
        {screen === "results" && user && run && (
          <LiveScreenResults
            user={user}
            run={run}
            history={history}
            onHome={() => setScreen("home")}
            onRetry={() => setScreen("loading")}
          />
        )}
      </main>

      <TweaksPanel>
        <TweakSection label="Connection" />
        <div style={{ padding: "4px 0" }}>
          <ApiStatusBadge />
        </div>

        <TweakSection label="Theme" />
        <TweakColor
          label="Palette"
          value={t.palette}
          options={PALETTES_LIVE}
          onChange={(v) => setTweak("palette", v)}
        />

        <TweakSection label="Layout" />
        <TweakRadio
          label="Density"
          value={t.density}
          options={["compact", "regular", "cozy"]}
          onChange={(v) => setTweak("density", v)}
        />
        <TweakRadio
          label="Motion"
          value={t.motion}
          options={["subtle", "standard", "expressive"]}
          onChange={(v) => setTweak("motion", v)}
        />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<LiveApp />);
