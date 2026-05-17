// src/screen-home.jsx
function ScreenHome({ onStart, recent }) {
  const [diff, setDiff] = React.useState("Medium");
  const [pdfName, setPdfName] = React.useState("");
  const fileInputRef = React.useRef(null);

  const onPickFile = (f) => {
    if (f) setPdfName(f.name);
  };

  return (
    <div className="container screen-enter stack stack-6">
      {/* Hero */}
      <div className="stack stack-3">
        <span className="eyebrow">Today's session</span>
        <h1 className="h1">
          Good evening, {MOCK_USER.name.split(" ")[0]}.<br />
          <span style={{ color: "var(--ink-3)" }}>
            Pick a reading and we'll build your next quiz.
          </span>
        </h1>
      </div>

      {/* Upload */}
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
            onPickFile(e.dataTransfer?.files?.[0]);
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            style={{ display: "none" }}
            onChange={(e) => onPickFile(e.target.files?.[0])}
          />
          <div className="dropzone-icon" aria-hidden />
          {pdfName ? (
            <>
              <div style={{ fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
                {pdfName}
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-3)" }}>
                Ready. Click <b>Generate</b> below — or{" "}
                <span
                  style={{ textDecoration: "underline", cursor: "pointer", color: "var(--forest)" }}
                  onClick={(e) => { e.preventDefault(); fileInputRef.current?.click(); }}
                >
                  swap file
                </span>
                .
              </div>
            </>
          ) : (
            <>
              <div style={{ fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
                Drop a PDF here, or{" "}
                <span style={{ color: "var(--forest)", textDecoration: "underline" }}>
                  browse
                </span>
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-3)" }}>
                Lecture notes, textbook chapters, papers — anything you'd want to be quizzed on.
              </div>
            </>
          )}
        </label>
      </div>

      {/* Difficulty */}
      <div className="stack stack-4">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
          <h3 className="h3">Difficulty mode</h3>
          <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
            Affects starting tier & question mix
          </span>
        </div>
        <DifficultyPicker value={diff} onChange={setDiff} />
      </div>

      {/* CTA */}
      <div className="row row-gap-3" style={{ alignItems: "stretch" }}>
        <button
          className="btn btn-primary btn-lg"
          disabled={!pdfName}
          onClick={() => onStart({ pdfName, difficulty: diff })}
          style={{ flex: 1 }}
        >
          Generate quiz
          <span
            style={{
              fontFamily: "var(--mono)", fontSize: 12, opacity: 0.7, marginLeft: 4,
              fontWeight: 500,
            }}
          >
            ⏎
          </span>
        </button>
        <button
          className="btn btn-ghost btn-lg"
          onClick={() => onStart({ pdfName: "Demo — Cell Biology.pdf", difficulty: diff, demo: true })}
        >
          Try a demo
        </button>
      </div>

      <hr className="divider" />

      {/* Recent + Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr",
          gap: 24,
        }}
      >
        <div className="stack stack-4">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
            <h3 className="h3">Recent quizzes</h3>
            <button className="btn btn-quiet btn-sm">View all</button>
          </div>
          <div className="recent-list">
            {recent.map((r, i) => (
              <RecentRow
                key={i}
                name={r.name}
                sub={r.sub}
                score={r.score}
                onClick={() => onStart({ pdfName: r.name, difficulty: "Medium" })}
              />
            ))}
          </div>
        </div>

        <div className="card card-pad stack stack-3">
          <span className="eyebrow">This week</span>
          <div
            style={{
              fontFamily: "var(--serif)",
              fontSize: 44, fontWeight: 500, lineHeight: 1,
              color: "var(--ink)", letterSpacing: "-0.02em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            +180 <span style={{ fontSize: 16, color: "var(--ink-3)", fontStyle: "italic" }}>XP</span>
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-2)" }}>
            4 quizzes · 78% average accuracy
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
              <span className="tabular">Lv 12 · 240 / 500</span>
            </div>
            <div className="quiz-progress" style={{ marginBottom: 0 }}>
              <div className="quiz-progress-fill" style={{ width: "48%" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.ScreenHome = ScreenHome;
