// src/screen-login.jsx
function ScreenLogin({ onLogin }) {
  const [mode, setMode] = React.useState("signin");
  const [username, setUsername] = React.useState("Ashley");
  const [error, setError] = React.useState("");

  const submit = (e) => {
    e?.preventDefault?.();
    if (!username.trim()) {
      setError("Please enter a username.");
      return;
    }
    if (mode === "signup" && username.trim().length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    onLogin(username.trim());
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
              marginTop: 16,
              fontSize: 13,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(245,239,226,0.6)",
              fontWeight: 600,
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
          <div>
            <b>30</b> questions per pool
          </div>
          <div>
            <b>4</b> adaptive difficulty tiers
          </div>
          <div>
            <b>20</b> questions per quiz
          </div>
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
                : "Choose a username — that's it. No email required. Your progress is saved automatically."}
            </p>
          </div>

          <div className="tab-toggle" role="tablist">
            <button
              type="button"
              className={mode === "signin" ? "on" : ""}
              onClick={() => { setMode("signin"); setError(""); }}
            >
              Sign in
            </button>
            <button
              type="button"
              className={mode === "signup" ? "on" : ""}
              onClick={() => { setMode("signup"); setError(""); }}
            >
              Create account
            </button>
          </div>

          <div className="stack stack-2">
            <label className="field-label" htmlFor="login-user">
              Username
            </label>
            <input
              id="login-user"
              type="text"
              className={"input " + (error ? "input-error" : "")}
              placeholder={mode === "signin" ? "your-username" : "pick something memorable"}
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(""); }}
              autoFocus
            />
            {error && (
              <div style={{ color: "var(--err)", fontSize: 13, fontWeight: 500 }}>{error}</div>
            )}
          </div>

          <button type="submit" className="btn btn-primary btn-lg btn-block">
            {mode === "signin" ? "Continue" : "Create account"}
          </button>

          <div
            style={{
              fontSize: 12,
              color: "var(--ink-3)",
              textAlign: "center",
              marginTop: -4,
            }}
          >
            By continuing you agree to study with intent.
          </div>
        </form>
      </section>
    </div>
  );
}

window.ScreenLogin = ScreenLogin;
