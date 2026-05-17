"""
backend/main.py — FastAPI server for AscendQuiz

Wraps the existing Python logic (PDF parsing, Gemini calls, SQLite) and
exposes it as a small REST API the React prototype can call via fetch().

This is a near-direct port of the rendering-free parts of your existing
app.py — only the Streamlit `render_*` functions go away. The data layer
(get_connection, init_db, create_user, save_quiz_session) and the AI
pipeline (call_gemini_api, generate_question_pool, etc.) move here unchanged.

Run:
    pip install -r requirements.txt
    export GEMINI_API_KEY=sk-...
    uvicorn main:app --reload --port 8000

Then open http://localhost:8000/docs for an auto-generated API explorer.
"""

import os
import json
import random
import re
import sqlite3
import uuid
import requests
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import fitz  # PyMuPDF
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


# ============== CONFIGURATION ==============

def _load_api_key() -> str:
    """Look for the Gemini key in env, then in .streamlit/secrets.toml (the same
    file the existing Streamlit app uses, so you don't have to set it twice)."""
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if key:
        return key
    # Search a few likely locations for secrets.toml
    candidates = [
        Path(".streamlit/secrets.toml"),
        Path("../.streamlit/secrets.toml"),
        Path(__file__).parent.parent / ".streamlit/secrets.toml",
    ]
    for path in candidates:
        if path.exists():
            try:
                text = path.read_text(encoding="utf-8")
                m = re.search(r'GEMINI_API_KEY\s*=\s*["\']([^"\']+)["\']', text)
                if m:
                    return m.group(1).strip()
            except Exception:
                pass
    return ""


API_KEY = _load_api_key()
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent"
DB_PATH = "ascendquiz.db"

QUESTION_POOL_SIZE = 30
QUIZ_LENGTH = 20

POOL_DISTRIBUTIONS = {
    "Easy":   (12, 10, 6, 2),
    "Medium": (8, 7, 8, 7),
    "Hard":   (2, 6, 10, 12),
}
STARTING_TIER = {"Easy": 1, "Medium": 2, "Hard": 3}
TIERS = {1: (75, 100), 2: (50, 74), 3: (30, 49), 4: (0, 29)}
TIER_NAMES = {1: "Easy", 2: "Medium", 3: "Medium-Hard", 4: "Hard"}

# In-memory pool cache. In production replace with Redis or DB.
POOLS: dict[str, dict] = {}


# ============== DATABASE (lifted from app.py) ==============

def get_connection():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS quiz_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        pdf_name TEXT,
        correct_answers INTEGER,
        total_questions INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )''')
    conn.commit()
    conn.close()


init_db()


# ============== PDF + GEMINI (lifted from app.py, unchanged) ==============

def extract_text_from_pdf(pdf_bytes: bytes) -> list[str]:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    return [page.get_text() for page in doc if page.get_text().strip()]


def get_chunks_by_token(pages: list[str]) -> list[str]:
    full_text = "\n\n".join(pages)
    size = 10000 * 4
    chunks = [full_text[i:i + size] for i in range(0, len(full_text), size)]
    return chunks if len(chunks) <= 2 else random.sample(chunks, 2)


def call_gemini_api(prompt: str) -> tuple[str | None, str | None]:
    headers = {"Content-Type": "application/json"}
    data = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.7, "maxOutputTokens": 16000},
    }
    url = f"{GEMINI_URL}?key={API_KEY}"
    response = requests.post(url, headers=headers, json=data, timeout=120)
    if response.status_code != 200:
        return None, response.text
    try:
        return response.json()["candidates"][0]["content"]["parts"][0]["text"], None
    except (KeyError, IndexError) as e:
        return None, f"Failed to parse Gemini response: {e}"


def repair_json(text: str) -> str:
    text = re.sub(r'```(?:json)?', '', text).replace('```', '').strip()
    s, e = text.find('['), text.rfind(']')
    if s != -1 and e != -1:
        text = text[s:e + 1]
    text = re.sub(r'}\s*{', '}, {', text)
    text = re.sub(r',\s*([\]}])', r'\1', text)
    if not text.startswith('['): text = '[' + text
    if not text.endswith(']'): text = text + ']'
    return text.strip()


def parse_question_json(text: str) -> list:
    cleaned = repair_json(text)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        questions = []
        for q_text in re.findall(r'\{[^{}]*?"question"[^{}]*?\}', cleaned, re.DOTALL):
            try:
                questions.append(json.loads(q_text))
            except Exception:
                pass
        return questions


def generate_batch_prompt(text_chunk: str, tier: int, count: int) -> str:
    low, high = TIERS[tier]
    return f"""You are a teacher designing a multiple-choice test.
Generate exactly {count} questions for tier {tier} ({TIER_NAMES[tier]}).
estimated_correct_pct must be between {low} and {high}.

Return ONLY a JSON array of {count} objects with fields:
question, options (4 strings prefixed "A. ", "B. ", etc), correct_answer (letter),
explanation_correct (string), explanation_wrong (object mapping the 3 wrong letters
to short explanations), estimated_correct_pct (int).

Questions must be self-contained — no references to "the passage", figures, etc.
All four options similar in length and technicality.

Passage:
{text_chunk}
"""


def generate_question_pool(text_chunk: str, difficulty_mode: str) -> dict:
    dist = POOL_DISTRIBUTIONS[difficulty_mode]
    tier_counts = {1: dist[0], 2: dist[1], 3: dist[2], 4: dist[3]}

    def fetch_tier(tier: int, count: int) -> list:
        out = []
        for _ in range(3):
            needed = count - len(out)
            if needed <= 0:
                break
            prompt = generate_batch_prompt(text_chunk, tier, needed)
            raw, err = call_gemini_api(prompt)
            if err or not raw:
                continue
            for q in parse_question_json(raw):
                if isinstance(q, dict):
                    q["difficulty_tier"] = tier
                    out.append(q)
        return out[:count]

    pool = {}
    with ThreadPoolExecutor(max_workers=4) as ex:
        futures = {t: ex.submit(fetch_tier, t, n) for t, n in tier_counts.items()}
        for t, f in futures.items():
            pool[t] = f.result()
    return pool


# ============== API MODELS ==============

class AuthRequest(BaseModel):
    username: str


class AuthResponse(BaseModel):
    user_id: int
    username: str
    streak: int = 0
    level: int = 1
    xp: int = 0


class SaveResultRequest(BaseModel):
    user_id: int
    pdf_name: str
    correct: int
    total: int


class RecentQuiz(BaseModel):
    name: str
    sub: str
    score: int


# ============== FASTAPI APP ==============

app = FastAPI(title="AscendQuiz API")

# Allow the React prototype (running on any port / file://) to call us
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"ok": True, "gemini_configured": bool(API_KEY)}


# ----- Auth -----

@app.post("/auth/login", response_model=AuthResponse)
def login(body: AuthRequest):
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE username = ?", (body.username,))
    row = c.fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, "User not found")
    return _auth_response(dict(row))


@app.post("/auth/signup", response_model=AuthResponse)
def signup(body: AuthRequest):
    if len(body.username.strip()) < 3:
        raise HTTPException(400, "Username must be at least 3 characters")
    conn = get_connection()
    c = conn.cursor()
    try:
        c.execute("INSERT INTO users (username) VALUES (?)", (body.username,))
        conn.commit()
        user_id = c.lastrowid
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(409, "Username already exists")
    conn.close()
    return _auth_response({"id": user_id, "username": body.username})


def _auth_response(user: dict) -> AuthResponse:
    # Simple derived stats from past sessions for streak/xp/level
    conn = get_connection()
    c = conn.cursor()
    c.execute(
        "SELECT correct_answers, total_questions FROM quiz_sessions WHERE user_id = ?",
        (user["id"],),
    )
    sessions = c.fetchall()
    conn.close()
    xp = sum((r["correct_answers"] or 0) * 15 for r in sessions)
    level = 1 + xp // 500
    streak = min(len(sessions), 30)
    return AuthResponse(
        user_id=user["id"],
        username=user["username"],
        streak=streak,
        level=level,
        xp=xp,
    )


# ----- Quiz generation -----

@app.post("/quiz/generate")
async def generate_quiz(
    pdf: UploadFile = File(...),
    difficulty: str = Form("Medium"),
):
    """Accept a PDF + difficulty, return a 30-question pool grouped by tier."""
    if difficulty not in POOL_DISTRIBUTIONS:
        raise HTTPException(400, "Invalid difficulty")

    if not API_KEY:
        raise HTTPException(500, "GEMINI_API_KEY is not set on the server")

    try:
        pdf_bytes = await pdf.read()
        pages = extract_text_from_pdf(pdf_bytes)
    except Exception as e:
        raise HTTPException(400, f"Could not read PDF: {e}")

    chunks = get_chunks_by_token(pages)
    text_chunk = chunks[0] if chunks else ""
    if not text_chunk.strip():
        raise HTTPException(400, "Could not extract text from PDF")

    pool = generate_question_pool(text_chunk, difficulty)
    total = sum(len(v) for v in pool.values())
    if total < QUIZ_LENGTH:
        raise HTTPException(
            422,
            f"Only generated {total} questions (need {QUIZ_LENGTH}). Try a different PDF."
        )

    # Stash the pool server-side under a pool_id; client keeps the id and only
    # asks for one question at a time (or the whole pool — your call)
    pool_id = uuid.uuid4().hex
    POOLS[pool_id] = {
        "pool": pool,
        "pdf_name": pdf.filename,
        "difficulty": difficulty,
        "starting_tier": STARTING_TIER[difficulty],
    }

    # Return the whole pool to the client for now — simpler
    return {
        "pool_id": pool_id,
        "pdf_name": pdf.filename,
        "difficulty": difficulty,
        "starting_tier": STARTING_TIER[difficulty],
        "quiz_length": QUIZ_LENGTH,
        "questions_by_tier": {str(t): qs for t, qs in pool.items()},
    }


@app.post("/quiz/save_result")
def save_result(body: SaveResultRequest):
    conn = get_connection()
    c = conn.cursor()
    c.execute(
        "INSERT INTO quiz_sessions (user_id, pdf_name, correct_answers, total_questions) VALUES (?, ?, ?, ?)",
        (body.user_id, body.pdf_name, body.correct, body.total),
    )
    conn.commit()
    conn.close()
    return {"ok": True}


# ----- Recent quizzes for the home screen -----

@app.get("/users/{user_id}/recent", response_model=list[RecentQuiz])
def recent_quizzes(user_id: int, limit: int = 5):
    conn = get_connection()
    c = conn.cursor()
    c.execute(
        """SELECT pdf_name, correct_answers, total_questions, created_at
           FROM quiz_sessions
           WHERE user_id = ?
           ORDER BY created_at DESC
           LIMIT ?""",
        (user_id, limit),
    )
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    out = []
    for r in rows:
        pct = round((r["correct_answers"] or 0) / (r["total_questions"] or 1) * 100)
        out.append(RecentQuiz(
            name=r["pdf_name"] or "Untitled.pdf",
            sub=f'{r["created_at"]} · {r["total_questions"]} questions',
            score=pct,
        ))
    return out
