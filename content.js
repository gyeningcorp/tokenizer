/**
 * Tokenizer — content.js v0.4.0
 * Live token counting on 30+ LLM platforms.
 * Auto-detects platform on page load, shows overlay immediately.
 */

(function () {
  "use strict";

  // ═══════════════════════════════════════════════════
  // PLATFORM REGISTRY — 30+ platforms
  // ═══════════════════════════════════════════════════

  const PLATFORMS = {

    // ── MAJOR LLMs ───────────────────────────────────
    chatgpt: {
      match: /chat\.openai\.com|chatgpt\.com/,
      label: "ChatGPT", color: "#10b981", tok: "o200k_base", model: "gpt-4o",
      costPer1k: 0.0025, exact: true,
      subLabel: () => {
        const m = document.querySelector('[aria-label*="GPT"], .model-switcher, [data-testid*="model"]');
        return m ? m.textContent.trim().slice(0,20) : "GPT-4o";
      },
      selectors: ['#prompt-textarea','textarea[data-id]','div[contenteditable="true"][id="prompt-textarea"]','textarea'],
    },

    claude: {
      match: /claude\.ai/,
      label: "Claude", color: "#d97706", tok: "claude", model: "claude-3-5-sonnet",
      costPer1k: 0.003, exact: false,
      subLabel: () => {
        const p = window.location.pathname;
        if (p.includes("/code")) return "Claude Code";
        if (p.includes("/project")) return "Project";
        if (p.includes("/new")) return "New Chat";
        return "Claude";
      },
      selectors: ['div[contenteditable="true"].ProseMirror','[data-placeholder*="message"]','[data-placeholder*="Reply"]','div[contenteditable="true"]','textarea'],
    },

    gemini: {
      match: /gemini\.google\.com/,
      label: "Gemini", color: "#8b5cf6", tok: "gemini", model: "gemini-1.5-pro",
      costPer1k: 0.00035, exact: true,
      subLabel: () => "Gemini",
      selectors: ['div[contenteditable="true"]','.ql-editor','rich-textarea','textarea'],
    },

    perplexity: {
      match: /perplexity\.ai/,
      label: "Perplexity", color: "#3b82f6", tok: "llama3", model: "llama-3-70b",
      costPer1k: 0.0008, exact: true,
      subLabel: () => "Perplexity",
      selectors: ['textarea[placeholder]','textarea'],
    },

    grok: {
      match: /grok\.com|x\.com\/i\/grok/,
      label: "Grok", color: "#ffffff", tok: "grok", model: "grok-2",
      costPer1k: 0.005, exact: false,
      subLabel: () => "Grok",
      selectors: ['textarea','div[contenteditable="true"]','[data-testid="tweetTextarea_0"]'],
    },

    deepseek: {
      match: /chat\.deepseek\.com/,
      label: "DeepSeek", color: "#4f8ef7", tok: "deepseek", model: "deepseek-v3",
      costPer1k: 0.00014, exact: false,
      subLabel: () => "DeepSeek",
      selectors: ['textarea','div[contenteditable="true"]','#chat-input'],
    },

    mistral: {
      match: /chat\.mistral\.ai/,
      label: "Mistral", color: "#f97316", tok: "mistral", model: "mistral-large",
      costPer1k: 0.0003, exact: false,
      subLabel: () => "Mistral",
      selectors: ['textarea','div[contenteditable="true"]'],
    },

    copilot: {
      match: /copilot\.microsoft\.com/,
      label: "Copilot", color: "#0078d4", tok: "o200k_base", model: "gpt-4o",
      costPer1k: 0.0025, exact: true,
      subLabel: () => "Microsoft Copilot",
      selectors: ['textarea','div[contenteditable="true"]','[aria-label*="message"]','[aria-label*="Ask"]'],
    },

    metaai: {
      match: /meta\.ai/,
      label: "Meta AI", color: "#1877f2", tok: "llama3", model: "llama-3-70b",
      costPer1k: 0, exact: false,
      subLabel: () => "Meta AI (Free)",
      selectors: ['div[contenteditable="true"]','textarea','[aria-label*="message"]'],
    },

    // ── AGGREGATORS ──────────────────────────────────
    huggingface: {
      match: /huggingface\.co/,
      label: "HuggingFace", color: "#fbbf24", tok: "llama3", model: "llama-3-8b",
      costPer1k: 0.0006, exact: false,
      subLabel: () => {
        const m = document.querySelector('h1,[class*="model-name"]');
        return m ? m.textContent.trim().slice(0,25) : "HuggingChat";
      },
      selectors: ['textarea','div[contenteditable="true"]'],
    },

    poe: {
      match: /poe\.com/,
      label: "Poe", color: "#6366f1", tok: "cl100k_base", model: "gpt-4",
      costPer1k: 0.003, exact: false,
      subLabel: () => {
        const bot = document.querySelector('[class*="botName"],[class*="BotName"]');
        return bot ? bot.textContent.trim().slice(0,20) : "Poe";
      },
      selectors: ['textarea[class*="GrowingTextArea"]','textarea','div[contenteditable="true"]'],
    },

    youcom: {
      match: /you\.com/,
      label: "You.com", color: "#ec4899", tok: "cl100k_base", model: "gpt-4",
      costPer1k: 0.002, exact: false,
      subLabel: () => "You.com",
      selectors: ['textarea','div[contenteditable="true"]','[id*="search"]'],
    },

    pi: {
      match: /pi\.ai/,
      label: "Pi", color: "#a78bfa", tok: "cl100k_base", model: "inflection-2.5",
      costPer1k: 0.0015, exact: false,
      subLabel: () => "Pi (Inflection)",
      selectors: ['textarea','div[contenteditable="true"]','[placeholder*="Talk"]'],
    },

    cohere: {
      match: /coral\.cohere\.com/,
      label: "Cohere Coral", color: "#d946ef", tok: "cl100k_base", model: "command-r-plus",
      costPer1k: 0.003, exact: false,
      subLabel: () => "Command R+",
      selectors: ['textarea','div[contenteditable="true"]'],
    },

    lmsys: {
      match: /chat\.lmsys\.org/,
      label: "LMSYS Arena", color: "#14b8a6", tok: "cl100k_base", model: "various",
      costPer1k: 0.001, exact: false,
      subLabel: () => "Chatbot Arena",
      selectors: ['textarea','div[contenteditable="true"]','[placeholder*="Enter"]'],
    },

    // ── AI CODING TOOLS ───────────────────────────────
    cursor: {
      match: /cursor\.com/,
      label: "Cursor", color: "#f59e0b", tok: "o200k_base", model: "gpt-4o",
      costPer1k: 0.0025, exact: false,
      subLabel: () => "Cursor AI",
      selectors: ['textarea','div[contenteditable="true"]','[class*="input"]'],
    },

    bolt: {
      match: /bolt\.new/,
      label: "Bolt", color: "#7c3aed", tok: "cl100k_base", model: "claude-3-5-sonnet",
      costPer1k: 0.003, exact: false,
      subLabel: () => "Bolt.new",
      selectors: ['textarea','div[contenteditable="true"]','[placeholder*="prompt"]','[placeholder*="build"]'],
    },

    v0: {
      match: /v0\.dev/,
      label: "v0", color: "#000000", tok: "o200k_base", model: "gpt-4o",
      costPer1k: 0.0025, exact: false,
      subLabel: () => "v0 by Vercel",
      selectors: ['textarea','div[contenteditable="true"]','[placeholder*="Describe"]'],
    },

    replit: {
      match: /replit\.com/,
      label: "Replit", color: "#f55f27", tok: "cl100k_base", model: "gpt-4o",
      costPer1k: 0.002, exact: false,
      subLabel: () => "Replit AI",
      selectors: ['textarea','div[contenteditable="true"]','[class*="chat-input"]'],
    },

    phind: {
      match: /phind\.com/,
      label: "Phind", color: "#10b981", tok: "cl100k_base", model: "phind-70b",
      costPer1k: 0.0007, exact: false,
      subLabel: () => "Phind",
      selectors: ['textarea','div[contenteditable="true"]','[placeholder*="Search"]'],
    },

    devv: {
      match: /devv\.ai/,
      label: "Devv", color: "#6366f1", tok: "cl100k_base", model: "gpt-4",
      costPer1k: 0.001, exact: false,
      subLabel: () => "Devv.ai",
      selectors: ['textarea','div[contenteditable="true"]'],
    },

    codeium: {
      match: /codeium\.com/,
      label: "Codeium", color: "#09b274", tok: "cl100k_base", model: "codeium",
      costPer1k: 0, exact: false,
      subLabel: () => "Codeium Chat",
      selectors: ['textarea','div[contenteditable="true"]','[class*="chat"]'],
    },

    // ── API PLAYGROUNDS ───────────────────────────────
    fireworks: {
      match: /app\.fireworks\.ai/,
      label: "Fireworks", color: "#ff6b35", tok: "llama3", model: "llama-3-70b",
      costPer1k: 0.0009, exact: false,
      subLabel: () => "Fireworks AI",
      selectors: ['textarea','div[contenteditable="true"]'],
    },

    groq: {
      match: /console\.groq\.com/,
      label: "Groq", color: "#f9a825", tok: "llama3", model: "llama-3-70b",
      costPer1k: 0.00059, exact: false,
      subLabel: () => {
        const m = document.querySelector('[class*="model"],[data-model]');
        return m ? m.textContent.trim().slice(0,20) : "Groq";
      },
      selectors: ['textarea','div[contenteditable="true"]','[placeholder*="message"]'],
    },

    together: {
      match: /app\.together\.ai/,
      label: "Together AI", color: "#4ade80", tok: "llama3", model: "llama-3-70b",
      costPer1k: 0.0009, exact: false,
      subLabel: () => "Together AI",
      selectors: ['textarea','div[contenteditable="true"]'],
    },

    vercel_sdk: {
      match: /sdk\.vercel\.ai/,
      label: "Vercel AI SDK", color: "#000000", tok: "o200k_base", model: "gpt-4o",
      costPer1k: 0.0025, exact: false,
      subLabel: () => "AI SDK Playground",
      selectors: ['textarea','div[contenteditable="true"]'],
    },

    aistudio: {
      match: /aistudio\.google\.com/,
      label: "AI Studio", color: "#8b5cf6", tok: "gemini", model: "gemini-2.0-flash",
      costPer1k: 0.0001, exact: true,
      subLabel: () => "Google AI Studio",
      selectors: ['textarea','div[contenteditable="true"]','[placeholder*="prompt"]'],
    },

    openai_playground: {
      match: /platform\.openai\.com/,
      label: "OAI Playground", color: "#10b981", tok: "o200k_base", model: "gpt-4o",
      costPer1k: 0.0025, exact: true,
      subLabel: () => "Codex / Playground",
      selectors: ['textarea','div[contenteditable="true"]'],
    },

    anthropic_console: {
      match: /console\.anthropic\.com/,
      label: "Anthropic", color: "#d97706", tok: "claude", model: "claude-3-5-sonnet",
      costPer1k: 0.003, exact: false,
      subLabel: () => "Anthropic Console",
      selectors: ['textarea','div[contenteditable="true"]'],
    },

    // ── LOCAL / SELF-HOSTED ───────────────────────────
    lmstudio: {
      match: /lmstudio\.ai|localhost:1234/,
      label: "LM Studio", color: "#a855f7", tok: "cl100k_base", model: "local",
      costPer1k: 0, exact: false,
      subLabel: () => "LM Studio (Local)",
      selectors: ['textarea','div[contenteditable="true"]','[placeholder*="Type"]'],
    },

    jan: {
      match: /jan\.ai/,
      label: "Jan", color: "#64748b", tok: "cl100k_base", model: "local",
      costPer1k: 0, exact: false,
      subLabel: () => "Jan (Local)",
      selectors: ['textarea','div[contenteditable="true"]'],
    },

    msty: {
      match: /msty\.app/,
      label: "Msty", color: "#8b5cf6", tok: "cl100k_base", model: "local",
      costPer1k: 0, exact: false,
      subLabel: () => "Msty (Local)",
      selectors: ['textarea','div[contenteditable="true"]'],
    },

    // ── LOCAL / SELF-HOSTED (localhost) ───────────────
    ollama_webui: {
      match: /localhost:3000|127\.0\.0\.1:3000|localhost:8080|127\.0\.0\.1:8080/,
      label: "Open WebUI", color: "#a78bfa", tok: "cl100k_base", model: "local",
      costPer1k: 0, exact: false,
      subLabel: () => {
        const m = document.querySelector('[class*="model"],[data-model],.model-selector');
        return m ? "Open WebUI · " + m.textContent.trim().slice(0,15) : "Open WebUI";
      },
      selectors: ['textarea','div[contenteditable="true"]','#chat-input','[placeholder*="message"]','[placeholder*="Send"]'],
    },

    ollama: {
      match: /localhost:11434|127\.0\.0\.1:11434/,
      label: "Ollama", color: "#f97316", tok: "cl100k_base", model: "local",
      costPer1k: 0, exact: false,
      subLabel: () => "Ollama (Local)",
      selectors: ['textarea','div[contenteditable="true"]'],
    },

    lmstudio_local: {
      match: /localhost:1234|127\.0\.0\.1:1234/,
      label: "LM Studio", color: "#a855f7", tok: "cl100k_base", model: "local",
      costPer1k: 0, exact: false,
      subLabel: () => "LM Studio (Local)",
      selectors: ['textarea','div[contenteditable="true"]','[placeholder*="Type"]','[placeholder*="Send"]'],
    },

    jan_local: {
      match: /localhost:1337|127\.0\.0\.1:1337/,
      label: "Jan", color: "#64748b", tok: "cl100k_base", model: "local",
      costPer1k: 0, exact: false,
      subLabel: () => "Jan (Local)",
      selectors: ['textarea','div[contenteditable="true"]'],
    },

    anything_llm: {
      match: /localhost:3001|127\.0\.0\.1:3001/,
      label: "AnythingLLM", color: "#10b981", tok: "cl100k_base", model: "local",
      costPer1k: 0, exact: false,
      subLabel: () => "AnythingLLM (Local)",
      selectors: ['textarea','div[contenteditable="true"]','[placeholder*="Send a message"]'],
    },

    localai: {
      match: /localhost:8080|127\.0\.0\.1:8080/,
      label: "LocalAI", color: "#3b82f6", tok: "cl100k_base", model: "local",
      costPer1k: 0, exact: false,
      subLabel: () => "LocalAI (Local)",
      selectors: ['textarea','div[contenteditable="true"]'],
    },

    // Generic localhost fallback — catches any other local LLM UI
    localhost_generic: {
      match: /^localhost|^127\.0\.0\.1/,
      label: "Local LLM", color: "#71717a", tok: "cl100k_base", model: "local",
      costPer1k: 0, exact: false,
      subLabel: () => "Local LLM · " + window.location.port,
      selectors: ['textarea','div[contenteditable="true"]','[placeholder*="message"]','[placeholder*="Send"]','[placeholder*="Ask"]','[placeholder*="Type"]'],
    },
  };

  // Detect current platform
  let platform = null;
  const host = window.location.hostname + window.location.pathname;
  for (const [id, cfg] of Object.entries(PLATFORMS)) {
    if (cfg.match.test(host)) {
      platform = { id, ...cfg };
      break;
    }
  }
  if (!platform) return;

  // ═══════════════════════════════════════════════════
  // INJECT PAGE-CONTEXT FETCH/XHR INTERCEPTOR
  // ═══════════════════════════════════════════════════

  (function injectScript() {
    const s = document.createElement("script");
    s.src = chrome.runtime.getURL("injected.js");
    s.onload = () => s.remove();
    (document.head || document.documentElement).appendChild(s);
  })();

  window.addEventListener("message", (e) => {
    if (e.source !== window || !e.data || e.data.__source !== "tokenizer-interceptor") return;
    if (e.data.type === "api_tokens") {
      const { inputTokens, outputTokens } = e.data;
      chrome.runtime.sendMessage({ type: "api_tokens", inputTokens, outputTokens, model: platform.model }).catch(() => {});
      if (inputTokens > 0 || outputTokens > 0) updateFromAPI(inputTokens, outputTokens);
    }
  });

  // ═══════════════════════════════════════════════════
  // TOKENIZER ENGINE
  // ═══════════════════════════════════════════════════

  const SINGLE = new Set([" the"," a"," an"," is"," are"," was"," were"," be"," been"," have"," has"," had"," do"," does"," did"," will"," would"," could"," should"," may"," might"," must"," can"," not"," no"," yes"," and"," or"," but"," if"," then"," else"," when"," where"," how"," what"," which"," who"," why"," this"," that"," in"," on"," at"," to"," for"," with"," from"," by"," of"," as"," into"," through"," about"," it"," its"," I"," you"," he"," she"," we"," they"," me"," him"," her"," us"," them"," my"," your"," his"," our"," their"," also"," just"," very"," most"," more"," some"," any"," all"," new"," good"]);
  const WRE = /'s|'t|'re|'ve|'m|'ll|'d| ?\w+| ?[^\s\w]+|\s+/g;
  const PU  = new Set(".,!?;:'\"-/\\@#$%&*+=<>|()[]{}~`^_");

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

  // Scale factors vs cl100k_base
  const SCALE = {
    cl100k_base: 1.00,
    o200k_base:  0.87,
    claude:      1.05,
    gemini:      0.90,
    llama3:      0.97,
    mistral:     0.95,
    deepseek:    1.10,
    grok:        0.92,
    codex:       0.87,
  };

  // Pricing per 1M tokens (input)
  const PRICING_INPUT = {
    cl100k_base: 10.00,
    o200k_base:   2.50,
    claude:        3.00,
    gemini:        1.25,
    llama3:        0.59,
    mistral:       0.30,
    deepseek:      0.14,
    grok:          5.00,
    codex:         0.15,
  };
  const PRICING_OUTPUT = {
    cl100k_base: 30.00,
    o200k_base:  10.00,
    claude:      15.00,
    gemini:       5.00,
    llama3:       0.79,
    mistral:      0.90,
    deepseek:     0.28,
    grok:        15.00,
    codex:        0.60,
  };

  const GRID_INFO = [
    { key: "o200k_base",  label: "GPT-4o",   color: "#10b981" },
    { key: "claude",      label: "Claude",   color: "#d97706" },
    { key: "gemini",      label: "Gemini",   color: "#8b5cf6" },
    { key: "llama3",      label: "LLaMA",    color: "#fbbf24" },
    { key: "deepseek",    label: "DeepSeek", color: "#4f8ef7" },
    { key: "mistral",     label: "Mistral",  color: "#f97316" },
  ];

  function countAll(t) {
    const base = estCl100k(t);
    const r = {};
    for (const [k, s] of Object.entries(SCALE)) r[k] = Math.max(t.trim()?1:0, Math.round(base*s));
    return r;
  }

  function calcInputCost(tokens, key) {
    return ((PRICING_INPUT[key]||1) / 1_000_000) * tokens;
  }

  // ═══════════════════════════════════════════════════
  // ENERGY ENGINE
  // Data center energy per 1M tokens (Wh) — based on published
  // ML inference benchmarks and IEA/Goldman Sachs AI energy reports.
  // Sources: Goldman Sachs (2024), IEA AI Energy Report (2024),
  //          Patterson et al. "Carbon Footprint of ML" (2022)
  // US avg grid: 0.386 kg CO2/kWh (EPA 2023 eGRID)
  // ═══════════════════════════════════════════════════

  // Wh per 1M tokens (input inference only)
  const ENERGY_WH_PER_1M = {
    o200k_base:  4000,   // GPT-4o class — ~4 Wh/1K tokens
    cl100k_base: 8000,   // GPT-4 class (older dense model)
    claude:      3500,   // Claude Sonnet — Anthropic's efficient infra
    gemini:      2000,   // Gemini — Google TPU v5 efficiency advantage
    llama3:      5000,   // LLaMA 3 70B — open source, less optimized DC
    mistral:     3000,   // Mistral — efficient MoE architecture
    deepseek:    2500,   // DeepSeek — MoE, Chinese DC infrastructure
    grok:        4500,   // Grok — xAI data center (Memphis)
    codex:       1500,   // Codex / GPT-4o-mini — small model
  };

  // kg CO2 per kWh — US average (EPA 2023)
  const CO2_KG_PER_KWH = 0.386;

  // Fun equivalents for context
  const GOOGLE_SEARCH_WH = 0.3;   // 1 Google search ≈ 0.3 Wh
  const LED_BULB_10W_WH  = 10;    // 10W LED for 1 hour = 10 Wh
  const IPHONE_CHARGE_WH = 19;    // Full iPhone charge ≈ 19 Wh

  function calcEnergy(tokens, tokKey) {
    const whPer1M = ENERGY_WH_PER_1M[tokKey] || 4000;
    const wh      = (tokens / 1_000_000) * whPer1M;
    const kwh     = wh / 1000;
    const co2g    = kwh * CO2_KG_PER_KWH * 1000; // grams
    const searches = wh / GOOGLE_SEARCH_WH;
    return { wh, kwh, co2g, searches };
  }

  function fmtEnergy(wh) {
    if (wh < 0.001) return (wh * 1000).toFixed(4) + " μWh";
    if (wh < 1)     return (wh * 1000).toFixed(3) + " mWh";
    if (wh < 1000)  return wh.toFixed(3) + " Wh";
    return (wh / 1000).toFixed(4) + " kWh";
  }

  function fmtEquiv(wh, searches) {
    if (wh < GOOGLE_SEARCH_WH * 0.1) return "< 1/10 Google search";
    if (searches < 1) return `${(searches * 100).toFixed(0)}% of 1 Google search`;
    if (searches < 10) return `≈ ${searches.toFixed(1)} Google searches`;
    const ledSec = (wh / LED_BULB_10W_WH) * 3600;
    if (ledSec < 60) return `LED bulb for ${ledSec.toFixed(0)}s`;
    if (ledSec < 3600) return `LED bulb for ${(ledSec/60).toFixed(0)}min`;
    return `LED bulb for ${(ledSec/3600).toFixed(1)}hr`;
  }

  // ═══════════════════════════════════════════════════
  // OVERLAY
  // ═══════════════════════════════════════════════════

  function buildOverlay() {
    const root = document.createElement("div");
    root.id = "tokenizer-root";
    const subLabel = typeof platform.subLabel === "function" ? platform.subLabel() : platform.label;
    const isFree = platform.costPer1k === 0;
    const costLabel = isFree ? "Free" : `$${platform.costPer1k}/1K`;

    const gridHtml = GRID_INFO.map(gi => {
      const isActive = gi.key === platform.tok;
      return `<div class="tr-g ${isActive?"tr-g-active":""}">
        <div class="tr-g-name">${gi.label}</div>
        <div class="tr-g-val" id="tr-gv-${gi.key}" style="color:${isActive?gi.color:"#71717a"}">0</div>
        <div class="tr-g-cost" id="tr-gc-${gi.key}">—</div>
        <div class="tr-g-bar"><div class="tr-g-bar-fill" id="tr-gb-${gi.key}" style="background:${gi.color};width:0%"></div></div>
      </div>`;
    }).join("");

    root.innerHTML = `
      <div class="tr-head" id="tr-drag-handle">
        <div class="tr-logo">
          <div class="tr-logo-mark">T</div>
          <div class="tr-logo-text">
            <span class="tr-logo-name">Tokenizer</span>
            <span class="tr-platform-badge" style="background:${platform.color}22;color:${platform.color}">${subLabel}</span>
          </div>
        </div>
        <div class="tr-head-btns">
          <button class="tr-hbtn" id="tr-btn-min" title="Minimize">─</button>
          <button class="tr-hbtn" id="tr-btn-close" title="Hide">×</button>
        </div>
      </div>

      <div id="tr-full">
        <div class="tr-body">
          <div class="tr-section-label">INPUT</div>
          <div class="tr-count-row">
            <div class="tr-count-block">
              <span class="tr-num" id="tr-num-input" style="color:${platform.color}">0</span>
              <span class="tr-unit">tokens</span>
              <div class="tr-badge ${platform.exact?"tr-badge-exact":"tr-badge-cal"}">
                <span class="tr-badge-dot" style="background:${platform.exact?"#10b981":"#fcd34d"}"></span>
                ${platform.exact?"Exact":"±3-5% est."}
              </div>
            </div>
            <div class="tr-cost-block">
              <div class="tr-cost-val" id="tr-cost-input">${isFree?"Free":"$0.000000"}</div>
              <div class="tr-cost-lbl">${costLabel}</div>
            </div>
          </div>

          <div class="tr-section-label" style="margin-top:7px">OUTPUT <span class="tr-api-badge" id="tr-api-badge">intercepting...</span></div>
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

          <div class="tr-total-row">
            <span class="tr-total-lbl">Total Cost</span>
            <span class="tr-total-val" id="tr-cost-total">${isFree?"Free":"$0.000000"}</span>
          </div>

          <div class="tr-section-label" style="margin-top:8px">BY MODEL</div>
          <div class="tr-grid">${gridHtml}</div>

          <div class="tr-stats">
            <div class="tr-stat"><div class="tr-stat-lbl">Chars</div><div class="tr-stat-val" id="tr-chars">0</div></div>
            <div class="tr-stat"><div class="tr-stat-lbl">Words</div><div class="tr-stat-val" id="tr-words">0</div></div>
            <div class="tr-stat"><div class="tr-stat-lbl">Chars/Tok</div><div class="tr-stat-val" id="tr-ratio">—</div></div>
            <div class="tr-stat"><div class="tr-stat-lbl">Cheapest</div><div class="tr-stat-val" id="tr-cheapest" style="color:#10b981">—</div></div>
          </div>

          <div class="tr-energy-block" id="tr-energy-block">
            <div class="tr-energy-head">
              <span class="tr-energy-icon">⚡</span>
              <span class="tr-section-label" style="margin:0">DATA CENTER POWER</span>
              <span class="tr-energy-src" title="Based on IEA AI Energy Report 2024 + EPA eGRID 2023">est.</span>
            </div>
            <div class="tr-energy-row">
              <div class="tr-energy-stat">
                <div class="tr-energy-lbl">Energy Used</div>
                <div class="tr-energy-val" id="tr-energy-wh" style="color:#f59e0b">—</div>
              </div>
              <div class="tr-energy-stat">
                <div class="tr-energy-lbl">CO₂ Emitted</div>
                <div class="tr-energy-val" id="tr-energy-co2" style="color:#6ee7b7">—</div>
              </div>
            </div>
            <div class="tr-energy-equiv" id="tr-energy-equiv">—</div>
            <div class="tr-energy-bar-wrap">
              <div class="tr-energy-bar-track">
                <div class="tr-energy-bar-fill" id="tr-energy-bar" style="width:0%;background:linear-gradient(90deg,#f59e0b,#ef4444)"></div>
              </div>
              <span class="tr-energy-bar-lbl" id="tr-energy-bar-lbl">0 searches equiv.</span>
            </div>
          </div>
        </div>
      </div>

      <div id="tr-mini" style="display:none">
        <div class="tr-mini-row">
          <span style="color:${platform.color};font-size:13px;font-weight:600" id="tr-mnum-in">0</span>
          <span style="color:#71717a;font-size:10px">in /</span>
          <span style="color:#a78bfa;font-size:13px;font-weight:600" id="tr-mnum-out">—</span>
          <span style="color:#71717a;font-size:10px">out</span>
          <span style="color:#a1a1aa;font-size:11px;margin-left:6px" id="tr-mcost-total">${isFree?"Free":"$0.00"}</span>
        </div>
      </div>

      <div class="tr-foot">
        <div class="tr-foot-status">
          <span class="tr-foot-dot" id="tr-status-dot" style="background:${platform.color}"></span>
          <span id="tr-status">Detected — start typing</span>
        </div>
        <span class="tr-session-info" id="tr-session-calls">0 calls</span>
      </div>
    `;

    document.body.appendChild(root);
    makeDraggable(root, root.querySelector("#tr-drag-handle"));
    return root;
  }

  function makeDraggable(el, handle) {
    let ox=0,oy=0,drag=false;
    handle.addEventListener("mousedown", e => {
      if (e.target.classList.contains("tr-hbtn")) return;
      drag=true; ox=e.clientX-el.offsetLeft; oy=e.clientY-el.offsetTop; e.preventDefault();
    });
    document.addEventListener("mousemove", e => {
      if (!drag) return;
      el.style.left=(e.clientX-ox)+"px"; el.style.top=(e.clientY-oy)+"px";
      el.style.right="auto"; el.style.bottom="auto";
    });
    document.addEventListener("mouseup", ()=>{ drag=false; });
  }

  // ═══════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════

  let overlayEl=null, isMinimized=false, isHidden=false, prevTok=0, sessionCalls=0;

  function initOverlay() {
    if (isHidden || overlayEl) return;
    overlayEl = buildOverlay();
    overlayEl.classList.add("tr-visible");

    overlayEl.querySelector("#tr-btn-min").addEventListener("click", () => {
      isMinimized = !isMinimized;
      overlayEl.querySelector("#tr-full").style.display = isMinimized?"none":"block";
      overlayEl.querySelector("#tr-mini").style.display = isMinimized?"flex":"none";
      overlayEl.classList.toggle("tr-mini-mode", isMinimized);
      overlayEl.querySelector("#tr-btn-min").textContent = isMinimized?"□":"─";
    });
    overlayEl.querySelector("#tr-btn-close").addEventListener("click", ()=>{
      isHidden=true; overlayEl.style.display="none";
    });
  }

  function pulse(text, color) {
    const dot=document.getElementById("tr-status-dot");
    const st=document.getElementById("tr-status");
    if(dot) dot.style.background = color||platform.color;
    if(st) st.textContent = text;
  }

  // ═══════════════════════════════════════════════════
  // UPDATE FROM TYPING
  // ═══════════════════════════════════════════════════

  function updateFromInput(text) {
    if (!text||!text.trim()) { pulse("Detected — start typing", platform.color); return; }

    const counts = countAll(text);
    const n = counts[platform.tok]||0;
    const inCost = calcInputCost(n, platform.tok);
    const isFree = platform.costPer1k===0;

    const numEl = document.getElementById("tr-num-input");
    if (numEl) {
      numEl.textContent = n.toLocaleString();
      if (n!==prevTok) { numEl.classList.remove("tr-bump"); void numEl.offsetWidth; numEl.classList.add("tr-bump"); prevTok=n; }
    }

    const icEl = document.getElementById("tr-cost-input");
    if (icEl) icEl.textContent = isFree?"Free":"$"+inCost.toFixed(6);

    const outCostEl = document.getElementById("tr-cost-output");
    const outCost = (outCostEl&&outCostEl.dataset.value) ? parseFloat(outCostEl.dataset.value) : 0;
    const totalEl = document.getElementById("tr-cost-total");
    if (totalEl) totalEl.textContent = isFree?"Free":"$"+(inCost+outCost).toFixed(6);

    // Grid
    const mx = Math.max(...Object.values(counts),1);
    for (const gi of GRID_INFO) {
      const v=counts[gi.key]||0, c=calcInputCost(v,gi.key);
      const ve=document.getElementById("tr-gv-"+gi.key);
      const gc=document.getElementById("tr-gc-"+gi.key);
      const be=document.getElementById("tr-gb-"+gi.key);
      if(ve) ve.textContent=v.toLocaleString();
      if(gc) gc.textContent=v>0?"$"+c.toFixed(5):"—";
      if(be) be.style.width=(v/mx*100)+"%";
    }

    const chEl=document.getElementById("tr-chars");
    const wdEl=document.getElementById("tr-words");
    const rtEl=document.getElementById("tr-ratio");
    const cpEl=document.getElementById("tr-cheapest");
    if(chEl) chEl.textContent=text.length.toLocaleString();
    if(wdEl) wdEl.textContent=text.trim().split(/\s+/).length.toLocaleString();
    if(rtEl) rtEl.textContent=n>0?(text.length/n).toFixed(1):"—";
    if(cpEl&&n>0){
      const cheapest=GRID_INFO.reduce((b,gi)=>{ const c=calcInputCost(counts[gi.key]||0,gi.key); return c<b.c?{gi,c}:b; },{gi:null,c:Infinity});
      if(cheapest.gi){cpEl.textContent=cheapest.gi.label;cpEl.style.color=cheapest.gi.color;}
    }

    // Energy update
    if(n>0){
      const eng=calcEnergy(n, platform.tok);
      const whEl=document.getElementById("tr-energy-wh");
      const co2El=document.getElementById("tr-energy-co2");
      const eqEl=document.getElementById("tr-energy-equiv");
      const barEl=document.getElementById("tr-energy-bar");
      const barLblEl=document.getElementById("tr-energy-bar-lbl");
      if(whEl) whEl.textContent=fmtEnergy(eng.wh);
      if(co2El) co2El.textContent=eng.co2g<0.001?`${(eng.co2g*1000000).toFixed(2)} μg`
        :eng.co2g<1?`${(eng.co2g*1000).toFixed(3)} mg`
        :eng.co2g<1000?`${eng.co2g.toFixed(3)} g`
        :`${(eng.co2g/1000).toFixed(4)} kg`;
      if(eqEl) eqEl.textContent=fmtEquiv(eng.wh, eng.searches);
      if(barEl){
        // Scale bar: 0–100 searches maps to 0–100%
        const pct=Math.min(100, (eng.searches/100)*100);
        barEl.style.width=Math.max(2,pct)+"%";
      }
      if(barLblEl) barLblEl.textContent=eng.searches<1
        ?`< 1 search equiv.`
        :`${eng.searches.toFixed(1)} search${eng.searches>=2?"es":""} equiv.`;
    }

    const mnEl=document.getElementById("tr-mnum-in");
    if(mnEl) mnEl.textContent=n.toLocaleString();

    pulse(`Monitoring · ${n.toLocaleString()} tokens`, platform.color);
  }

  // ═══════════════════════════════════════════════════
  // UPDATE FROM API RESPONSE
  // ═══════════════════════════════════════════════════

  function updateFromAPI(inputTokens, outputTokens) {
    sessionCalls++;
    if (inputTokens>0) {
      const numEl=document.getElementById("tr-num-input");
      if(numEl) numEl.textContent=inputTokens.toLocaleString();
      const inC=(inputTokens/1_000_000)*(PRICING_INPUT[platform.tok]||1);
      const icEl=document.getElementById("tr-cost-input");
      if(icEl) icEl.textContent=platform.costPer1k===0?"Free":"$"+inC.toFixed(6);
    }
    if (outputTokens>0) {
      const outEl=document.getElementById("tr-num-output");
      const outCEl=document.getElementById("tr-cost-output");
      const badgeEl=document.getElementById("tr-api-badge");
      const totalEl=document.getElementById("tr-cost-total");
      if(outEl) outEl.textContent=outputTokens.toLocaleString();
      const outC=(outputTokens/1_000_000)*(PRICING_OUTPUT[platform.tok]||3);
      if(outCEl){outCEl.textContent=platform.costPer1k===0?"Free":"$"+outC.toFixed(6);outCEl.dataset.value=outC;}
      if(badgeEl){badgeEl.textContent="✓ captured";badgeEl.style.color="#6ee7b7";}
      const inCStr=document.getElementById("tr-cost-input")?.textContent?.replace("$","")||"0";
      const inC2=parseFloat(inCStr)||0;
      if(totalEl) totalEl.textContent=platform.costPer1k===0?"Free":"$"+(inC2+outC).toFixed(6);
      const mcEl=document.getElementById("tr-mcost-total");
      if(mcEl) mcEl.textContent=platform.costPer1k===0?"Free":"$"+(inC2+outC).toFixed(4);
      const mnOutEl=document.getElementById("tr-mnum-out");
      if(mnOutEl) mnOutEl.textContent=outputTokens.toLocaleString();
    }
    const scEl=document.getElementById("tr-session-calls");
    if(scEl) scEl.textContent=`${sessionCalls} call${sessionCalls!==1?"s":""}`;
    pulse("Response captured ✓","#10b981");
    setTimeout(()=>pulse(`Monitoring · ${sessionCalls} call${sessionCalls!==1?"s":""}`,platform.color),3000);
  }

  // ═══════════════════════════════════════════════════
  // INPUT DETECTION
  // ═══════════════════════════════════════════════════

  function getText(el){
    if(!el) return "";
    if(el.tagName==="TEXTAREA"||el.tagName==="INPUT") return el.value;
    return el.innerText||el.textContent||"";
  }
  function findInput(){
    for (const sel of platform.selectors){
      const el=document.querySelector(sel);
      if(el&&(el.offsetWidth>0||el.offsetHeight>0)) return el;
    }
    return null;
  }

  let activeInput=null, debTimer=null, bodyObs=null;
  function attach(el){
    if(activeInput===el) return;
    activeInput=el;
    // Disconnect body observer once input found — no more full-page watching
    if(bodyObs){ bodyObs.disconnect(); bodyObs=null; }
    const h=()=>{ clearTimeout(debTimer); debTimer=setTimeout(()=>updateFromInput(getText(el)),150); };
    el.addEventListener("input",h);
    // Only use MutationObserver on contenteditable — watch the element itself, not subtree
    if(el.getAttribute("contenteditable")){
      new MutationObserver(h).observe(el,{childList:true,characterData:true,subtree:false});
    }
    pulse("Input detected — ready", platform.color);
  }

  // Poll stops once input is found
  let pollTimer=null;
  function poll(){
    const el=findInput();
    if(el){ attach(el); return; } // done — no more polling
    pollTimer=setTimeout(poll,1500);
  }

  // Body observer only runs until input is found (then detaches itself)
  bodyObs = new MutationObserver(()=>{
    const el=findInput();
    if(el&&el!==activeInput) attach(el); // attach() will disconnect bodyObs
  });
  bodyObs.observe(document.body,{childList:true,subtree:true});

  // SPA route change — lightweight interval, reattaches only on actual nav
  let lastPath=window.location.pathname;
  setInterval(()=>{
    if(window.location.pathname===lastPath) return;
    lastPath=window.location.pathname;
    activeInput=null;
    // Re-enable body observer for new route
    if(!bodyObs){
      bodyObs=new MutationObserver(()=>{ const el=findInput(); if(el&&el!==activeInput) attach(el); });
      bodyObs.observe(document.body,{childList:true,subtree:true});
    }
    if(typeof platform.subLabel==="function"){
      const badge=overlayEl?.querySelector(".tr-platform-badge");
      if(badge) badge.textContent=platform.subLabel();
    }
    pulse("Detected — start typing", platform.color);
    poll();
  },2000);

  // ═══════════════════════════════════════════════════
  // BOOT
  // ═══════════════════════════════════════════════════

  function boot(){
    initOverlay();
    poll();
    console.log(`[Tokenizer v0.4.0] Active on ${platform.id} (${platform.label})`);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot);
  else boot();

})();
