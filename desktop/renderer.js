// ═══════════════════════════════════════════════════
// TOKENIZER DESKTOP — renderer.js
// Core token counting engine + UI logic
// ═══════════════════════════════════════════════════

// ── TOKEN ENGINE ─────────────────────────────────────

const SINGLE = new Set([" the"," a"," an"," is"," are"," was"," were"," be"," been"," have"," has"," had"," do"," does"," did"," will"," would"," could"," should"," may"," might"," must"," can"," not"," no"," yes"," and"," or"," but"," if"," then"," else"," when"," where"," how"," what"," which"," who"," why"," this"," that"," in"," on"," at"," to"," for"," with"," from"," by"," of"," as"," into"," through"," about"," it"," its"," I"," you"," he"," she"," we"," they"," me"," him"," her"," us"," them"," my"," your"," his"," our"," their"," also"," just"," very"," most"," more"," some"," any"," all"," new"," good"]);
const WRE = /'s|'t|'re|'ve|'m|'ll|'d| ?\w+| ?[^\s\w]+|\s+/g;
const PU  = new Set(".,!?;:'\"-/\\@#$%&*+=<>|()[]{}~`^_");

const SCALE = {
  cl100k_base: 1.00, o200k_base: 0.87, claude: 1.05, gemini: 0.90,
  llama3: 0.97, mistral: 0.95, deepseek: 1.10, grok: 0.92,
};

const PRICING_INPUT = {
  cl100k_base: 10.00, o200k_base: 2.50, claude: 3.00, gemini: 1.25,
  llama3: 0.59, mistral: 0.30, deepseek: 0.14, grok: 5.00,
};

const CONTEXT_WINDOW = {
  cl100k_base: 128000, o200k_base: 128000, claude: 200000,
  gemini: 1000000, llama3: 128000, mistral: 128000, deepseek: 128000,
  grok: 131072, default: 128000,
};

const ENERGY_WH_PER_1M = {
  o200k_base: 4000, cl100k_base: 8000, claude: 3500, gemini: 2000,
  llama3: 5000, mistral: 3000, deepseek: 2500, grok: 4500,
};

const GRID_INFO = [
  { key: "o200k_base", label: "GPT-4o",   color: "#10b981" },
  { key: "claude",     label: "Claude",   color: "#d97706" },
  { key: "gemini",     label: "Gemini",   color: "#8b5cf6" },
  { key: "llama3",     label: "LLaMA",    color: "#fbbf24" },
  { key: "deepseek",   label: "DeepSeek", color: "#4f8ef7" },
  { key: "mistral",    label: "Mistral",  color: "#f97316" },
];

function estCl100k(t) {
  if (!t) return 0;
  let n = 0;
  for (const c of (t.match(WRE) || [])) {
    if (SINGLE.has(c)) { n++; continue; }
    const s = c.trim();
    if (!s) { n += (c.match(/\n/g)||[]).length; continue; }
    if (s.length === 1 && PU.has(s)) { n++; continue; }
    const l = s.length;
    if (l<=5) n++; else if (l<=10) n += /^[a-z]+$/.test(s)?1:2;
    else if (l<=15) n+=2; else if (l<=20) n+=3; else n+=Math.ceil(l/4);
  }
  return Math.max(t.trim()?1:0, n);
}

function countAll(t) {
  const base = estCl100k(t);
  const r = {};
  for (const [k, s] of Object.entries(SCALE)) r[k] = Math.max(t.trim()?1:0, Math.round(base*s));
  return r;
}

// ── SYLLABLE / CHIP ENGINE ────────────────────────────

function countSyllables(word) {
  if (!word) return 0;
  word = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!word) return 0;
  if (word.length <= 3) return 1;
  word = word.replace(/e$/, "");
  const m = word.match(/[aeiouy]+/g);
  return Math.max(1, m ? m.length : 1);
}

function estimateWordTokens(word) {
  if (!word || !word.trim()) return 0;
  const w = word.trim(), l = w.length;
  if (l <= 2) return 1;
  if (l <= 4 && /^[a-z]+$/i.test(w)) return 1;
  if (/^[.,!?;:'"()\[\]{}\-]+$/.test(w)) return 1;
  if (/^\d+$/.test(w)) return Math.ceil(l / 3);
  if (/[A-Z]/.test(w) && /[a-z]/.test(w)) return Math.max(1, Math.ceil(l / 3));
  const sylls = countSyllables(w);
  if (sylls === 1 && l <= 8) return 1;
  if (sylls === 2 && l <= 10) return 2;
  if (sylls === 3) return 2;
  if (sylls >= 4) return Math.ceil(sylls * 0.8);
  return Math.max(1, Math.ceil(l / 4));
}

function getChipClass(toks, isPunct) {
  if (isPunct) return "tp";
  if (toks <= 1) return "t1";
  if (toks === 2) return "t2";
  if (toks === 3) return "t3";
  return "t4";
}

// ── ENERGY ────────────────────────────────────────────

const CO2_KG_PER_KWH = 0.386;
const GOOGLE_SEARCH_WH = 0.3;

function calcEnergy(tokens, tokKey) {
  const whPer1M = ENERGY_WH_PER_1M[tokKey] || 4000;
  const wh = (tokens / 1_000_000) * whPer1M;
  const kwh = wh / 1000;
  const co2g = kwh * CO2_KG_PER_KWH * 1000;
  const searches = wh / GOOGLE_SEARCH_WH;
  return { wh, co2g, searches };
}

function fmtEnergy(wh) {
  if (wh < 0.001) return (wh * 1000).toFixed(4) + " μWh";
  if (wh < 1)     return (wh * 1000).toFixed(3) + " mWh";
  if (wh < 1000)  return wh.toFixed(3) + " Wh";
  return (wh / 1000).toFixed(4) + " kWh";
}

function fmtCo2(co2g) {
  if (co2g < 0.001) return `${(co2g*1e6).toFixed(2)} μg`;
  if (co2g < 1)     return `${(co2g*1000).toFixed(3)} mg`;
  if (co2g < 1000)  return `${co2g.toFixed(3)} g`;
  return `${(co2g/1000).toFixed(4)} kg`;
}

function fmtEquiv(wh, searches) {
  if (searches < 1) return `< 1 Google search`;
  if (searches < 10) return `≈ ${searches.toFixed(1)} Google searches`;
  const ledSec = (wh / 10) * 3600;
  if (ledSec < 60) return `LED bulb for ${ledSec.toFixed(0)}s`;
  if (ledSec < 3600) return `LED bulb for ${(ledSec/60).toFixed(0)}min`;
  return `LED bulb for ${(ledSec/3600).toFixed(1)}hr`;
}

// ── STATE ─────────────────────────────────────────────

let currentModel = "o200k_base";
let debTimer = null;

// ── GRID INIT ─────────────────────────────────────────

function buildGrid() {
  const grid = document.getElementById("model-grid");
  if (!grid) return;
  grid.innerHTML = GRID_INFO.map(gi => `
    <div class="grid-item${gi.key === currentModel ? " active" : ""}" id="gi-${gi.key}">
      <div class="grid-name">${gi.label}</div>
      <div class="grid-val" id="gv-${gi.key}" style="color:${gi.color}">0</div>
      <div class="grid-cost" id="gc-${gi.key}">—</div>
      <div class="grid-bar"><div class="grid-bar-fill" id="gb-${gi.key}" style="background:${gi.color};width:0%"></div></div>
    </div>
  `).join("");
}

// ── UPDATE ────────────────────────────────────────────

function update(text) {
  const counts = countAll(text);
  const n = counts[currentModel] || 0;
  const isFree = currentModel === "llama3" || currentModel.includes("local");

  // Main counter
  const mn = document.getElementById("main-num");
  if (mn) mn.textContent = n.toLocaleString();
  const mc = document.getElementById("main-cost");
  if (mc) {
    const cost = n > 0 ? (n / 1_000_000) * (PRICING_INPUT[currentModel] || 2.5) : 0;
    mc.textContent = isFree ? "$0.00 (local/free)" : `$${cost.toFixed(6)} input cost`;
  }

  // Context window
  const maxCtx = CONTEXT_WINDOW[currentModel] || 128000;
  const pct = Math.min(100, (n / maxCtx) * 100);
  const fill = document.getElementById("ctx-fill");
  if (fill) {
    fill.style.width = pct + "%";
    fill.style.background = pct < 60 ? "#10b981" : pct < 85 ? "#f59e0b" : "#ef4444";
  }
  const cu = document.getElementById("ctx-used");
  const cp = document.getElementById("ctx-pct");
  const cm = document.getElementById("ctx-max");
  const cr = document.getElementById("ctx-remaining");
  if (cu) cu.textContent = n >= 1000 ? (n/1000).toFixed(1)+"k" : n;
  if (cp) cp.textContent = pct.toFixed(1)+"%";
  if (cm) cm.textContent = (maxCtx/1000).toFixed(0)+"k";
  if (cr) cr.textContent = ((maxCtx-n)/1000).toFixed(0)+"k remaining";

  // Grid
  const mx = Math.max(...Object.values(counts), 1);
  for (const gi of GRID_INFO) {
    const v = counts[gi.key] || 0;
    const c = (v / 1_000_000) * (PRICING_INPUT[gi.key] || 1);
    const ve = document.getElementById(`gv-${gi.key}`);
    const gc = document.getElementById(`gc-${gi.key}`);
    const gb = document.getElementById(`gb-${gi.key}`);
    const gItem = document.getElementById(`gi-${gi.key}`);
    if (ve) ve.textContent = v.toLocaleString();
    if (gc) gc.textContent = v > 0 ? `$${c.toFixed(5)}` : "—";
    if (gb) gb.style.width = (v / mx * 100) + "%";
    if (gItem) {
      gItem.classList.toggle("active", gi.key === currentModel);
    }
  }

  // Stats
  const sc = document.getElementById("s-chars");
  const sw = document.getElementById("s-words");
  const sr = document.getElementById("s-ratio");
  const sch = document.getElementById("s-cheapest");
  if (sc) sc.textContent = text.length.toLocaleString();
  if (sw) sw.textContent = text.trim() ? text.trim().split(/\s+/).length.toLocaleString() : "0";
  if (sr) sr.textContent = n > 0 ? (text.length / n).toFixed(1) : "—";
  if (sch && n > 0) {
    const cheapest = GRID_INFO.reduce((b, gi) => {
      const c = (counts[gi.key]||0) / 1_000_000 * (PRICING_INPUT[gi.key]||1);
      return c < b.c ? { gi, c } : b;
    }, { gi: null, c: Infinity });
    if (cheapest.gi) { sch.textContent = cheapest.gi.label; sch.style.color = cheapest.gi.color; }
  }

  // Char count
  const cc = document.getElementById("char-count");
  if (cc) cc.textContent = `${text.length.toLocaleString()} chars`;

  // Energy
  if (n > 0) {
    const eng = calcEnergy(n, currentModel);
    const ew = document.getElementById("e-wh");
    const ec = document.getElementById("e-co2");
    const ee = document.getElementById("e-equiv");
    if (ew) ew.textContent = fmtEnergy(eng.wh);
    if (ec) ec.textContent = fmtCo2(eng.co2g);
    if (ee) ee.textContent = fmtEquiv(eng.wh, eng.searches);
  }

  // Token chips
  renderChips(text);

  // Status
  setStatus(n > 0 ? `${n.toLocaleString()} tokens · ${(text.length).toLocaleString()} chars` : "Ready — paste or type to begin", n > 0 ? "#a78bfa" : "#10b981");
}

function renderChips(text) {
  const el = document.getElementById("chips");
  if (!el) return;
  if (!text || !text.trim()) {
    el.innerHTML = '<div class="chips-empty">Start typing to see token breakdown…</div>';
    return;
  }
  const chunks = (text.match(/\S+|\s+/g) || []).filter(c => c.trim());
  if (!chunks.length) return;

  el.innerHTML = chunks.slice(0, 150).map(chunk => {
    const toks = estimateWordTokens(chunk);
    const sylls = countSyllables(chunk);
    const isPunct = /^[.,!?;:'"()\[\]{}\-]+$/.test(chunk);
    const cls = getChipClass(toks, isPunct);
    const safe = chunk.replace(/</g,"&lt;").replace(/>/g,"&gt;");
    return `<div class="chip ${cls}" title="${toks} token${toks!==1?'s':''} · ${sylls} syllable${sylls!==1?'s':''}">
      <span class="chip-word">${safe}</span>
      <span class="chip-meta">${sylls}syl·${toks}tok</span>
    </div>`;
  }).join("") + (chunks.length > 150 ? `<div class="chips-empty">+${chunks.length-150} more…</div>` : "");
}

// ── INPUT HANDLER ─────────────────────────────────────

document.getElementById("input").addEventListener("input", (e) => {
  clearTimeout(debTimer);
  debTimer = setTimeout(() => update(e.target.value), 120);
});

// ── MODEL SELECT ──────────────────────────────────────

function onModelChange() {
  currentModel = document.getElementById("model-select").value;
  const text = document.getElementById("input").value;
  if (text) update(text);
}

// ── TAB SWITCH ────────────────────────────────────────

function switchTab(name) {
  document.getElementById("tab-counter").style.display = name === "counter" ? "" : "none";
  document.getElementById("tab-local").style.display = name === "local" ? "" : "none";
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.tab === name));
}

// ── LOCAL MODEL ───────────────────────────────────────

function applyPreset(url, model) {
  document.getElementById("local-url").value = url;
  document.getElementById("local-model").value = model;
}

async function testConnection() {
  const url = document.getElementById("local-url").value.trim();
  const model = document.getElementById("local-model").value.trim();
  const statusEl = document.getElementById("conn-status");
  statusEl.style.display = "block";
  statusEl.className = "conn-status";
  statusEl.textContent = "Testing connection…";

  const result = await window.tokenizerAPI.testConnection({ url, model });
  statusEl.className = "conn-status " + (result.ok ? "conn-ok" : "conn-fail");
  statusEl.textContent = result.message;

  // If Ollama returned model list, populate dropdown
  if (result.ok && result.models && result.models.length > 0) {
    const wrap = document.getElementById("model-list-wrap");
    const sel = document.getElementById("model-list");
    sel.innerHTML = result.models.map(m => `<option value="${m}">${m}</option>`).join("");
    wrap.style.display = "";
    // Auto-fill model input with first model
    if (!document.getElementById("local-model").value || document.getElementById("local-model").value === "ollama") {
      document.getElementById("local-model").value = result.models[0];
    }
  }
}

async function countLocal() {
  const url = document.getElementById("local-url").value.trim();
  const model = document.getElementById("local-model").value.trim();
  const text = document.getElementById("input").value;
  if (!text.trim()) {
    document.getElementById("local-tok-badge").textContent = "← type something first";
    return;
  }

  document.getElementById("local-tok-num").textContent = "…";
  document.getElementById("local-tok-badge").textContent = "counting…";

  const result = await window.tokenizerAPI.countTokensLocal({ url, model, text });
  if (result.ok && result.tokens !== null) {
    document.getElementById("local-tok-num").textContent = result.tokens.toLocaleString();
    document.getElementById("local-tok-badge").textContent = `exact · ${model}`;
  } else {
    // Fall back to estimate
    const est = estCl100k(text);
    document.getElementById("local-tok-num").textContent = est.toLocaleString();
    document.getElementById("local-tok-badge").textContent = "estimated (API unavailable)";
  }
}

// ── STATUS ────────────────────────────────────────────

function setStatus(text, color) {
  const st = document.getElementById("status-text");
  const dot = document.getElementById("status-dot");
  if (st) st.textContent = text;
  if (dot) dot.style.background = color || "#10b981";
}

// ── INIT ──────────────────────────────────────────────

buildGrid();
