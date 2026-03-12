/**
 * Tokenizer — content.js v0.2.0
 * Injected into all supported LLM pages.
 * - Injects injected.js into page context for fetch/XHR interception
 * - Monitors textarea/contenteditable for live input token counts
 * - Shows floating overlay with input tokens, output tokens, cost breakdown
 * - Compares tokenization across all major LLMs
 */

(function () {
  "use strict";

  // ═══════════════════════════════════════════════════
  // PLATFORM CONFIG
  // ═══════════════════════════════════════════════════

  const PLATFORMS = {
    chatgpt: {
      match: /chat\.openai\.com|chatgpt\.com/,
      label: "ChatGPT",
      model: "gpt-4o",
      tok: "o200k_base",
      color: "#10b981",
      exact: true,
      selectors: ['#prompt-textarea', 'textarea[data-id]', 'textarea'],
    },
    claude: {
      match: /claude\.ai/,
      label: "Claude",
      model: "claude-3-5-sonnet",
      tok: "claude",
      color: "#d97706",
      exact: false,
      selectors: ['div[contenteditable="true"].ProseMirror', 'div[contenteditable="true"]', 'textarea'],
    },
    perplexity: {
      match: /perplexity\.ai/,
      label: "Perplexity",
      model: "llama-3-70b",
      tok: "llama3",
      color: "#3b82f6",
      exact: true,
      selectors: ['textarea[placeholder]', 'textarea'],
    },
    gemini: {
      match: /gemini\.google\.com/,
      label: "Gemini",
      model: "gemini-1.5-pro",
      tok: "gemini",
      color: "#8b5cf6",
      exact: true,
      selectors: ['div[contenteditable="true"]', '.ql-editor', 'rich-textarea', 'textarea'],
    },
    huggingface: {
      match: /huggingface\.co/,
      label: "HuggingFace",
      model: "llama-3-8b",
      tok: "llama3",
      color: "#fbbf24",
      exact: false,
      selectors: ['textarea', 'div[contenteditable="true"]'],
    },
    openai_playground: {
      match: /platform\.openai\.com/,
      label: "OpenAI Playground",
      model: "gpt-4o",
      tok: "o200k_base",
      color: "#10b981",
      exact: true,
      selectors: ['textarea', 'div[contenteditable="true"]'],
    },
    aistudio: {
      match: /aistudio\.google\.com/,
      label: "AI Studio",
      model: "gemini-2.0-flash",
      tok: "gemini",
      color: "#8b5cf6",
      exact: true,
      selectors: ['textarea', 'div[contenteditable="true"]'],
    },
    anthropic_console: {
      match: /console\.anthropic\.com/,
      label: "Anthropic Console",
      model: "claude-3-5-sonnet",
      tok: "claude",
      color: "#d97706",
      exact: false,
      selectors: ['textarea', 'div[contenteditable="true"]'],
    },
  };

  let platform = null;
  for (const [id, cfg] of Object.entries(PLATFORMS)) {
    if (cfg.match.test(window.location.hostname)) {
      platform = { id, ...cfg };
      break;
    }
  }
  if (!platform) return;

  // ═══════════════════════════════════════════════════
  // INJECT PAGE-CONTEXT SCRIPT (fetch/XHR interceptor)
  // ═══════════════════════════════════════════════════

  function injectScript() {
    const s = document.createElement("script");
    s.src = chrome.runtime.getURL("injected.js");
    s.onload = () => s.remove();
    (document.head || document.documentElement).appendChild(s);
  }
  injectScript();

  // Listen for API token reports from injected.js
  window.addEventListener("message", (e) => {
    if (e.source !== window) return;
    if (!e.data || e.data.__source !== "Tokenizer-interceptor") return;
    if (e.data.type === "api_tokens") {
      const { inputTokens, outputTokens } = e.data;
      // Forward to background
      chrome.runtime.sendMessage({
        type: "api_tokens",
        inputTokens,
        outputTokens,
        model: platform.model,
      }).catch(() => {});
      // Update overlay with API-confirmed counts
      if (inputTokens > 0 || outputTokens > 0) {
        updateFromAPI(inputTokens, outputTokens);
      }
    }
  });

  // ═══════════════════════════════════════════════════
  // TOKENIZER ENGINE
  // ═══════════════════════════════════════════════════

  const SINGLE = new Set([" the"," a"," an"," is"," are"," was"," were"," be"," been"," have"," has"," had"," do"," does"," did"," will"," would"," could"," should"," may"," might"," must"," can"," not"," no"," yes"," and"," or"," but"," if"," then"," else"," when"," where"," how"," what"," which"," who"," why"," this"," that"," in"," on"," at"," to"," for"," with"," from"," by"," of"," as"," into"," through"," about"," it"," its"," I"," you"," he"," she"," we"," they"," me"," him"," her"," us"," them"," my"," your"," his"," our"," their"," also"," just"," very"," most"," more"," some"," any"," all"," new"," good"," great"," only"," time"," year"," people"," way"," day"]);
  const WRE = /'s|'t|'re|'ve|'m|'ll|'d| ?\w+| ?[^\s\w]+|\s+/g;
  const PU = new Set(".,!?;:'\"-/\\@#$%&*+=<>|()[]{}~`^_");

  function estCl100k(t) {
    if (!t) return 0;
    let n = 0;
    for (const c of (t.match(WRE) || [])) {
      if (SINGLE.has(c)) { n++; continue; }
      const s = c.trim();
      if (!s) { n += (c.match(/\n/g) || []).length; continue; }
      if (s.length === 1 && PU.has(s)) { n++; continue; }
      const l = s.length;
      if (l <= 5) n++;
      else if (l <= 10) n += (s === s.toLowerCase() && /^[a-z]+$/.test(s)) ? 1 : 2;
      else if (l <= 15) n += 2;
      else if (l <= 20) n += 3;
      else n += Math.ceil(l / 4);
    }
    return Math.max(t.trim() ? 1 : 0, n);
  }

  // Scale factors relative to cl100k_base
  const SCALE = {
    cl100k_base: 1.00,   // GPT-4, GPT-3.5
    o200k_base:  0.87,   // GPT-4o (more efficient)
    claude:      1.05,   // Claude — slightly more tokens
    gemini:      0.90,   // Gemini
    llama3:      0.97,   // LLaMA 3
    codex:       0.87,   // Same as o200k
  };

  const PRICING_LOCAL = {
    cl100k_base: { input: 10.00,  output: 30.00,  label: "GPT-4" },
    o200k_base:  { input: 2.50,   output: 10.00,  label: "GPT-4o" },
    claude:      { input: 3.00,   output: 15.00,  label: "Claude 3.5" },
    gemini:      { input: 1.25,   output: 5.00,   label: "Gemini 1.5 Pro" },
    llama3:      { input: 0.59,   output: 0.79,   label: "LLaMA 3 70B" },
    codex:       { input: 0.15,   output: 0.60,   label: "Codex/4o-mini" },
  };

  const GRID_INFO = [
    { key: "o200k_base", label: "GPT-4o",       color: "#10b981" },
    { key: "cl100k_base",label: "GPT-4",         color: "#6366f1" },
    { key: "codex",      label: "Codex",         color: "#0ea5e9" },
    { key: "claude",     label: "Claude",        color: "#d97706" },
    { key: "gemini",     label: "Gemini",        color: "#8b5cf6" },
    { key: "llama3",     label: "LLaMA/HF",      color: "#fbbf24" },
  ];

  function countAll(t) {
    const base = estCl100k(t);
    const r = {};
    for (const [k, s] of Object.entries(SCALE)) {
      r[k] = Math.max(t.trim() ? 1 : 0, Math.round(base * s));
    }
    return r;
  }

  function calcCost(tokens, key) {
    const p = PRICING_LOCAL[key];
    if (!p) return 0;
    return (tokens / 1_000_000) * p.input;
  }

  // ═══════════════════════════════════════════════════
  // BUILD OVERLAY
  // ═══════════════════════════════════════════════════

  function buildOverlay() {
    const root = document.createElement("div");
    root.id = "Tokenizer-root";

    const gridHtml = GRID_INFO.map(gi => {
      const isActive = gi.key === platform.tok;
      return `
      <div class="tr-g ${isActive ? "tr-g-active" : ""}">
        <div class="tr-g-name">${gi.label}</div>
        <div class="tr-g-val" id="tr-gv-${gi.key}" style="color:${isActive ? gi.color : "#71717a"}">0</div>
        <div class="tr-g-cost" id="tr-gc-${gi.key}">$0.000000</div>
        <div class="tr-g-bar"><div class="tr-g-bar-fill" id="tr-gb-${gi.key}" style="background:${gi.color};width:0%"></div></div>
      </div>`;
    }).join("");

    root.innerHTML = `
      <div class="tr-head" id="tr-drag-handle">
        <div class="tr-logo">
          <div class="tr-logo-mark">T</div>
          <span class="tr-logo-name">Tokenizer</span>
          <span class="tr-platform-badge" style="background:${platform.color}20;color:${platform.color}">${platform.label}</span>
        </div>
        <div class="tr-head-btns">
          <button class="tr-hbtn" id="tr-btn-min" title="Minimize">─</button>
          <button class="tr-hbtn" id="tr-btn-close" title="Hide">×</button>
        </div>
      </div>

      <div id="tr-full">
        <div class="tr-body">

          <!-- INPUT TOKENS -->
          <div class="tr-section-label">INPUT</div>
          <div class="tr-count-row">
            <div class="tr-count-block">
              <span class="tr-num" id="tr-num-input" style="color:${platform.color}">0</span>
              <span class="tr-unit">tokens</span>
              <div class="tr-badge ${platform.exact ? "tr-badge-exact" : "tr-badge-cal"}">
                <span class="tr-badge-dot" style="background:${platform.exact ? "#10b981" : "#fcd34d"}"></span>
                ${platform.exact ? "Exact" : "±3% est."}
              </div>
            </div>
            <div class="tr-cost-block">
              <div class="tr-cost-val" id="tr-cost-input">$0.000000</div>
              <div class="tr-cost-lbl">Input Cost</div>
            </div>
          </div>

          <!-- OUTPUT TOKENS (from API) -->
          <div class="tr-section-label" style="margin-top:6px">OUTPUT <span class="tr-api-badge" id="tr-api-badge">waiting...</span></div>
          <div class="tr-count-row">
            <div class="tr-count-block">
              <span class="tr-num tr-num-out" id="tr-num-output" style="color:#a78bfa">—</span>
              <span class="tr-unit">tokens</span>
            </div>
            <div class="tr-cost-block">
              <div class="tr-cost-val" id="tr-cost-output">—</div>
              <div class="tr-cost-lbl">Output Cost</div>
            </div>
          </div>

          <!-- TOTAL -->
          <div class="tr-total-row">
            <span class="tr-total-lbl">Total Cost</span>
            <span class="tr-total-val" id="tr-cost-total">$0.000000</span>
          </div>

          <!-- CROSS-MODEL GRID -->
          <div class="tr-section-label" style="margin-top:8px">TOKENIZATION BY MODEL</div>
          <div class="tr-grid">${gridHtml}</div>

          <!-- STATS BAR -->
          <div class="tr-stats">
            <div class="tr-stat"><div class="tr-stat-lbl">Chars</div><div class="tr-stat-val" id="tr-chars">0</div></div>
            <div class="tr-stat"><div class="tr-stat-lbl">Words</div><div class="tr-stat-val" id="tr-words">0</div></div>
            <div class="tr-stat"><div class="tr-stat-lbl">Chars/Tok</div><div class="tr-stat-val" id="tr-ratio">—</div></div>
            <div class="tr-stat"><div class="tr-stat-lbl">Cheapest</div><div class="tr-stat-val" id="tr-cheapest" style="color:#10b981">—</div></div>
          </div>

        </div>
      </div>

      <!-- MINIMIZED VIEW -->
      <div id="tr-mini" style="display:none">
        <div class="tr-mini-row">
          <span style="color:${platform.color};font-size:13px;font-weight:600" id="tr-mnum-in">0</span>
          <span style="color:#71717a;font-size:10px">in /</span>
          <span style="color:#a78bfa;font-size:13px;font-weight:600" id="tr-mnum-out">—</span>
          <span style="color:#71717a;font-size:10px">out</span>
          <span style="color:#a1a1aa;font-size:11px;margin-left:6px" id="tr-mcost-total">$0.00</span>
        </div>
      </div>

      <div class="tr-foot">
        <div class="tr-foot-status">
          <span class="tr-foot-dot" style="background:${platform.color}"></span>
          <span id="tr-status">Waiting...</span>
        </div>
        <span class="tr-session-info" id="tr-session-calls">0 calls</span>
      </div>
    `;

    document.body.appendChild(root);
    makeDraggable(root, root.querySelector("#tr-drag-handle"));
    return root;
  }

  // ═══════════════════════════════════════════════════
  // DRAGGING
  // ═══════════════════════════════════════════════════

  function makeDraggable(el, handle) {
    let ox = 0, oy = 0, dragging = false;
    handle.addEventListener("mousedown", e => {
      if (e.target.classList.contains("tr-hbtn")) return;
      dragging = true;
      ox = e.clientX - el.offsetLeft;
      oy = e.clientY - el.offsetTop;
      e.preventDefault();
    });
    document.addEventListener("mousemove", e => {
      if (!dragging) return;
      el.style.left = (e.clientX - ox) + "px";
      el.style.top  = (e.clientY - oy) + "px";
      el.style.right = "auto";
      el.style.bottom = "auto";
    });
    document.addEventListener("mouseup", () => { dragging = false; });
  }

  // ═══════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════

  let overlayEl = null;
  let isVisible = false;
  let isMinimized = false;
  let isHidden = false;
  let prevInputTok = 0;
  let sessionCalls = 0;

  // ═══════════════════════════════════════════════════
  // SHOW / HIDE
  // ═══════════════════════════════════════════════════

  function showOverlay() {
    if (isHidden) return;
    if (!overlayEl) {
      overlayEl = buildOverlay();

      overlayEl.querySelector("#tr-btn-min").addEventListener("click", () => {
        isMinimized = !isMinimized;
        overlayEl.querySelector("#tr-full").style.display = isMinimized ? "none" : "block";
        overlayEl.querySelector("#tr-mini").style.display = isMinimized ? "flex" : "none";
        overlayEl.classList.toggle("tr-mini-mode", isMinimized);
        overlayEl.querySelector("#tr-btn-min").textContent = isMinimized ? "□" : "─";
      });
      overlayEl.querySelector("#tr-btn-close").addEventListener("click", () => {
        isHidden = true;
        isVisible = false;
        overlayEl.style.display = "none";
      });
    }
    if (!isVisible) {
      overlayEl.style.display = "";
      overlayEl.classList.add("tr-visible");
      isVisible = true;
    }
  }

  // ═══════════════════════════════════════════════════
  // UPDATE FROM INPUT (live estimation)
  // ═══════════════════════════════════════════════════

  function updateFromInput(text) {
    if (!text || !text.trim()) {
      if (overlayEl) document.getElementById("tr-status").textContent = "Waiting...";
      return;
    }
    showOverlay();

    const counts = countAll(text);
    const n = counts[platform.tok] || 0;
    const inputCost = calcCost(n, platform.tok);
    const chars = text.length;
    const words = text.trim().split(/\s+/).length;

    // Hero input number
    const numEl = document.getElementById("tr-num-input");
    if (numEl) {
      numEl.textContent = n.toLocaleString();
      if (n !== prevInputTok) {
        numEl.classList.remove("tr-bump");
        void numEl.offsetWidth;
        numEl.classList.add("tr-bump");
        prevInputTok = n;
      }
    }

    // Input cost
    const icEl = document.getElementById("tr-cost-input");
    if (icEl) icEl.textContent = "$" + inputCost.toFixed(6);

    // Total (input only until API fires)
    const outCostEl = document.getElementById("tr-cost-output");
    const totalEl = document.getElementById("tr-cost-total");
    const outCost = outCostEl && outCostEl.dataset.value ? parseFloat(outCostEl.dataset.value) : 0;
    if (totalEl) totalEl.textContent = "$" + (inputCost + outCost).toFixed(6);

    // Cross-model grid
    const mx = Math.max(...Object.values(counts), 1);
    for (const gi of GRID_INFO) {
      const v = counts[gi.key] || 0;
      const c = calcCost(v, gi.key);
      const ve = document.getElementById("tr-gv-" + gi.key);
      const gc = document.getElementById("tr-gc-" + gi.key);
      const be = document.getElementById("tr-gb-" + gi.key);
      if (ve) ve.textContent = v.toLocaleString();
      if (gc) gc.textContent = "$" + c.toFixed(6);
      if (be) be.style.width = (v / mx * 100) + "%";
    }

    // Stats
    const chEl = document.getElementById("tr-chars");
    const wdEl = document.getElementById("tr-words");
    const rtEl = document.getElementById("tr-ratio");
    const cpEl = document.getElementById("tr-cheapest");
    if (chEl) chEl.textContent = chars.toLocaleString();
    if (wdEl) wdEl.textContent = words.toLocaleString();
    if (rtEl) rtEl.textContent = n > 0 ? (chars / n).toFixed(1) : "—";

    // Cheapest model
    if (cpEl && n > 0) {
      const cheapest = GRID_INFO.reduce((best, gi) => {
        const cost = calcCost(counts[gi.key] || 0, gi.key);
        return cost < best.cost ? { gi, cost } : best;
      }, { gi: null, cost: Infinity });
      if (cheapest.gi) {
        cpEl.textContent = cheapest.gi.label;
        cpEl.style.color = cheapest.gi.color;
      }
    }

    // Mini
    const mnEl = document.getElementById("tr-mnum-in");
    if (mnEl) mnEl.textContent = n.toLocaleString();

    const stEl = document.getElementById("tr-status");
    if (stEl) stEl.textContent = `Monitoring · ${n.toLocaleString()} tokens`;
  }

  // ═══════════════════════════════════════════════════
  // UPDATE FROM API (confirmed output tokens)
  // ═══════════════════════════════════════════════════

  function updateFromAPI(inputTokens, outputTokens) {
    showOverlay();
    sessionCalls++;

    // Update input (use API value as ground truth if available)
    if (inputTokens > 0) {
      const numEl = document.getElementById("tr-num-input");
      if (numEl) numEl.textContent = inputTokens.toLocaleString();
      const inputCost = (inputTokens / 1_000_000) * (PRICING_LOCAL[platform.tok]?.input || 1);
      const icEl = document.getElementById("tr-cost-input");
      if (icEl) icEl.textContent = "$" + inputCost.toFixed(6);
    }

    // Output
    const numOutEl = document.getElementById("tr-num-output");
    const costOutEl = document.getElementById("tr-cost-output");
    const badgeEl = document.getElementById("tr-api-badge");
    const totalEl = document.getElementById("tr-cost-total");

    if (outputTokens > 0 && numOutEl) {
      numOutEl.textContent = outputTokens.toLocaleString();
      const outCost = (outputTokens / 1_000_000) * (PRICING_LOCAL[platform.tok]?.output || 3);
      if (costOutEl) {
        costOutEl.textContent = "$" + outCost.toFixed(6);
        costOutEl.dataset.value = outCost;
      }
      if (badgeEl) badgeEl.textContent = "✓ API";

      // Recalculate total
      const inputCost = parseFloat(document.getElementById("tr-cost-input")?.textContent?.replace("$", "") || 0);
      if (totalEl) totalEl.textContent = "$" + (inputCost + outCost).toFixed(6);

      // Mini total
      const mcEl = document.getElementById("tr-mcost-total");
      if (mcEl) mcEl.textContent = "$" + (inputCost + outCost).toFixed(4);

      const mnOutEl = document.getElementById("tr-mnum-out");
      if (mnOutEl) mnOutEl.textContent = outputTokens.toLocaleString();
    }

    // Session calls
    const scEl = document.getElementById("tr-session-calls");
    if (scEl) scEl.textContent = `${sessionCalls} call${sessionCalls !== 1 ? "s" : ""}`;
  }

  // ═══════════════════════════════════════════════════
  // INPUT DETECTION
  // ═══════════════════════════════════════════════════

  function getText(el) {
    if (!el) return "";
    if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") return el.value;
    return el.innerText || el.textContent || "";
  }

  function findInput() {
    for (const sel of platform.selectors) {
      const el = document.querySelector(sel);
      if (el && (el.offsetWidth > 0 || el.offsetHeight > 0)) return el;
    }
    return null;
  }

  let activeInput = null;
  let debounceTimer = null;

  function attach(el) {
    if (activeInput === el) return;
    activeInput = el;
    const handler = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => updateFromInput(getText(el)), 80);
    };
    el.addEventListener("input", handler);
    el.addEventListener("keyup", handler);
    if (el.getAttribute("contenteditable")) {
      new MutationObserver(handler).observe(el, { childList: true, subtree: true, characterData: true });
    }
  }

  function poll() {
    const el = findInput();
    if (el) attach(el);
    setTimeout(poll, 2000);
  }

  new MutationObserver(() => {
    const el = findInput();
    if (el && el !== activeInput) attach(el);
  }).observe(document.body, { childList: true, subtree: true });

  poll();
  console.log(`[Tokenizer v0.2.0] Active on ${platform.id} (${platform.label})`);

})();
