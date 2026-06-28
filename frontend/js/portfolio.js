// ── PORTFOLIO JS ──────────────────────────────────────────────────────────
let allProjects = [];
let activeCategory = "all";
let activeStatus   = "all";

async function loadStats() {
  try {
    const res = await apiFetch("/api/stats");
    if (!res.ok) return;
    const data = await res.json();
    animCount(document.getElementById("stat-total"), data.total);
    animCount(document.getElementById("stat-done"),  data.done + data.delivered);
    buildCategoryFilter(data.categories);
  } catch {}
}

async function loadProjects() {
  const grid = document.getElementById("projects-grid");
  grid.innerHTML = '<div class="loading-spinner"></div>';
  try {
    const res = await apiFetch("/api/projects");
    if (!res.ok) throw new Error();
    allProjects = await res.json();
    renderGrid();
  } catch {
    grid.innerHTML = '<div class="empty-state">Could not load projects. Please try again later.</div>';
  }
}

function buildCategoryFilter(cats) {
  const bar = document.getElementById("filter-bar");
  const all = ["all", ...cats];
  bar.innerHTML = all.map(c =>
    `<button class="filter-btn${c === activeCategory ? " active" : ""}" data-cat="${c}" onclick="setCategory('${c}',this)">
      ${c === "all" ? "All" : c}
    </button>`
  ).join("");
}

function setCategory(cat, btn) {
  activeCategory = cat;
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  renderGrid();
}

function setStatus(status, btn) {
  activeStatus = status;
  document.querySelectorAll(".sf-btn").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  renderGrid();
}

function renderGrid() {
  const grid = document.getElementById("projects-grid");
  let list = allProjects;
  if (activeCategory !== "all") list = list.filter(p => p.category === activeCategory);
  if (activeStatus   !== "all") list = list.filter(p => p.status   === activeStatus);

  if (!list.length) {
    grid.innerHTML = '<div class="empty-state">No projects found for this filter.</div>';
    return;
  }

  grid.innerHTML = list.map(p => {
    const st = STATUS_MAP[p.status] || STATUS_MAP.done;
    const tags = Array.isArray(p.tags) ? p.tags : [];
    return `<div class="project-card">
      ${p.img_url
        ? `<img class="card-thumb" src="${p.img_url}" alt="${p.title}" onerror="this.style.display='none';this.nextSibling.style.display='flex'"/><div class="card-thumb-ph" style="display:none">${p.emoji || "🌐"}</div>`
        : `<div class="card-thumb-ph">${p.emoji || "🌐"}</div>`}
      <div class="card-body">
        <div class="card-top">
          <span class="card-cat">${p.category}</span>
          <span class="card-status ${st.cls}">${st.label}</span>
        </div>
        <div class="card-title">${p.title}</div>
        <div class="card-desc">${p.description}</div>
        <div class="card-tags">${tags.map(t => `<span class="card-tag">${t}</span>`).join("")}</div>
        <div class="card-footer">
          ${p.url ? `<a href="${p.url}" target="_blank" class="card-link">View Live →</a>`
                  : `<span style="font-size:0.8rem;color:var(--g200)">In Progress</span>`}
          <span class="card-year">${p.year || ""}</span>
        </div>
      </div>
    </div>`;
  }).join("");
}

// Stat counter animation
function animCount(el, n) {
  if (!el) return;
  let c = 0;
  const step = Math.max(1, Math.ceil(n / 25));
  const t = setInterval(() => {
    c = Math.min(c + step, n);
    el.textContent = c;
    if (c >= n) clearInterval(t);
  }, 40);
}

// Status filter buttons
document.querySelectorAll(".sf-btn").forEach(btn => {
  btn.addEventListener("click", () => setStatus(btn.dataset.status, btn));
});

// Init
document.addEventListener("DOMContentLoaded", () => {
  loadStats();
  loadProjects();
});
