"""
app.py — AscendQuiz Streamlit reference implementation
-------------------------------------------------------
Shows how to integrate ascendquiz_styles.py with real Streamlit widgets.

Run:
    pip install streamlit
    streamlit run app.py

This file is intentionally self-contained (mock data, no Gemini calls) so
you can see exactly how the prototype's visual language maps to Streamlit.
Lift the patterns into your real app.py.
"""

import streamlit as st
import time
import random

from ascendquiz_styles import (
    inject_styles,
    wordmark,
    streak_pill,
    xp_chip,
    tier_badge,
    eyebrow,
    score_hero,
    question_eyebrow,
    question_text,
)


# ============================================================
# Page config + styles (always first)
# ============================================================
st.set_page_config(page_title="AscendQuiz", page_icon="📚", layout="centered")
inject_styles()


# ============================================================
# Mock data
# ============================================================
MOCK_USER = {"name": "Ashley", "streak": 7, "level": 12, "xp": 2340}
TIER_NAMES = {1: "Easy", 2: "Medium", 3: "Medium-Hard", 4: "Hard"}
MOCK_QUESTIONS = [
    {
        "tier": 1,
        "question": "Which organelle is primarily responsible for synthesizing ATP in eukaryotic cells?",
        "options": [
            "The nucleus, by housing and replicating genetic material.",
            "The mitochondrion, through oxidative phosphorylation.",
            "The Golgi apparatus, by packaging and modifying proteins.",
            "The lysosome, by breaking down cellular waste.",
        ],
        "correct": 1,
        "topic": "Cell Biology",
        "explanation": "Mitochondria generate the vast majority of cellular ATP via oxidative phosphorylation: the electron transport chain establishes a proton gradient, and ATP synthase uses it to phosphorylate ADP.",
    },
    {
        "tier": 2,
        "question": "A cell with an unusually dense rough endoplasmic reticulum is most likely specialized for:",
        "options": [
            "High-rate ATP production for muscle contraction.",
            "Lipid biosynthesis for steroid hormone release.",
            "Synthesis and export of secreted proteins.",
            "Intracellular waste degradation.",
        ],
        "correct": 2,
        "topic": "Cell Biology",
        "explanation": "Rough ER is studded with ribosomes that translate proteins destined for secretion. Dense rough ER is the hallmark of secretory cells like plasma cells or pancreatic acinar cells.",
    },
    {
        "tier": 3,
        "question": "If a cell's plasma membrane suddenly became impermeable to potassium ions, the most immediate consequence would be:",
        "options": [
            "A loss of the resting membrane potential.",
            "A sharp rise in intracellular sodium concentration.",
            "An immediate failure of all active transport mechanisms.",
            "Mechanical rupture of the plasma membrane.",
        ],
        "correct": 0,
        "topic": "Cell Biology",
        "explanation": "The resting membrane potential is set primarily by the cell's K+ permeability through leak channels. Removing it collapses the potential toward zero almost instantaneously.",
    },
]
QUIZ_LENGTH = 6  # short for demo
LETTERS = ["A", "B", "C", "D"]


# ============================================================
# Session state init
# ============================================================
def init_state():
    defaults = {
        "screen": "login",
        "user": None,
        "pdf_name": None,
        "difficulty": "Medium",
        "current_tier": 2,
        "q_index": 0,           # which mock question we're on
        "question_num": 1,      # 1-indexed display
        "correct_count": 0,
        "history": [],          # list of (tier, was_correct)
        "selected": None,
        "submitted": False,
    }
    for k, v in defaults.items():
        if k not in st.session_state:
            st.session_state[k] = v


init_state()


# ============================================================
# Topbar (used on every screen except login)
# ============================================================
def render_topbar():
    cols = st.columns([5, 2, 2, 1])
    with cols[0]:
        st.markdown(wordmark(), unsafe_allow_html=True)
    with cols[1]:
        st.markdown(streak_pill(MOCK_USER["streak"]), unsafe_allow_html=True)
    with cols[2]:
        st.markdown(xp_chip(MOCK_USER["level"], MOCK_USER["xp"]), unsafe_allow_html=True)
    with cols[3]:
        if st.button("Log out", key="logout"):
            for k in list(st.session_state.keys()):
                del st.session_state[k]
            st.rerun()
    st.markdown("---")


# ============================================================
# Screen: Login
# ============================================================
def screen_login():
    # Center the login card
    st.markdown("<div style='padding:60px 0 20px'></div>", unsafe_allow_html=True)
    st.markdown(
        f"<div style='text-align:center;margin-bottom:8px'>{wordmark()}</div>",
        unsafe_allow_html=True,
    )
    st.markdown(eyebrow("Welcome back"), unsafe_allow_html=True)
    st.markdown("## Pick up where you left off.")
    st.write(
        "Log in to see your streak, recent quizzes, and pick up your next study session."
    )

    username = st.text_input(
        "Username", value="Ashley", placeholder="your-username", label_visibility="collapsed"
    )

    if st.button("Continue", type="primary", use_container_width=True):
        if username.strip():
            st.session_state.user = username.strip()
            st.session_state.screen = "home"
            st.rerun()
        else:
            st.error("Please enter a username.")


# ============================================================
# Screen: Home (upload + difficulty)
# ============================================================
def screen_home():
    render_topbar()

    st.markdown(eyebrow("Today's session"), unsafe_allow_html=True)
    st.markdown(
        f"# Good evening, {st.session_state.user.split()[0]}."
    )
    st.markdown(
        "<p style='color:var(--ink-3);font-size:18px;margin-top:-8px'>"
        "Pick a reading and we'll build your next quiz."
        "</p>",
        unsafe_allow_html=True,
    )

    st.markdown("### Study material")
    pdf = st.file_uploader(
        "Upload PDF",
        type=["pdf"],
        label_visibility="collapsed",
        help="Lecture notes, textbook chapters, papers — up to 20 MB.",
    )

    st.markdown("### Difficulty mode")

    # Difficulty as 3 styled HTML cards + 3 real buttons underneath
    diff_descriptions = {
        "Easy": "Warm up with mostly recall questions.",
        "Medium": "Balanced range across all four tiers.",
        "Hard": "Front-loaded with synthesis and analysis.",
    }
    pool_dists = {"Easy": [12, 10, 6, 2], "Medium": [8, 7, 8, 7], "Hard": [2, 6, 10, 12]}

    diff_cols = st.columns(3)
    for i, (d, desc) in enumerate(diff_descriptions.items()):
        with diff_cols[i]:
            selected = st.session_state.difficulty == d
            border_color = "var(--forest)" if selected else "var(--line)"
            bg = "var(--forest-tint)" if selected else "var(--surface)"
            bars = "".join(
                f'<span style="flex:1;background:{"var(--forest)" if selected else "var(--line-2)"};'
                f'border-radius:2px;height:{(n/12)*100}%"></span>'
                for n in pool_dists[d]
            )
            st.markdown(
                f"""
                <div style='background:{bg};border:1px solid {border_color};
                            border-radius:14px;padding:16px;margin-bottom:8px;
                            {"box-shadow: 0 0 0 1px var(--forest)" if selected else ""}'>
                  <div style='font-weight:600;font-size:15px;color:var(--ink)'>{d}</div>
                  <div style='font-size:12px;color:var(--ink-3);margin-top:4px'>{desc}</div>
                  <div style='margin-top:12px;display:flex;align-items:flex-end;
                              gap:3px;height:28px'>{bars}</div>
                </div>
                """,
                unsafe_allow_html=True,
            )
            if st.button(
                "Selected" if selected else "Select",
                key=f"diff-{d}",
                use_container_width=True,
                disabled=selected,
            ):
                st.session_state.difficulty = d
                st.rerun()

    st.write("")  # spacer

    gen_col, demo_col = st.columns([3, 1])
    with gen_col:
        if st.button(
            "Generate quiz",
            type="primary",
            use_container_width=True,
            disabled=pdf is None,
        ):
            st.session_state.pdf_name = pdf.name if pdf else "Demo — Cell Biology.pdf"
            st.session_state.screen = "loading"
            st.rerun()
    with demo_col:
        if st.button("Try demo", use_container_width=True):
            st.session_state.pdf_name = "Demo — Cell Biology.pdf"
            st.session_state.screen = "loading"
            st.rerun()


# ============================================================
# Screen: Loading
# ============================================================
def screen_loading():
    render_topbar()

    st.markdown(eyebrow("Building your quiz"), unsafe_allow_html=True)
    st.markdown(
        "<h2 style='font-style:italic'>Drafting questions across four difficulty tiers…</h2>",
        unsafe_allow_html=True,
    )
    st.markdown(
        "<p style='color:var(--ink-3)'>"
        "We're generating four pools in parallel — easy through hard — then the adaptive engine "
        "will pick the right questions for you as you go."
        "</p>",
        unsafe_allow_html=True,
    )

    # Streamlit doesn't easily run CSS animations alongside a top-to-bottom script,
    # so we fake it with a progress bar + status text. In your real app, replace
    # this with your actual generate_question_pool() call inside a spinner.
    progress = st.progress(0)
    status = st.empty()

    steps = [
        (15, "Reading your PDF…"),
        (35, "Drafting easy questions…"),
        (60, "Drafting medium questions…"),
        (85, "Drafting hard questions…"),
        (100, "Shuffling the pool — almost ready."),
    ]
    for pct, label in steps:
        status.markdown(
            f"<div style='font-family:var(--mono);font-size:13px;"
            f"color:var(--ink-3)'>{label}</div>",
            unsafe_allow_html=True,
        )
        progress.progress(pct)
        time.sleep(0.55)

    # Reset quiz state
    st.session_state.current_tier = (
        1 if st.session_state.difficulty == "Easy"
        else 3 if st.session_state.difficulty == "Hard"
        else 2
    )
    st.session_state.q_index = 0
    st.session_state.question_num = 1
    st.session_state.correct_count = 0
    st.session_state.history = []
    st.session_state.selected = None
    st.session_state.submitted = False
    st.session_state.screen = "quiz"
    st.rerun()


# ============================================================
# Screen: Quiz
# ============================================================
def pick_question(tier: int) -> dict:
    """Pick a mock question close to the current tier."""
    same = [q for q in MOCK_QUESTIONS if q["tier"] == tier]
    if same:
        return random.choice(same)
    return random.choice(MOCK_QUESTIONS)


def screen_quiz():
    render_topbar()

    # Lazily set the current question if not picked yet for this slot
    if "current_q" not in st.session_state or st.session_state.get("current_q_for") != st.session_state.question_num:
        st.session_state.current_q = pick_question(st.session_state.current_tier)
        st.session_state.current_q_for = st.session_state.question_num

    q = st.session_state.current_q

    # Question header — custom HTML for the rich layout
    st.markdown(
        question_eyebrow(
            st.session_state.question_num,
            QUIZ_LENGTH,
            st.session_state.correct_count,
            st.session_state.current_tier,
        ),
        unsafe_allow_html=True,
    )

    # Progress bar
    st.progress((st.session_state.question_num - 1) / QUIZ_LENGTH)

    st.write("")

    # Question card — wrap in our card class via st.container + markdown trick
    st.markdown('<div class="aq-card">', unsafe_allow_html=True)

    # Topic + tier eyebrow
    st.markdown(
        f"<div style='display:flex;gap:10px;margin-bottom:14px'>"
        f"{eyebrow(q['topic'])}"
        f"<span style='color:var(--ink-4)'>·</span>"
        f"{eyebrow(TIER_NAMES[q['tier']])}"
        f"</div>",
        unsafe_allow_html=True,
    )

    st.markdown(question_text(q["question"]), unsafe_allow_html=True)
    st.write("")

    # Options — styled radio
    if not st.session_state.submitted:
        choice = st.radio(
            "Choose your answer",
            options=range(4),
            format_func=lambda i: f"{LETTERS[i]}.  {q['options'][i]}",
            index=st.session_state.selected if st.session_state.selected is not None else None,
            label_visibility="collapsed",
            key=f"opt-{st.session_state.question_num}",
        )
        st.session_state.selected = choice

        st.markdown('</div>', unsafe_allow_html=True)  # close card

        st.write("")
        cols = st.columns([4, 2])
        with cols[0]:
            st.markdown(
                "<div style='color:var(--ink-3);font-size:13px;padding-top:10px'>"
                + ("Lock it in — no going back after submit." if choice is not None
                   else "Choose one of A–D to continue.")
                + "</div>",
                unsafe_allow_html=True,
            )
        with cols[1]:
            if st.button("Submit answer", type="primary", use_container_width=True,
                         disabled=choice is None):
                was_correct = choice == q["correct"]
                st.session_state.submitted = True
                st.session_state.history.append((q["tier"], was_correct))
                if was_correct:
                    st.session_state.correct_count += 1
                st.rerun()

    else:
        # Show options with answer state styling (read-only)
        for i, opt in enumerate(q["options"]):
            is_correct = i == q["correct"]
            is_selected = i == st.session_state.selected
            if is_correct:
                bg, border, text_color = "var(--ok-soft, #DCE7D7)", "var(--ok)", "var(--ok)"
                mark = "✓"
            elif is_selected:
                bg, border, text_color = "var(--err-soft, #F1D5CD)", "var(--err)", "var(--err)"
                mark = "✕"
            else:
                bg, border, text_color, mark = "var(--surface)", "var(--line)", "var(--ink-3)", ""
            st.markdown(
                f"<div style='display:flex;align-items:center;gap:14px;padding:14px 16px;"
                f"background:{bg};border:1px solid {border};border-radius:14px;"
                f"margin-bottom:8px;color:var(--ink)'>"
                f"<span style='width:28px;height:28px;border-radius:8px;background:{border};"
                f"color:#fff;display:inline-flex;align-items:center;justify-content:center;"
                f"font-weight:700;font-size:12px;font-family:monospace;flex-shrink:0'>"
                f"{LETTERS[i]}</span>"
                f"<span style='flex:1;font-size:15px'>{opt}</span>"
                f"<span style='color:{text_color};font-size:18px'>{mark}</span>"
                f"</div>",
                unsafe_allow_html=True,
            )

        st.markdown('</div>', unsafe_allow_html=True)  # close card

        # Feedback banner
        was_correct = st.session_state.history[-1][1]
        if was_correct:
            st.success("✓ Correct.  +15 XP")
        else:
            st.error(f"✕ Not quite — the answer was {LETTERS[q['correct']]}.  +3 XP for trying")

        # Explanation
        st.markdown(
            f"<div style='background:var(--surface-2);border:1px solid var(--line);"
            f"border-radius:14px;padding:16px 18px;margin-top:10px'>"
            f"<div style='font-size:11px;font-weight:700;letter-spacing:0.12em;"
            f"text-transform:uppercase;color:var(--ink-3);margin-bottom:8px'>"
            f"Why {LETTERS[q['correct']]} is right</div>"
            f"<div style='line-height:1.55;color:var(--ink)'>{q['explanation']}</div>"
            f"</div>",
            unsafe_allow_html=True,
        )

        st.write("")
        cols = st.columns([4, 2])
        with cols[1]:
            label = "See results →" if st.session_state.question_num >= QUIZ_LENGTH else "Next question →"
            if st.button(label, type="primary", use_container_width=True):
                if st.session_state.question_num >= QUIZ_LENGTH:
                    st.session_state.screen = "results"
                else:
                    # Adaptive: up if correct, down if wrong
                    if was_correct:
                        st.session_state.current_tier = min(4, st.session_state.current_tier + 1)
                    else:
                        st.session_state.current_tier = max(1, st.session_state.current_tier - 1)
                    st.session_state.question_num += 1
                    st.session_state.selected = None
                    st.session_state.submitted = False
                st.rerun()


# ============================================================
# Screen: Results
# ============================================================
def screen_results():
    render_topbar()

    correct = st.session_state.correct_count
    total = len(st.session_state.history) or QUIZ_LENGTH

    st.markdown(score_hero(correct, total), unsafe_allow_html=True)

    st.write("")

    # Stat grid
    pct = round(correct / total * 100) if total else 0
    highest_tier = max((t for t, c in st.session_state.history if c), default=1)
    streak_bonus = pct >= 70

    s1, s2, s3 = st.columns(3)
    for col, (label, val, sub) in zip(
        [s1, s2, s3],
        [
            ("Highest tier reached", TIER_NAMES[highest_tier], "Synthesis-level questions." if highest_tier == 4 else "Keep climbing."),
            ("Avg time / question", "42s", "A little quicker than your average."),
            ("Streak",
             f"{MOCK_USER['streak'] + (1 if streak_bonus else 0)} days",
             "Extended today — nice." if streak_bonus else "Score 70%+ to extend."),
        ],
    ):
        with col:
            st.markdown(
                f"<div style='background:var(--surface);border:1px solid var(--line);"
                f"border-radius:14px;padding:18px'>"
                f"<div style='font-size:11px;text-transform:uppercase;letter-spacing:0.1em;"
                f"font-weight:600;color:var(--ink-3);margin-bottom:8px'>{label}</div>"
                f"<div style='font-family:var(--serif);font-weight:500;font-size:28px;"
                f"color:var(--ink);letter-spacing:-0.02em;line-height:1'>{val}</div>"
                f"<div style='margin-top:6px;font-size:12px;color:var(--ink-3)'>{sub}</div>"
                f"</div>",
                unsafe_allow_html=True,
            )

    st.write("")

    # Tier breakdown
    st.markdown("### Performance by tier")
    for tier in range(1, 5):
        items = [c for t, c in st.session_state.history if t == tier]
        ok = sum(items)
        tot = len(items)
        pct_row = round((ok / tot) * 100) if tot else 0

        col1, col2, col3 = st.columns([2, 5, 1])
        with col1:
            st.markdown(tier_badge(tier), unsafe_allow_html=True)
        with col2:
            bar_color = "var(--amber)" if pct_row < 60 and tot > 0 else "var(--forest)"
            st.markdown(
                f"<div style='height:8px;background:var(--line);border-radius:999px;"
                f"overflow:hidden;margin-top:10px'>"
                f"<div style='width:{pct_row if tot else 0}%;height:100%;"
                f"background:{bar_color};border-radius:999px'></div>"
                f"</div>",
                unsafe_allow_html=True,
            )
        with col3:
            st.markdown(
                f"<div style='font-family:monospace;font-size:12px;color:var(--ink-2);"
                f"text-align:right;padding-top:6px'>{ok}/{tot}</div>",
                unsafe_allow_html=True,
            )

    st.write("")
    c1, c2 = st.columns(2)
    with c1:
        if st.button("Back to home", type="primary", use_container_width=True):
            st.session_state.screen = "home"
            st.rerun()
    with c2:
        if st.button("Retry same PDF", use_container_width=True):
            st.session_state.screen = "loading"
            st.rerun()


# ============================================================
# Router
# ============================================================
SCREENS = {
    "login": screen_login,
    "home": screen_home,
    "loading": screen_loading,
    "quiz": screen_quiz,
    "results": screen_results,
}
SCREENS[st.session_state.screen]()
