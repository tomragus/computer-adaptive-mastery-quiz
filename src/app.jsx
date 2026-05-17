// src/app.jsx — root + state machine + tweaks

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": ["#2E4D3E", "#E08B3C", "#FBF7EF"],
  "density": "regular",
  "motion": "standard",
  "showSidebar": true,
  "celebrate": true,
  "fontDisplay": "serif"
}/*EDITMODE-END*/;

// Palette options (forest+amber, charcoal+gold, plum+rose, teal+coral)
const PALETTES = [
  ["#2E4D3E", "#E08B3C", "#FBF7EF"], // Forest & Amber (default)
  ["#1F2A36", "#C8A24A", "#F4EFE3"], // Slate & Gold
  ["#4A2B4F", "#D17B7B", "#FBF3F1"], // Plum & Rose
  ["#1F4F5C", "#D4673C", "#F2EEE2"], // Teal & Clay
];

function applyTweaks(t) {
  const root = document.documentElement;
  root.dataset.density = t.density || "regular";
  root.dataset.motion = t.motion || "standard";
  // palette override
  const [p, a, bg] = t.palette || PALETTES[0];
  // Generate soft variants programmatically
  root.style.setProperty("--forest", p);
  root.style.setProperty("--forest-2", shade(p, -0.12));
  root.style.setProperty("--forest-soft", mix(p, "#FFFFFF", 0.78));
  root.style.setProperty("--forest-tint", mix(p, "#FFFFFF", 0.9));
  root.style.setProperty("--amber", a);
  root.style.setProperty("--amber-2", shade(a, -0.12));
  root.style.setProperty("--amber-soft", mix(a, "#FFFFFF", 0.72));
  root.style.setProperty("--amber-tint", mix(a, "#FFFFFF", 0.86));
  root.style.setProperty("--bg", bg);
  root.style.setProperty("--bg-2", shade(bg, -0.04));
  root.style.setProperty("--surface", mix(bg, "#FFFFFF", 0.5));
  root.style.setProperty("--surface-2", shade(bg, -0.02));
}

// Color helpers
function hexToRgb(hex) {
  const m = hex.replace("#", "");
  const v = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}
function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0")).join("");
}
function mix(a, b, t) {
  const ar = hexToRgb(a), br = hexToRgb(b);
  return rgbToHex(ar[0] + (br[0] - ar[0]) * t, ar[1] + (br[1] - ar[1]) * t, ar[2] + (br[2] - ar[2]) * t);
}
function shade(hex, amt) {
  // amt -1..1 (negative darkens)
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * (1 + amt), g * (1 + amt), b * (1 + amt));
}

// ----------------------------------------------------------------

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [screen, setScreen] = React.useState("login"); // login | home | loading | quiz | results
  const [user, setUser] = React.useState(null);
  const [run, setRun] = React.useState(null); // { pdfName, difficulty }
  const [result, setResult] = React.useState(null);

  React.useEffect(() => applyTweaks(t), [t]);

  // Topbar shows on non-login screens
  const showTopbar = screen !== "login";

  return (
    <div className="app-shell" data-screen-label={screen}>
      {showTopbar && (
        <Topbar
          user={user || "Ashley"}
          streak={MOCK_USER.streak}
          level={MOCK_USER.level}
          xp={MOCK_USER.xp}
          onHome={() => setScreen("home")}
          onLogout={() => { setUser(null); setScreen("login"); }}
        />
      )}

      <main className="app-content">
        {screen === "login" && (
          <ScreenLogin
            onLogin={(name) => {
              setUser(name);
              setScreen("home");
            }}
          />
        )}
        {screen === "home" && (
          <ScreenHome
            recent={MOCK_RECENT}
            onStart={(payload) => {
              setRun(payload);
              setScreen("loading");
            }}
          />
        )}
        {screen === "loading" && (
          <ScreenLoading
            difficulty={run?.difficulty || "Medium"}
            onDone={() => setScreen("quiz")}
          />
        )}
        {screen === "quiz" && (
          <ScreenQuiz
            difficulty={run?.difficulty || "Medium"}
            pdfName={run?.pdfName || "Untitled.pdf"}
            onFinish={(payload) => {
              setResult(payload);
              setScreen("results");
            }}
            onHome={() => setScreen("home")}
          />
        )}
        {screen === "results" && (
          <ScreenResults
            history={result?.history || []}
            pdfName={run?.pdfName || "Untitled.pdf"}
            difficulty={run?.difficulty || "Medium"}
            onHome={() => setScreen("home")}
            onRetry={() => setScreen("loading")}
          />
        )}
      </main>

      <TweaksPanel>
        <TweakSection label="Theme" />
        <TweakColor
          label="Palette"
          value={t.palette}
          options={PALETTES}
          onChange={(v) => setTweak("palette", v)}
        />

        <TweakSection label="Layout" />
        <TweakRadio
          label="Density"
          value={t.density}
          options={["compact", "regular", "cozy"]}
          onChange={(v) => setTweak("density", v)}
        />
        <TweakToggle
          label="Quiz sidebar"
          value={t.showSidebar}
          onChange={(v) => setTweak("showSidebar", v)}
        />

        <TweakSection label="Motion & feel" />
        <TweakRadio
          label="Motion"
          value={t.motion}
          options={["subtle", "standard", "expressive"]}
          onChange={(v) => setTweak("motion", v)}
        />
        <TweakToggle
          label="Celebrate results"
          value={t.celebrate}
          onChange={(v) => setTweak("celebrate", v)}
        />

        <TweakSection label="Jump to screen" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {["login", "home", "loading", "quiz", "results"].map((s) => (
            <button
              key={s}
              className="twk-field"
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "capitalize",
                background: screen === s ? "rgba(46,77,62,0.18)" : "rgba(255,255,255,0.6)",
                color: screen === s ? "#2E4D3E" : "inherit",
              }}
              onClick={() => {
                if (s === "loading" && !run) setRun({ pdfName: "Demo — Cell Biology.pdf", difficulty: "Medium" });
                if (s === "quiz" && !run) setRun({ pdfName: "Demo — Cell Biology.pdf", difficulty: "Medium" });
                if (s === "results" && !result) {
                  // mock a result for jumping
                  const mockHistory = Array.from({ length: 20 }, (_, i) => ({
                    tier: 1 + (i % 4),
                    correct: Math.random() > 0.3,
                    qIdx: i % 5,
                  }));
                  setResult({ history: mockHistory });
                  if (!run) setRun({ pdfName: "Demo — Cell Biology.pdf", difficulty: "Medium" });
                }
                setScreen(s);
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
