// ── ADMIN JS — Supabase backend ───────────────────────────────────────────
let editingId    = null;
let resetToken   = null;   // holds reset token from forgot-pw flow

// ── SCREEN SWITCHING ─────────────────────────────────────────────────────
const SCREENS = ["screen-login","screen-forgot","screen-change-pw"];

function showScreen(id) {
  SCREENS.forEach(s => {
    const el = document.getElementById(s);
    if (el) el.style.display = s === id ? "flex" : "none";
  });
  document.getElementById("admin-dashboard").style.display = "none";
  clearAuthMessages();
}

function showDashboard() {
  SCREENS.forEach(s => { const el = document.getElementById(s); if (el) el.style.display = "none"; });
  document.getElementById("admin-dashboard").style.display = "grid";
  loadProjects();
  loadCategoryOptions();
}

function clearAuthMessages() {
  ["login-error","forgot-error","forgot-success",
   "changepw-error","changepw-success","settings-error","settings-success"].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.style.display = "none"; el.textContent = ""; }
  });
}

// ── AUTH CHECK ────────────────────────────────────────────────────────────
async function checkAuth() {
  const token = getToken();
  if (!token) { showScreen("screen-login"); return; }
  try {
    const res  = await apiFetch("/api/auth/check");
    const data = await res.json();
    if (data.authenticated) showDashboard();
    else { clearToken(); showScreen("screen-login"); }
  } catch { showScreen("screen-login"); }
}

// ── LOGIN ─────────────────────────────────────────────────────────────────
async function doLogin() {
  const btn  = document.getElementById("login-btn");
  const user = document.getElementById("login-username").value.trim();
  const pass = document.getElementById("login-password").value;
  const err  = document.getElementById("login-error");
  err.style.display = "none";

  if (!user || !pass) { showErr("login-error","Please enter username and password."); return; }

  btn.disabled = true; btn.textContent = "Signing in…";
  try {
    const res  = await apiFetch("/api/auth/login", { method:"POST", body: JSON.stringify({username:user,password:pass}) });
    const data = await res.json();
    if (res.ok) { setToken(data.token); showDashboard(); }
    else showErr("login-error", data.error || "Invalid credentials.");
  } catch { showErr("login-error","Cannot connect to server. Check your connection."); }
  finally { btn.disabled = false; btn.textContent = "Sign In →"; document.getElementById("login-password").value = ""; }
}

// ── LOGOUT ────────────────────────────────────────────────────────────────
async function doLogout() {
  try { await apiFetch("/api/auth/logout", { method:"POST" }); } catch {}
  clearToken();
  showScreen("screen-login");
}

// ── FORGOT PASSWORD ───────────────────────────────────────────────────────
async function doForgot() {
  const btn   = document.getElementById("forgot-btn");
  const email = document.getElementById("forgot-email").value.trim();
  const code  = document.getElementById("forgot-code").value.trim();

  if (!email || !code) { showErr("forgot-error","Please enter your email and reset code."); return; }

  btn.disabled = true; btn.textContent = "Verifying…";
  try {
    const res  = await apiFetch("/api/auth/forgot-password", { method:"POST", body: JSON.stringify({email, reset_code: code}) });
    const data = await res.json();
    if (res.ok) {
      resetToken = data.reset_token;
      showSuccess("forgot-success","✓ Verified! Redirecting to change password…");
      document.getElementById("forgot-form-wrap").style.display = "none";
      setTimeout(() => {
        showScreen("screen-change-pw");
        document.getElementById("changepw-back-links").style.display = "none";
      }, 1200);
    } else {
      showErr("forgot-error", data.error || "Verification failed.");
    }
  } catch { showErr("forgot-error","Connection error."); }
  finally { btn.disabled = false; btn.textContent = "Verify & Continue →"; document.getElementById("forgot-code").value = ""; }
}

// ── CHANGE PASSWORD (forgot flow) ─────────────────────────────────────────
async function doChangePw() {
  const btn    = document.getElementById("changepw-btn");
  const newPw  = document.getElementById("new-password").value;
  const confPw = document.getElementById("confirm-password").value;

  if (!newPw || !confPw) { showErr("changepw-error","Please fill in both fields."); return; }
  if (newPw !== confPw)  { showErr("changepw-error","Passwords do not match."); return; }
  if (newPw.length < 8)  { showErr("changepw-error","Password must be at least 8 characters."); return; }

  btn.disabled = true; btn.textContent = "Updating…";
  try {
    const res  = await apiFetch("/api/auth/change-password", {
      method:"POST",
      body: JSON.stringify({ reset_token: resetToken, new_password: newPw, confirm_password: confPw })
    });
    const data = await res.json();
    if (res.ok) {
      document.getElementById("changepw-form-wrap").style.display = "none";
      showSuccess("changepw-success",
        "✓ Password changed! Copy the hash below and update ADMIN_PASSWORD_HASH in Render:");
      // Show hash reveal
      const box = document.createElement("div");
      box.className = "hash-reveal";
      box.innerHTML = `<p class="hash-label">New ADMIN_PASSWORD_HASH for Render:</p>
        <div class="hash-value" id="changepw-hash">${data.new_hash}</div>
        <button class="btn-copy" onclick="copyHash('changepw-hash')">📋 Copy Hash</button>`;
      document.getElementById("changepw-success").insertAdjacentElement("afterend", box);
      resetToken = null;
    } else {
      showErr("changepw-error", data.error || "Failed to update password.");
    }
  } catch { showErr("changepw-error","Connection error."); }
  finally { btn.disabled = false; btn.textContent = "Update Password →"; }
}

// ── CHANGE PASSWORD (settings / logged-in flow) ───────────────────────────
async function doSettingsChangePw() {
  const newPw  = document.getElementById("set-new-password").value;
  const confPw = document.getElementById("set-confirm-password").value;
  const errEl  = document.getElementById("settings-error");
  const sucEl  = document.getElementById("settings-success");
  errEl.style.display = "none"; sucEl.style.display = "none";
  document.getElementById("settings-hash-box").style.display = "none";

  if (!newPw || !confPw) { showErr("settings-error","Please fill in both fields."); return; }
  if (newPw !== confPw)  { showErr("settings-error","Passwords do not match."); return; }
  if (newPw.length < 8)  { showErr("settings-error","Password must be at least 8 characters."); return; }

  try {
    const res  = await apiFetch("/api/auth/change-password", {
      method:"POST",
      body: JSON.stringify({ new_password: newPw, confirm_password: confPw })
    });
    const data = await res.json();
    if (res.ok) {
      sucEl.textContent = "✓ Hash generated! Copy it and update Render environment variable.";
      sucEl.style.display = "block";
      document.getElementById("settings-hash-value").textContent = data.new_hash;
      document.getElementById("settings-hash-box").style.display = "block";
      document.getElementById("set-new-password").value = "";
      document.getElementById("set-confirm-password").value = "";
      document.getElementById("set-pw-strength").textContent = "";
    } else {
      showErr("settings-error", data.error || "Failed.");
    }
  } catch { showErr("settings-error","Connection error."); }
}

// ── PASSWORD STRENGTH ─────────────────────────────────────────────────────
function checkStrength(pw, targetId) {
  const el = document.getElementById(targetId);
  if (!el) return;
  if (!pw) { el.textContent = ""; el.className = "pw-strength"; return; }
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 2) { el.textContent = "Weak"; el.className = "pw-strength weak"; }
  else if (score <= 3) { el.textContent = "Medium"; el.className = "pw-strength medium"; }
  else { el.textContent = "Strong ✓"; el.className = "pw-strength strong"; }
}

// Attach strength listeners after DOM ready
function attachStrengthListeners() {
  const pairs = [
    ["new-password","pw-strength"],
    ["set-new-password","set-pw-strength"],
  ];
  pairs.forEach(([inputId, strengthId]) => {
    const el = document.getElementById(inputId);
    if (el) el.addEventListener("input", () => checkStrength(el.value, strengthId));
  });
}

// ── HELPERS ───────────────────────────────────────────────────────────────
function showErr(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg; el.style.display = "block";
}
function showSuccess(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg; el.style.display = "block";
}
function togglePw(inputId) {
  const el = document.getElementById(inputId);
  if (el) el.type = el.type === "password" ? "text" : "password";
}
function copyHash(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  navigator.clipboard.writeText(el.textContent).then(() => showToast("Hash copied! ✓"));
}

// ── VIEWS ─────────────────────────────────────────────────────────────────
const VIEW_TITLES = { projects:"Projects", add:"Add Project", stats:"Statistics", settings:"Change Password" };

function showView(v) {
  ["projects","add","stats","settings"].forEach(name => {
    const el = document.getElementById("view-" + name);
    if (el) el.style.display = v === name ? "block" : "none";
  });
  document.querySelectorAll(".sidebar-item").forEach((el, i) => {
    el.classList.toggle("active", ["projects","add","stats","settings"][i] === v);
  });
  document.getElementById("view-title").textContent = VIEW_TITLES[v] || v;
  if (v === "stats") loadStats();
  // Reset settings messages when entering
  if (v === "settings") {
    ["settings-error","settings-success"].forEach(id => {
      const el = document.getElementById(id); if (el) { el.style.display="none"; el.textContent=""; }
    });
    document.getElementById("settings-hash-box").style.display = "none";
  }
}

// ── PROJECTS ──────────────────────────────────────────────────────────────
async function loadProjects() {
  const list = document.getElementById("admin-projects-list");
  list.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--g300)">Loading…</div>';
  const cat    = document.getElementById("filter-category")?.value || "all";
  const status = document.getElementById("filter-status")?.value   || "all";
  let url = "/api/projects";
  const p = [];
  if (cat    !== "all") p.push("category=" + encodeURIComponent(cat));
  if (status !== "all") p.push("status="   + encodeURIComponent(status));
  if (p.length) url += "?" + p.join("&");
  try {
    const res  = await apiFetch(url);
    const data = await res.json();
    renderAdminList(Array.isArray(data) ? data : []);
  } catch {
    list.innerHTML = '<div style="padding:2rem;text-align:center;color:#B91C1C">Failed to load.</div>';
  }
}

function renderAdminList(projects) {
  const list = document.getElementById("admin-projects-list");
  if (!projects.length) {
    list.innerHTML = '<div class="empty-state">No projects yet. Click "+ Add New".</div>'; return;
  }
  list.innerHTML = projects.map(p => {
    const st   = STATUS_MAP[p.status] || STATUS_MAP.done;
    const tags = Array.isArray(p.tags) ? p.tags : [];
    return `<div class="admin-prow">
      <div class="prow-emoji">${p.emoji || "🌐"}</div>
      <div class="prow-info">
        <div class="prow-title">${p.title}</div>
        <div class="prow-meta">
          <span class="prow-status ${st.cls}">${st.label}</span>
          <span class="prow-cat">${p.category}</span>
          <span class="prow-year">${p.year || ""}</span>
          ${tags.slice(0,3).map(t=>`<span style="font-size:0.7rem;color:var(--cobalt);background:rgba(30,95,216,0.07);border:1px solid rgba(30,95,216,0.15);padding:0.1rem 0.4rem;border-radius:3px">${t}</span>`).join("")}
        </div>
      </div>
      <div class="prow-actions">
        <button class="btn-row-edit" onclick="editProject(${p.id})">Edit</button>
        <button class="btn-row-del"  onclick="deleteProject(${p.id},'${(p.title||"").replace(/'/g,"\\'")}')">Delete</button>
      </div>
    </div>`;
  }).join("");
}

async function loadCategoryOptions() {
  try {
    const res  = await apiFetch("/api/stats");
    const data = await res.json();
    const sel  = document.getElementById("filter-category");
    if (!sel) return;
    sel.innerHTML = '<option value="all">All Categories</option>' +
      (data.categories || []).map(c => `<option value="${c}">${c}</option>`).join("");
  } catch {}
}

// ── ADD / EDIT ────────────────────────────────────────────────────────────
function startNew() { editingId = null; clearForm(); document.getElementById("form-title").textContent = "Add New Project"; showView("add"); }

function editProject(id) {
  apiFetch("/api/projects/" + id).then(r => r.json()).then(p => {
    editingId = id;
    document.getElementById("f-title").value    = p.title        || "";
    document.getElementById("f-desc").value     = p.description  || "";
    document.getElementById("f-category").value = p.category     || "Seafood";
    document.getElementById("f-status").value   = p.status       || "done";
    document.getElementById("f-url").value      = p.url          || "";
    document.getElementById("f-year").value     = p.year         || "";
    document.getElementById("f-tags").value     = Array.isArray(p.tags) ? p.tags.join(", ") : "";
    document.getElementById("f-emoji").value    = p.emoji        || "";
    document.getElementById("f-img").value      = p.img_url      || "";
    document.getElementById("form-title").textContent = "Edit Project";
    showView("add");
  }).catch(() => showToast("Could not load project."));
}

async function saveProject() {
  const title = document.getElementById("f-title").value.trim();
  const desc  = document.getElementById("f-desc").value.trim();
  if (!title || !desc) { showToast("Title and Description are required."); return; }
  const tags    = (document.getElementById("f-tags").value || "").split(",").map(t=>t.trim()).filter(Boolean);
  const payload = {
    title, description: desc,
    category : document.getElementById("f-category").value,
    status   : document.getElementById("f-status").value,
    url      : document.getElementById("f-url").value.trim(),
    year     : document.getElementById("f-year").value || String(new Date().getFullYear()),
    tags, emoji: document.getElementById("f-emoji").value.trim() || "🌐",
    img_url  : document.getElementById("f-img").value.trim(),
  };
  const url    = editingId ? "/api/projects/" + editingId : "/api/projects";
  const method = editingId ? "PUT" : "POST";
  try {
    const res = await apiFetch(url, { method, body: JSON.stringify(payload) });
    if (res.ok) {
      showToast(editingId ? "Project updated! ✓" : "Project added! ✓");
      clearForm(); editingId = null; showView("projects"); loadProjects(); loadCategoryOptions();
    } else {
      const err = await res.json();
      showToast(err.error || "Save failed.");
    }
  } catch { showToast("Connection error."); }
}

async function deleteProject(id, title) {
  if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
  try {
    const res = await apiFetch("/api/projects/" + id, { method:"DELETE" });
    if (res.ok) { showToast("Deleted."); loadProjects(); }
    else showToast("Delete failed.");
  } catch { showToast("Connection error."); }
}

function cancelForm() { clearForm(); editingId = null; showView("projects"); }

function clearForm() {
  ["f-title","f-desc","f-url","f-year","f-tags","f-emoji","f-img"].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = "";
  });
  const cat = document.getElementById("f-category"); if (cat) cat.value = "Seafood";
  const st  = document.getElementById("f-status");   if (st)  st.value  = "done";
}

// ── STATS ─────────────────────────────────────────────────────────────────
async function loadStats() {
  try {
    const res  = await apiFetch("/api/stats");
    const data = await res.json();
    document.getElementById("s-total").textContent     = data.total     || 0;
    document.getElementById("s-done").textContent      = data.done      || 0;
    document.getElementById("s-ongoing").textContent   = data.ongoing   || 0;
    document.getElementById("s-delivered").textContent = data.delivered || 0;
    document.getElementById("s-sale").textContent      = data.for_sale  || 0;
    const cats = data.categories || [];
    document.getElementById("s-cats").innerHTML =
      `<div class="stat-cats-title">Categories in Portfolio</div>
       <div class="cat-list">${cats.length ? cats.map(c=>`<span class="cat-pill">${c}</span>`).join("") : "<span style='color:var(--g300)'>None yet</span>"}</div>`;
  } catch {}
}

// ── INIT ──────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
  attachStrengthListeners();
});
