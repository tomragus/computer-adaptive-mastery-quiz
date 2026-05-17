"""
embed_prototype.py — Show the full React prototype inside Streamlit
--------------------------------------------------------------------
Renders the bundled prototype HTML in an iframe via st.components.v1.html.
The iframe is fully isolated — it can't read/write your Streamlit session
state or call your Python functions — so this is best used for:

  * Showing the design to teammates / stakeholders
  * A "preview the new UI" tab in your real app
  * Internal review during the visual redesign

For production with real Gemini calls + database, you'd need to either:
  * Rebuild as a proper Streamlit Custom Component (Node + React + build step), or
  * Move off Streamlit and serve the prototype as your real frontend (FastAPI + static HTML)

Run:
    streamlit run embed_prototype.py
"""

import streamlit as st
import streamlit.components.v1 as components
from pathlib import Path

st.set_page_config(page_title="AscendQuiz — Design Preview", layout="wide")

# Read the bundled prototype HTML
bundle_path = Path(__file__).parent / "ascendquiz_prototype_bundle.html"
html = bundle_path.read_text(encoding="utf-8")

# Embed. Height controls the iframe size; scrolling=True lets the user scroll
# inside the prototype.
components.html(html, height=900, scrolling=True)
