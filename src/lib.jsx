// src/lib.jsx — shared atoms

// ------------------------------------------------
// Wordmark
// ------------------------------------------------
function Wordmark({ size = 22 }) {
  return (
    <span className="wordmark" style={{ fontSize: size }}>
      <span className="a">Ascend</span>
      <span className="b">Quiz</span>
      <span className="dot" />
    </span>
  );
}

// ------------------------------------------------
// Tier badge — shows current adaptive difficulty as ascending rungs
// ------------------------------------------------
const TIER_LABELS = ["Easy", "Medium", "Medium-Hard", "Hard"];

function TierBadge({ tier = 1, label = true, warm = false }) {
  // tier: 1..4
  return (
    <span className="tier-badge" title={`Difficulty: ${TIER_LABELS[tier - 1]}`}>
      <span className="tier-rungs" aria-hidden>
        {[1, 2, 3, 4].map((r) => (
          <span
            key={r}
            className={[
              "tier-rung",
              `r${r}`,
              r <= tier ? "on" : "",
              warm && r === tier ? "warm" : "",
            ].filter(Boolean).join(" ")}
          />
        ))}
      </span>
      {label && <span>{TIER_LABELS[tier - 1]}</span>}
    </span>
  );
}

// ------------------------------------------------
// Streak pill + XP chip
// ------------------------------------------------
function StreakPill({ days = 7 }) {
  return (
    <span className="streak" title={`${days}-day study streak`}>
      <span className="streak-flame" aria-hidden />
      {days}-day streak
    </span>
  );
}

function XPChip({ xp = 2340, level }) {
  return (
    <span className="xp-chip" title={`Level ${level}`}>
      <span className="xp-dot" />
      Lv {level} · {xp.toLocaleString()} XP
    </span>
  );
}

// ------------------------------------------------
// Topbar
// ------------------------------------------------
function Topbar({ user, streak, level, xp, onLogout, onHome }) {
  return (
    <header className="app-topbar">
      <div className="row row-gap-3" style={{ alignItems: "center" }}>
        <button
          className="btn btn-quiet"
          onClick={onHome}
          style={{ padding: 0, background: "transparent" }}
        >
          <Wordmark size={20} />
        </button>
      </div>
      <div className="row row-gap-2">
        <StreakPill days={streak} />
        <XPChip xp={xp} level={level} />
        <div style={{ width: 8 }} />
        <div
          className="row row-gap-2"
          style={{
            padding: "6px 12px 6px 6px",
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 999,
          }}
          title={user}
        >
          <span
            style={{
              width: 26, height: 26, borderRadius: "50%",
              background: "var(--forest)", color: "#F5EFE2",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 12,
              fontFamily: "var(--serif)",
            }}
          >
            {user?.[0]?.toUpperCase() || "·"}
          </span>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{user}</span>
        </div>
        <button className="btn btn-quiet btn-sm" onClick={onLogout}>Log out</button>
      </div>
    </header>
  );
}

// ------------------------------------------------
// Tier ladder (sidebar visualization for quiz)
// ------------------------------------------------
function TierLadder({ activeTier, pool }) {
  // pool: { 1: [...], 2: [...], 3: [...], 4: [...] } — array of "asked or not" or just counts
  return (
    <div className="tier-ladder">
      {[1, 2, 3, 4].map((t) => {
        const counts = pool[t] || { remaining: 0, total: 0 };
        return (
          <div
            key={t}
            className={"tier-step " + (t === activeTier ? "active" : "")}
          >
            <span className="dot" />
            <span>{TIER_LABELS[t - 1]}</span>
            <span className="count">
              {counts.remaining}/{counts.total}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ------------------------------------------------
// Difficulty selector cards
// ------------------------------------------------
const POOL_DISTS = {
  Easy:   [12, 10, 6, 2],
  Medium: [8, 7, 8, 7],
  Hard:   [2, 6, 10, 12],
};
const DIFF_DESCRIPTIONS = {
  Easy: "Warm up with mostly recall questions.",
  Medium: "Balanced range across all four tiers.",
  Hard: "Front-loaded with synthesis and analysis.",
};

function DifficultyPicker({ value, onChange }) {
  return (
    <div className="diff-grid">
      {["Easy", "Medium", "Hard"].map((d) => (
        <button
          key={d}
          type="button"
          className={"diff-card " + (value === d ? "on" : "")}
          onClick={() => onChange(d)}
        >
          <div className="name">{d}</div>
          <div className="meta">{DIFF_DESCRIPTIONS[d]}</div>
          <div className="dist" aria-hidden>
            {POOL_DISTS[d].map((n, i) => (
              <span key={i} style={{ height: `${(n / 12) * 100}%` }} />
            ))}
          </div>
        </button>
      ))}
    </div>
  );
}

// ------------------------------------------------
// Empty/placeholder file thumb row
// ------------------------------------------------
function RecentRow({ name, sub, score, onClick }) {
  return (
    <button type="button" className="recent-row" onClick={onClick}>
      <div className="recent-thumb" aria-hidden />
      <div className="recent-meta">
        <div className="recent-name">{name}</div>
        <div className="recent-sub">{sub}</div>
      </div>
      {score != null && (
        <div
          style={{
            fontFamily: "var(--serif)",
            fontStyle: "italic",
            fontSize: 18,
            color: "var(--forest)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {score}%
        </div>
      )}
    </button>
  );
}

// ------------------------------------------------
// Confetti-lite ticks (used on results)
// ------------------------------------------------
function CelebrateTicks({ count = 18 }) {
  const ticks = React.useMemo(() => {
    const colors = ["#E08B3C", "#2E4D3E", "#C8A24A", "#B0523C"];
    return Array.from({ length: count }, (_, i) => ({
      left: `${5 + Math.random() * 90}%`,
      top: `${Math.random() * 40}%`,
      bg: colors[i % colors.length],
      rot: `${Math.random() * 120 - 60}deg`,
      delay: `${Math.random() * 600}ms`,
    }));
  }, [count]);
  return (
    <div className="celebrate-ticks" aria-hidden>
      {ticks.map((t, i) => (
        <span
          key={i}
          style={{
            left: t.left,
            top: t.top,
            background: t.bg,
            "--rot": t.rot,
            animationDelay: t.delay,
          }}
        />
      ))}
    </div>
  );
}

// ------------------------------------------------
// Mock data
// ------------------------------------------------
const MOCK_QUESTIONS = [
  // Tier 1 — Easy (recall)
  {
    tier: 1,
    question:
      "Which organelle is primarily responsible for synthesizing ATP in eukaryotic cells?",
    options: [
      "The nucleus, by housing and replicating genetic material.",
      "The mitochondrion, through oxidative phosphorylation.",
      "The Golgi apparatus, by packaging and modifying proteins.",
      "The lysosome, by breaking down cellular waste.",
    ],
    correct: 1,
    topic: "Cell Biology",
    explanation:
      "Mitochondria generate the vast majority of cellular ATP via oxidative phosphorylation: the electron transport chain establishes a proton gradient across the inner membrane, and ATP synthase uses that gradient to phosphorylate ADP.",
    wrongs: {
      0: "The nucleus stores DNA and coordinates gene expression, but it does not synthesize ATP.",
      2: "The Golgi modifies, sorts, and packages proteins for secretion — it consumes ATP rather than producing it.",
      3: "Lysosomes digest cellular waste with hydrolytic enzymes; they don't generate ATP.",
    },
  },
  // Tier 2 — Medium (inference)
  {
    tier: 2,
    question:
      "A cell with an unusually dense rough endoplasmic reticulum is most likely specialized for which activity?",
    options: [
      "High-rate ATP production for muscle contraction.",
      "Lipid biosynthesis for steroid hormone release.",
      "Synthesis and export of secreted proteins.",
      "Intracellular waste degradation.",
    ],
    correct: 2,
    topic: "Cell Biology",
    explanation:
      "Rough ER is studded with ribosomes that translate proteins destined for secretion or the membrane. A high density of rough ER is a hallmark of secretory cells — for example, plasma cells producing antibodies or pancreatic acinar cells producing digestive enzymes.",
    wrongs: {
      0: "ATP-intensive cells are recognized by abundant mitochondria, not by extensive rough ER.",
      1: "Lipid and steroid synthesis is associated with smooth ER, which lacks ribosomes.",
      3: "Waste degradation is the role of lysosomes and the autophagy system, not the rough ER.",
    },
  },
  // Tier 3 — Medium-Hard (application)
  {
    tier: 3,
    question:
      "If a cell's plasma membrane suddenly became impermeable to potassium ions, the most immediate consequence would be:",
    options: [
      "A loss of the resting membrane potential.",
      "A sharp rise in intracellular sodium concentration.",
      "An immediate failure of all active transport mechanisms.",
      "Mechanical rupture of the plasma membrane.",
    ],
    correct: 0,
    topic: "Cell Biology",
    explanation:
      "The resting membrane potential is set primarily by the cell's selective permeability to K+ through leak channels. Removing that K+ permeability eliminates the dominant ion contribution, so the potential collapses toward zero almost instantaneously.",
    wrongs: {
      1: "Intracellular sodium does drift up over time, but that's a downstream consequence, not the most immediate effect.",
      2: "Active transport relies on ATP, not on K+ flux per se — pumps would continue running until ATP is depleted.",
      3: "Loss of K+ permeability changes voltage, not membrane integrity. Rupture would require an osmotic event.",
    },
  },
  // Tier 4 — Hard (synthesis)
  {
    tier: 4,
    question:
      "A researcher applies an uncoupler that collapses the proton gradient across the inner mitochondrial membrane. Which downstream effect would be observed first?",
    options: [
      "Halting of the citric acid cycle due to substrate exhaustion.",
      "Failure of ATP synthase to phosphorylate ADP.",
      "Cessation of NADH production by glycolysis.",
      "Permeabilization of the outer mitochondrial membrane.",
    ],
    correct: 1,
    topic: "Cell Biology",
    explanation:
      "ATP synthase depends directly on the electrochemical gradient as the driving force for ADP phosphorylation. Collapse the gradient and ATP production halts at once — every other listed effect is downstream of that failure and unfolds on a longer timescale.",
    wrongs: {
      0: "The TCA cycle slows only after NADH backs up and inhibits its dehydrogenases — that takes time.",
      2: "Glycolysis occurs in the cytosol and is largely independent of the mitochondrial gradient in the short term.",
      3: "Outer-membrane permeabilization is associated with apoptosis, not the immediate response to uncoupling.",
    },
  },
  // Tier 2 — Medium
  {
    tier: 2,
    question:
      "Tight junctions between epithelial cells primarily function to:",
    options: [
      "Anchor cells to the underlying extracellular matrix.",
      "Allow direct cytoplasmic communication between cells.",
      "Seal the paracellular space and prevent molecular leakage.",
      "Provide mechanical strength against shearing forces.",
    ],
    correct: 2,
    topic: "Cell Biology",
    explanation:
      "Tight junctions form a continuous belt around the apical surface of epithelial cells, sealing the space between them. This makes the epithelium a selective barrier — for example, keeping stomach acid out of underlying tissues.",
    wrongs: {
      0: "Anchoring to the matrix is the job of hemidesmosomes and focal adhesions.",
      1: "Cytoplasmic communication occurs through gap junctions, which form aqueous channels between cells.",
      3: "Mechanical strength against shear is provided primarily by desmosomes.",
    },
  },
];

const MOCK_RECENT = [
  { name: "Cell Biology — Chapter 7.pdf", sub: "Yesterday · 18 questions", score: 85 },
  { name: "Algorithms — Lecture 4 Graphs.pdf", sub: "3 days ago · 20 questions", score: 70 },
  { name: "Linear Algebra — Eigenvectors.pdf", sub: "Last week · 20 questions", score: 95 },
];

const MOCK_USER = {
  name: "Ashley",
  streak: 7,
  level: 12,
  xp: 2340,
};

// ------------------------------------------------
// Export
// ------------------------------------------------
Object.assign(window, {
  Wordmark,
  TierBadge,
  StreakPill,
  XPChip,
  Topbar,
  TierLadder,
  DifficultyPicker,
  RecentRow,
  CelebrateTicks,
  TIER_LABELS,
  POOL_DISTS,
  MOCK_QUESTIONS,
  MOCK_RECENT,
  MOCK_USER,
});
