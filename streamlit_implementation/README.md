# Streamlit implementation

Two files that show how to apply the prototype's visual language to your Streamlit app:

- **`ascendquiz_styles.py`** — Drop-in styling module. Exports `inject_styles()` plus helpers (`wordmark`, `streak_pill`, `xp_chip`, `tier_badge`, `score_hero`, etc.) that return styled HTML.
- **`app.py`** — Self-contained reference app showing all five screens (login → home → loading → quiz → results) wired up with mock data. Run it to see the patterns end-to-end.

Plus a bonus for showing the design to teammates:

- **`ascendquiz_prototype_bundle.html`** — The full React prototype bundled into a single self-contained HTML file. Open it directly in a browser, or embed it in Streamlit (see `embed_prototype.py`).
- **`embed_prototype.py`** — Renders the bundled prototype inside Streamlit via `st.components.v1.html`. Run `streamlit run embed_prototype.py` to see the design inside Streamlit's chrome. **Note:** the iframe is isolated — it can't talk to your Python code, so this is best used as a design preview, not as a production replacement.

## Run the demo

```bash
pip install streamlit
streamlit run app.py
```

Then open http://localhost:8501. Click through the flow — there's no real PDF parsing or Gemini calls, just mocked questions so the visual integration is the focus.

## Integrating into your real `app.py`

1. Copy `ascendquiz_styles.py` next to your existing `app.py`.
2. At the top of your app, after `st.set_page_config(...)`, add:
   ```python
   from ascendquiz_styles import inject_styles, wordmark, streak_pill, xp_chip, tier_badge, score_hero
   inject_styles()
   ```
3. Find moments where you used plain `st.title("AscendQuiz")` and replace with:
   ```python
   st.markdown(wordmark(), unsafe_allow_html=True)
   ```
4. Replace the score-display block in `render_results()` with:
   ```python
   st.markdown(score_hero(correct, total), unsafe_allow_html=True)
   ```
5. Add tier badges next to the current-question header:
   ```python
   st.markdown(tier_badge(state["current_tier"]), unsafe_allow_html=True)
   ```

That's the minimum-effort path. For the richer per-question card layout (lettered chips, hover/selected/correct states) see `screen_quiz()` in the demo `app.py` — it shows how to build it with `st.radio` + custom HTML for the post-submit answer state.

## Caveats

- **CSS selector stability** — Streamlit's internal class names occasionally change between major versions. The `[data-testid="..."]` selectors used here are the more stable ones, but spot-check after upgrading Streamlit.
- **Loading screen** — Streamlit reruns top-to-bottom, so the prototype's parallel-fill animation can't be recreated cleanly. The demo uses a styled progress bar + status text instead — in your real app, wrap the `generate_question_pool()` call in `st.spinner()` and update the status line between phases.
- **Quiz sidebar** — The prototype's right-rail tier ladder doesn't fit Streamlit's centered layout well. Easiest move: either drop it (the main column already shows the tier badge in the header) or switch your `st.set_page_config(layout="wide")` and use `st.columns([3, 1])`.
