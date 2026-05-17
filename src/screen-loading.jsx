// src/screen-loading.jsx
//
// Simulates parallel tier generation — 4 columns of tiles filling up
// (the real app does 4 parallel API calls, one per tier).

function ScreenLoading({ difficulty, onDone }) {
  const dist = POOL_DISTS[difficulty] || POOL_DISTS.Medium;
  const [progress, setProgress] = React.useState([0, 0, 0, 0]); // tiles filled per tier
  const [phase, setPhase] = React.useState("extracting"); // extracting → generating → finalizing → done

  React.useEffect(() => {
    let t1 = setTimeout(() => setPhase("generating"), 900);
    return () => clearTimeout(t1);
  }, []);

  React.useEffect(() => {
    if (phase !== "generating") return;
    // tiers fill at slightly different paces
    const rates = [120, 150, 180, 200]; // ms per tile
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
  }, [phase, dist]);

  React.useEffect(() => {
    if (progress.every((p, i) => p >= dist[i])) {
      const t = setTimeout(() => setPhase("finalizing"), 350);
      const t2 = setTimeout(() => onDone(), 1100);
      return () => { clearTimeout(t); clearTimeout(t2); };
    }
  }, [progress, dist, onDone]);

  const statusText = {
    extracting: "Reading your PDF…",
    generating: "Drafting questions across four difficulty tiers…",
    finalizing: "Shuffling the pool — almost ready.",
  }[phase];

  return (
    <div className="container-narrow screen-enter">
      <div className="gen-wrap">
        <div className="stack stack-3" style={{ alignItems: "center" }}>
          <span className="eyebrow">Building your quiz</span>
          <div className="gen-status">{statusText}</div>
          <div className="gen-sub">
            We're generating four pools in parallel — easy through hard — then the adaptive engine
            will pick the right questions for you as you go.
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

window.ScreenLoading = ScreenLoading;
