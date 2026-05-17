# AscendQuiz Backend (FastAPI)

A small REST API that wraps your existing Gemini + PDF + SQLite logic and exposes it for the React prototype to call. This is the bridge from "fancy mockup" to "real working app."

## Architecture

```
React prototype (browser)        FastAPI backend (Python)         External
─────────────────────────         ────────────────────────         ────────
AscendQuiz Prototype.html  ──→   POST /quiz/generate         ──→   Gemini API
  (uses window.api client)        POST /auth/login                  SQLite
                                  POST /quiz/save_result            (local file)
                                  GET  /users/{id}/recent
                                  ...
```

Same Python logic as your current `app.py` — just rearranged so the rendering layer is React instead of Streamlit.

## Running locally

```bash
cd backend
python -m venv .venv
source .venv/bin/activate         # Windows: .venv\Scripts\activate
pip install -r requirements.txt
export GEMINI_API_KEY=your-key    # Windows: set GEMINI_API_KEY=your-key
uvicorn main:app --reload --port 8000
```

Then visit:
- **http://localhost:8000/docs** — auto-generated API explorer (try every endpoint from your browser)
- **http://localhost:8000/health** — sanity check that GEMINI_API_KEY is set

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/auth/signup` | Create user. Body: `{username}` |
| `POST` | `/auth/login` | Look up user. Body: `{username}` |
| `POST` | `/quiz/generate` | Upload PDF + difficulty. Returns 30-question pool grouped by tier. Multipart form: `pdf` (file), `difficulty` (Easy/Medium/Hard) |
| `POST` | `/quiz/save_result` | Record a finished quiz. Body: `{user_id, pdf_name, correct, total}` |
| `GET` | `/users/{user_id}/recent` | Recent quizzes for the home screen |
| `GET` | `/health` | Heartbeat + GEMINI key check |

## Wiring the React prototype to call the backend

Copy `frontend_snippets/api.js` into your prototype's `src/` folder, and add this script tag in `AscendQuiz Prototype.html` (before the screen files):

```html
<script src="src/api.js"></script>
```

Then in each screen, swap the mock data for API calls. The pattern looks like this:

### Login screen

```jsx
// src/screen-login.jsx — inside submit()
try {
  const user = mode === "signin"
    ? await api.login(username.trim())
    : await api.signup(username.trim());
  onLogin(user);   // pass the whole user object (has id, streak, level, xp)
} catch (err) {
  setError(err.message);
}
```

### Home screen

```jsx
// src/screen-home.jsx — load recents on mount
const [recent, setRecent] = React.useState([]);
React.useEffect(() => {
  api.recent(user.user_id).then(setRecent).catch(console.error);
}, [user.user_id]);
```

### Loading screen → Quiz screen

The current `ScreenLoading` simulates progress with a timer. Replace its core with a real API call:

```jsx
// src/screen-loading.jsx
React.useEffect(() => {
  let cancelled = false;
  (async () => {
    try {
      const result = await api.generateQuiz(pdfFile, difficulty);
      if (!cancelled) onDone(result);  // pass pool + metadata up to App
    } catch (err) {
      if (!cancelled) setError(err.message);
    }
  })();
  return () => { cancelled = true; };
}, []);
```

Then `ScreenQuiz` reads questions from `result.questions_by_tier[currentTier]` instead of `MOCK_QUESTIONS`, and the adaptive engine in `pickNextQuestion()` becomes a real walk over that pool.

### Saving the result

```jsx
// src/screen-quiz.jsx — when finishing
await api.saveResult({
  userId: user.user_id,
  pdfName: run.pdfName,
  correct: correctCount,
  total: QUIZ_LENGTH,
});
```

## Production considerations

The current code is a working starter — fine for local dev and team demos. Before shipping to real users:

1. **CORS** — `main.py` allows all origins. Tighten to your frontend's actual URL.
2. **Auth** — username-only "login" is identification, not authentication. Add password hashing (passlib + bcrypt) or swap to OAuth.
3. **Pool storage** — `POOLS` is an in-memory dict. Lose it on server restart. Move to Redis or SQLite if you need it to persist.
4. **Rate limiting** — Gemini calls are expensive. Add per-user limits (slowapi works well with FastAPI).
5. **PDF size cap** — currently unbounded. Reject anything over a sensible limit upfront.
6. **Streaming generation** — for better UX during the 30-second generation, expose progress via Server-Sent Events so the loading screen's 4-column animation can show real per-tier progress.

## Where this leaves Streamlit

Once the backend is up and the React frontend calls it, the old `app.py` is no longer needed. You can:

- **Keep `app.py` running in parallel** during the transition so existing users aren't disrupted.
- **Or sunset it** and serve the prototype as a static file from FastAPI (`app.mount("/", StaticFiles(...))`). One process, one URL, one codebase.
