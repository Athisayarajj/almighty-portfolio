// ── API CONFIGURATION ─────────────────────────────────────────────────────
const API_BASE = "https://almighty-portfolio.onrender.com";

const TOKEN_KEY = "aws_admin_token";
function getToken()    { return localStorage.getItem(TOKEN_KEY); }
function setToken(t)   { localStorage.setItem(TOKEN_KEY, t); }
function clearToken()  { localStorage.removeItem(TOKEN_KEY); }

async function apiFetch(path, options = {}) {
  const token   = getToken();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers["X-Auth-Token"] = token;
  const res = await fetch(API_BASE + path, { ...options, headers });
  return res;
}

function showToast(msg, dur = 2600) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg; t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), dur);
}

const STATUS_MAP = {
  done:      { label:"Done",      cls:"st-done"      },
  ongoing:   { label:"Ongoing",   cls:"st-ongoing"   },
  delivered: { label:"Delivered", cls:"st-delivered" },
  sale:      { label:"For Sale",  cls:"st-sale"      },
};
