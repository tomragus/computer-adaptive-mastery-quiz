"""
ascendquiz_styles.py
--------------------
Drop-in styling module for the Streamlit AscendQuiz app.

Usage in your app.py:

    from ascendquiz_styles import inject_styles, wordmark, streak_pill, xp_chip, tier_badge

    st.set_page_config(page_title="AscendQuiz", layout="centered")
    inject_styles()

Then sprinkle the helper functions wherever you'd normally use st.markdown.
"""

import streamlit as st


# ============================================================
# 1. The big CSS injection
# ============================================================
# We do this once at app start. It does three things:
#  (a) loads Google Fonts (Manrope + Newsreader)
#  (b) defines our design tokens as CSS custom properties on :root
#  (c) restyles Streamlit's built-in widgets to match
#
# Selectors prefixed with [data-testid=...] target Streamlit's
# stable internal IDs. They're more reliable than class names,
# which change between Streamlit versions.

_CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500&display=swap');

:root {
  --bg:           #FBF7EF;
  --bg-2:         #F5EFE2;
  --surface:      #FFFDF7;
  --surface-2:    #FAF5E8;
  --line:         #E8DFCB;
  --line-2:       #D6C9AC;
  --ink:          #1C1F1B;
  --ink-2:        #4F5A4C;
  --ink-3:        #7E867A;
  --forest:       #2E4D3E;
  --forest-2:     #244038;
  --forest-soft:  #DDE6DC;
  --forest-tint:  #ECF1E9;
  --amber:        #E08B3C;
  --amber-2:      #C9762C;
  --amber-soft:   #F7E4C5;
  --amber-tint:   #FBF1DD;
  --ok:           #4F7A52;
  --err:          #B5453A;
  --sans: 'Manrope', ui-sans-serif, system-ui, sans-serif;
  --serif: 'Newsreader', Georgia, serif;
}

/* App background + font */
html, body, [data-testid="stAppViewContainer"], .stApp {
  background: var(--bg) !important;
  color: var(--ink);
  font-family: var(--sans);
}

/* Headings — use serif italic for that library feel */
h1, h2, h3 {
  font-family: var(--serif) !important;
  font-weight: 500 !important;
  letter-spacing: -0.015em;
  color: var(--ink) !important;
}
h1 { font-size: 38px !important; line-height: 1.1 !important; }
h2 { font-size: 26px !important; }
h3 { font-size: 18px !important; }

/* Hide Streamlit chrome (optional — uncomment if you want a cleaner look) */
/* #MainMenu, footer, header { visibility: hidden; } */

/* ----- Buttons ----- */
.stButton > button, .stDownloadButton > button {
  font-family: var(--sans) !important;
  font-weight: 600 !important;
  border-radius: 14px !important;
  padding: 12px 18px !important;
  border: 1px solid var(--line-2) !important;
  background: var(--surface) !important;
  color: var(--ink-2) !important;
  transition: all 200ms ease !important;
  box-shadow: 0 1px 0 rgba(31,28,18,0.04), 0 1px 2px rgba(31,28,18,0.05) !important;
}
.stButton > button:hover {
  border-color: var(--ink-3) !important;
  color: var(--ink) !important;
  background: var(--surface-2) !important;
}
.stButton > button[kind="primary"] {
  background: var(--forest) !important;
  color: #F5EFE2 !important;
  border-color: var(--forest) !important;
}
.stButton > button[kind="primary"]:hover {
  background: var(--forest-2) !important;
}

/* ----- Text inputs ----- */
.stTextInput input, .stTextArea textarea {
  background: var(--surface) !important;
  border: 1px solid var(--line-2) !important;
  border-radius: 14px !important;
  padding: 13px 14px !important;
  color: var(--ink) !important;
  font-family: var(--sans) !important;
}
.stTextInput input:focus, .stTextArea textarea:focus {
  border-color: var(--forest) !important;
  box-shadow: 0 0 0 3px rgba(46,77,62,0.12) !important;
}

/* ----- File uploader ----- */
[data-testid="stFileUploader"] section {
  background: var(--surface) !important;
  border: 1.5px dashed var(--line-2) !important;
  border-radius: 20px !important;
  padding: 28px 20px !important;
  transition: all 200ms ease !important;
}
[data-testid="stFileUploader"] section:hover {
  border-color: var(--forest) !important;
  background: var(--forest-tint) !important;
}
[data-testid="stFileUploader"] button {
  background: var(--forest) !important;
  color: #F5EFE2 !important;
  border: 0 !important;
}

/* ----- Radio (used for difficulty + answer options) ----- */
[data-testid="stRadio"] label[data-baseweb="radio"] {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 14px 16px;
  margin-bottom: 10px !important;
  transition: all 200ms ease;
}
[data-testid="stRadio"] label[data-baseweb="radio"]:hover {
  border-color: var(--line-2);
  background: var(--surface-2);
}

/* ----- Progress bar ----- */
.stProgress > div > div > div {
  background: linear-gradient(90deg, var(--forest), var(--amber)) !important;
  border-radius: 999px !important;
}
.stProgress > div > div {
  background: var(--line) !important;
  border-radius: 999px !important;
}

/* ----- Alerts (success / error / info) ----- */
.stAlert {
  border-radius: 14px !important;
  border: 1px solid var(--line) !important;
  font-family: var(--sans) !important;
}

/* ----- Dividers ----- */
hr {
  border-color: var(--line) !important;
  margin: 24px 0 !important;
}

/* ----- Custom component classes (used by helpers below) ----- */
.aq-wordmark {
  display: inline-flex; align-items: baseline; gap: 2px;
  font-weight: 600; line-height: 1; font-size: 32px;
}
.aq-wordmark .a {
  font-family: var(--serif); font-style: italic; font-weight: 500;
  font-size: 1.15em; color: var(--forest);
}
.aq-wordmark .b { color: var(--ink); }
.aq-wordmark .dot {
  width: 0.32em; height: 0.32em; background: var(--amber);
  border-radius: 50%; margin-left: 0.18em; display: inline-block;
  transform: translateY(-0.1em);
}
.aq-streak {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 6px 12px 6px 8px; border-radius: 999px;
  background: var(--amber-tint); border: 1px solid var(--amber-soft);
  color: var(--amber-2); font-weight: 600; font-size: 13px;
}
.aq-streak .flame {
  width: 14px; height: 14px; border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #F8C475, var(--amber-2));
}
.aq-xp {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 6px 12px; border-radius: 999px;
  background: var(--forest-tint); border: 1px solid var(--forest-soft);
  color: var(--forest); font-weight: 600; font-size: 13px;
}
.aq-xp .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--forest); }
.aq-tier {
  display: inline-flex; align-items: center; gap: 10px;
  padding: 6px 12px 6px 8px; border-radius: 999px;
  background: var(--surface); border: 1px solid var(--line);
  font-size: 12px; font-weight: 600; color: var(--ink-2);
}
.aq-tier .rungs {
  display: inline-flex; align-items: flex-end; gap: 2px; height: 14px;
}
.aq-tier .rung {
  width: 3px; background: var(--line-2); border-radius: 1px;
}
.aq-tier .rung.on { background: var(--forest); }
.aq-card {
  background: var(--surface); border: 1px solid var(--line);
  border-radius: 20px; padding: 24px;
  box-shadow: 0 1px 0 rgba(31,28,18,0.04), 0 1px 2px rgba(31,28,18,0.05);
}
.aq-eyebrow {
  font-size: 11px; font-weight: 700; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--ink-3);
}
.aq-score-hero {
  text-align: center; padding: 36px;
  background: var(--surface); border: 1px solid var(--line);
  border-radius: 28px;
}
.aq-score-hero .big {
  font-family: var(--serif); font-weight: 500; font-size: 88px;
  line-height: 1; letter-spacing: -0.03em; color: var(--ink);
  font-variant-numeric: tabular-nums;
}
.aq-score-hero .big .slash { color: var(--ink-3); }
.aq-score-hero .big .of { font-size: 0.5em; color: var(--ink-3); }
.aq-score-hero .pct { color: var(--ink-2); font-weight: 500; margin-top: 8px; }
.aq-q-eyebrow {
  font-family: var(--serif); font-style: italic; font-weight: 500;
  font-size: 24px; color: var(--ink); letter-spacing: -0.01em;
}
.aq-q-text {
  font-family: var(--serif); font-weight: 500; font-size: 26px;
  line-height: 1.32; color: var(--ink); letter-spacing: -0.005em;
}
</style>
"""


def inject_styles():
    """Call once near the top of your Streamlit app, after st.set_page_config."""
    st.markdown(_CSS, unsafe_allow_html=True)


# ============================================================
# 2. HTML-component helpers
# ============================================================
# These return markdown strings you pass to st.markdown(..., unsafe_allow_html=True).
# Streamlit can't restyle a "Streak: 7" widget — so we just render our own HTML.

def wordmark() -> str:
    return '<div class="aq-wordmark"><span class="a">Ascend</span><span class="b">Quiz</span><span class="dot"></span></div>'


def streak_pill(days: int) -> str:
    return f'<span class="aq-streak"><span class="flame"></span>{days}-day streak</span>'


def xp_chip(level: int, xp: int) -> str:
    return f'<span class="aq-xp"><span class="dot"></span>Lv {level} · {xp:,} XP</span>'


def tier_badge(tier: int) -> str:
    """tier in 1..4"""
    names = ["Easy", "Medium", "Medium-Hard", "Hard"]
    heights = [4, 7, 10, 13]
    rungs = "".join(
        f'<span class="rung {"on" if r <= tier else ""}" style="height:{heights[r-1]}px"></span>'
        for r in range(1, 5)
    )
    return (
        f'<span class="aq-tier">'
        f'<span class="rungs">{rungs}</span>'
        f'<span>{names[tier-1]}</span>'
        f'</span>'
    )


def eyebrow(text: str) -> str:
    return f'<div class="aq-eyebrow">{text}</div>'


def score_hero(correct: int, total: int) -> str:
    pct = round(correct / total * 100) if total else 0
    grade = (
        "Mastery" if pct >= 90 else
        "Strong" if pct >= 75 else
        "Developing" if pct >= 60 else
        "Reviewing"
    )
    return (
        '<div class="aq-score-hero">'
        '<div class="aq-eyebrow" style="color:var(--amber-2)">Quiz complete</div>'
        f'<div class="big" style="margin-top:6px"><span>{correct}</span>'
        f'<span class="slash"> / </span><span class="of">{total}</span></div>'
        f'<div class="pct">{pct}% correct · <b style="color:var(--forest)">{grade}</b></div>'
        '</div>'
    )


def question_eyebrow(num: int, total: int, correct: int, tier: int) -> str:
    """The 'Question 03 / 20 · 2 correct · Medium' header strip."""
    return (
        '<div style="display:flex;align-items:center;gap:14px;margin-bottom:14px">'
        f'<span class="aq-q-eyebrow">{num:02d}</span>'
        f'<span style="color:var(--ink-3);font-size:13px">/ {total}</span>'
        '<span style="color:var(--ink-3)">·</span>'
        f'<span style="font-size:13px"><b style="color:var(--forest)">{correct}</b>'
        ' <span style="color:var(--ink-3)">correct</span></span>'
        '<div style="flex:1"></div>'
        f'{tier_badge(tier)}'
        '</div>'
    )


def question_text(text: str) -> str:
    return f'<div class="aq-q-text">{text}</div>'


# ============================================================
# 3. Example: how to use this in your existing app.py
# ============================================================
# Replace your render_home() with something like this:
#
#   def render_home():
#       inject_styles()
#       cols = st.columns([6, 2, 2])
#       with cols[0]:
#           st.markdown(wordmark(), unsafe_allow_html=True)
#       with cols[1]:
#           st.markdown(streak_pill(7), unsafe_allow_html=True)
#       with cols[2]:
#           st.markdown(xp_chip(12, 2340), unsafe_allow_html=True)
#       st.markdown("---")
#       st.markdown("### Upload your study material")
#       uploaded = st.file_uploader("Upload PDF", type=["pdf"], label_visibility="collapsed")
#       ...
#
# Replace the score block in render_results() with:
#
#       st.markdown(score_hero(correct, total), unsafe_allow_html=True)
