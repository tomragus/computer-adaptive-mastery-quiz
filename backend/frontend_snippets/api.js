// src/api.js — Drop-in API client for the React prototype
//
// Loaded with: <script src="src/api.js"></script>
// Used in screens as: const result = await api.login(username);
//
// All methods return Promises. They throw on non-2xx with the server's error
// message attached, so wrap calls in try/catch and surface the error in your UI.

const API_BASE = "http://localhost:8000";

async function request(path, opts = {}) {
  const res = await fetch(API_BASE + path, {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try { msg = (await res.json()).detail || msg; } catch {}
    throw new Error(msg);
  }
  return res.status === 204 ? null : res.json();
}

window.api = {
  // ----- Auth -----
  async login(username) {
    return request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username }),
    });
  },

  async signup(username) {
    return request("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ username }),
    });
  },

  // ----- Quiz generation -----
  // pdfFile is a File object from <input type="file">
  async generateQuiz(pdfFile, difficulty = "Medium") {
    const form = new FormData();
    form.append("pdf", pdfFile);
    form.append("difficulty", difficulty);
    const res = await fetch(`${API_BASE}/quiz/generate`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      let msg = `${res.status} ${res.statusText}`;
      try { msg = (await res.json()).detail || msg; } catch {}
      throw new Error(msg);
    }
    return res.json();
  },

  async saveResult({ userId, pdfName, correct, total }) {
    return request("/quiz/save_result", {
      method: "POST",
      body: JSON.stringify({
        user_id: userId,
        pdf_name: pdfName,
        correct,
        total,
      }),
    });
  },

  // ----- Recent quizzes -----
  async recent(userId, limit = 5) {
    return request(`/users/${userId}/recent?limit=${limit}`);
  },
};
