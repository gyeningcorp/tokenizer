/**
 * Tokenizer — background.js
 * Service Worker (Chrome MV3) / Background Script (Firefox MV2)
 * Manages session state and relays messages between content + popup.
 */

const DEFAULT_SESSION = {
  inputTokens: 0,
  outputTokens: 0,
  inputCost: 0,
  outputCost: 0,
  calls: 0,
  startedAt: Date.now(),
};

let session = { ...DEFAULT_SESSION };

// Persist session across service worker restarts (MV3 goes idle frequently)
chrome.storage.local.get("tokenizer_session", (data) => {
  if (data.tokenizer_session) session = data.tokenizer_session;
});

function saveSession() {
  chrome.storage.local.set({ tokenizer_session: { ...session } });
}

// Pricing table (per 1M tokens, USD) — updated March 2026
const PRICING = {
  // OpenAI
  "gpt-4o":            { input: 2.50,  output: 10.00 },
  "gpt-4o-mini":       { input: 0.15,  output: 0.60  },
  "gpt-4":             { input: 30.00, output: 60.00 },
  "gpt-4-turbo":       { input: 10.00, output: 30.00 },
  "gpt-3.5-turbo":     { input: 0.50,  output: 1.50  },
  "codex":             { input: 0.15,  output: 0.60  },  // Same as 4o-mini
  // Anthropic
  "claude-3-opus":     { input: 15.00, output: 75.00 },
  "claude-3-5-sonnet": { input: 3.00,  output: 15.00 },
  "claude-3-5-haiku":  { input: 0.80,  output: 4.00  },
  "claude-3-haiku":    { input: 0.25,  output: 1.25  },
  // Google
  "gemini-1.5-pro":    { input: 1.25,  output: 5.00  },
  "gemini-1.5-flash":  { input: 0.075, output: 0.30  },
  "gemini-2.0-flash":  { input: 0.10,  output: 0.40  },
  "gemini-2.5-pro":    { input: 1.25,  output: 10.00 },
  // HuggingFace (serverless inference — approximate)
  "llama-3-70b":       { input: 0.59,  output: 0.79  },
  "llama-3-8b":        { input: 0.10,  output: 0.10  },
  "mistral-7b":        { input: 0.10,  output: 0.10  },
  "mixtral-8x7b":      { input: 0.27,  output: 0.27  },
  // Default fallback
  "default":           { input: 1.00,  output: 3.00  },
};

function getPricing(model) {
  if (!model) return PRICING["default"];
  const m = model.toLowerCase();
  for (const [key, p] of Object.entries(PRICING)) {
    if (m.includes(key)) return p;
  }
  return PRICING["default"];
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "api_tokens") {
    const p = getPricing(msg.model || "");
    session.inputTokens += msg.inputTokens || 0;
    session.outputTokens += msg.outputTokens || 0;
    session.inputCost += ((msg.inputTokens || 0) / 1_000_000) * p.input;
    session.outputCost += ((msg.outputTokens || 0) / 1_000_000) * p.output;
    session.calls += 1;
    saveSession();

    // Broadcast to popup if open
    chrome.runtime.sendMessage({
      type: "session_update",
      session: { ...session },
    }).catch(() => {});

    sendResponse({ ok: true });
  }

  if (msg.type === "get_session") {
    sendResponse({ session: { ...session } });
  }

  if (msg.type === "reset_session") {
    session = { ...DEFAULT_SESSION, startedAt: Date.now() };
    saveSession();
    sendResponse({ ok: true });
  }

  if (msg.type === "get_pricing") {
    sendResponse({ pricing: PRICING, found: getPricing(msg.model) });
  }

  return true; // keep channel open for async
});
