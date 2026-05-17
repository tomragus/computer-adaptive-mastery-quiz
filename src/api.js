// src/api.js — AscendQuiz API client (plain JS, no Babel)
// Talks to the FastAPI backend (backend/main.py).
//
// API_BASE is configurable via localStorage so you can point at a deployed
// backend without rebuilding. Set it from the browser console:
//   localStorage.setItem("ascendquiz_api_base", "https://api.ascendquiz.com")
// or use the API URL control in the prototype's Tweaks panel.

const DEFAULT_API_BASE = "http://localhost:8000";

window.getApiBase = function () {
  return localStorage.getItem("ascendquiz_api_base") || DEFAULT_API_BASE;
};
window.setApiBase = function (url) {
  localStorage.setItem("ascendquiz_api_base", url);
};

async function request(path, opts = {}) {
  const res = await fetch(getApiBase() + path, {
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
  async health() { return request("/health"); },

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

  async generateQuiz(pdfFile, difficulty = "Medium") {
    const form = new FormData();
    form.append("pdf", pdfFile);
    form.append("difficulty", difficulty);
    const res = await fetch(`${getApiBase()}/quiz/generate`, {
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

  async recent(userId, limit = 5) {
    return request(`/users/${userId}/recent?limit=${limit}`);
  },
};
