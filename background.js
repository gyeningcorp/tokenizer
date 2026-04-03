/**
 * Tokenizer — background.js
 * Service Worker (Chrome MV3) / Background Script (Firefox MV2)
 * Manages session state and relays messages between content + popup.
 */

// ── Cross-browser API shim ────────────────────────────
const api = (typeof browser !== "undefined") ? browser : chrome;

const DEFAULT_SESSION = {
  inputTokens: 0,
  outputTokens: 0,
  inputCost: 0,
  outputCost: 0,
  calls: 0,
  startedAt: Date.now(),
};

// Daily cost accumulator for monthly projection
// Structure: { "2026-03-29": 0.0042, ... }
function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function accumulateDailyCost(cost) {
  api.storage.local.get("tokenizer_daily", (data) => {
    const daily = data.tokenizer_daily || {};
    const today = getTodayKey();
    daily[today] = (daily[today] || 0) + cost;
    // Keep last 90 days
    const keys = Object.keys(daily).sort();
    if (keys.length > 90) delete daily[keys[0]];
    api.storage.local.set({ tokenizer_daily: daily });
  });
}

let session = { ...DEFAULT_SESSION };

// ── Desktop Bridge (WebSocket to Tokenizer desktop app) ──────────
let bridgeWs = null;
let bridgeReconnectTimer = null;

function connectBridge() {
  try {
    // Pass extension ID as auth token so desktop app can verify the connection origin
    bridgeWs = new WebSocket("ws://127.0.0.1:9877?extId=" + encodeURIComponent(api.runtime.id));
    bridgeWs.onopen = () => console.log("[Tokenizer Bridge] Connected to desktop app");
    bridgeWs.onclose = () => {
      bridgeWs = null;
      // Reconnect every 10 seconds
      if (!bridgeReconnectTimer) {
        bridgeReconnectTimer = setInterval(() => {
          if (!bridgeWs) connectBridge();
          else clearInterval(bridgeReconnectTimer), bridgeReconnectTimer = null;
        }, 10000);
      }
    };
    bridgeWs.onerror = () => { bridgeWs = null; };
  } catch (_) {}
}

function sendToBridge(data) {
  if (bridgeWs && bridgeWs.readyState === WebSocket.OPEN) {
    bridgeWs.send(JSON.stringify(data));
  }
}

// Connect on startup
connectBridge();

// Persist session across service worker restarts (MV3 goes idle frequently)
api.storage.local.get("tokenizer_session", (data) => {
  if (data.tokenizer_session) session = data.tokenizer_session;
});

function saveSession() {
  api.storage.local.set({ tokenizer_session: { ...session } });
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
api.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Reject messages from unknown senders — only trust our own extension
  if (sender.id !== api.runtime.id) {
    sendResponse({ error: "Unauthorized sender" });
    return;
  }

  if (msg.type === "api_tokens") {
    const p = getPricing(msg.model || "");
    session.inputTokens += msg.inputTokens || 0;
    session.outputTokens += msg.outputTokens || 0;
    const addedCost = ((msg.inputTokens || 0) / 1_000_000) * p.input
                    + ((msg.outputTokens || 0) / 1_000_000) * p.output;
    session.inputCost += ((msg.inputTokens || 0) / 1_000_000) * p.input;
    session.outputCost += ((msg.outputTokens || 0) / 1_000_000) * p.output;
    session.calls += 1;
    accumulateDailyCost(addedCost);
    saveSession();

    // Broadcast to popup if open
    api.runtime.sendMessage({
      type: "session_update",
      session: { ...session },
    }).catch(() => {});

    // Relay to desktop app via bridge
    sendToBridge({
      type: "api_tokens",
      inputTokens: msg.inputTokens || 0,
      outputTokens: msg.outputTokens || 0,
      model: msg.model || "",
      platform: "",
    });

    sendResponse({ ok: true });
  }

  if (msg.type === "get_session") {
    // Always read from storage to avoid race condition on service worker restart
    api.storage.local.get("tokenizer_session", (data) => {
      if (data.tokenizer_session) session = data.tokenizer_session;
      sendResponse({ session: { ...session } });
    });
    return true; // keep message channel open for async response
  }

  if (msg.type === "reset_session") {
    session = { ...DEFAULT_SESSION, startedAt: Date.now() };
    saveSession();
    sendResponse({ ok: true });
  }

  if (msg.type === "get_pricing") {
    sendResponse({ pricing: PRICING, found: getPricing(msg.model) });
  }

  if (msg.type === "get_daily") {
    api.storage.local.get("tokenizer_daily", (data) => {
      sendResponse({ daily: data.tokenizer_daily || {} });
    });
    return true;
  }

  return true; // keep channel open for async
});

// ── Service Worker Keep-Alive (Chrome MV3) ────────────
// Chrome kills the SW after ~30s of inactivity which drops the WebSocket bridge.
// Alarm fires every 25s to keep it alive.
if (api.alarms) {
  api.alarms.create("tokenizer-keepalive", { periodInMinutes: 0.4 }); // ~25s
  api.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "tokenizer-keepalive") {
      // Reconnect bridge if disconnected
      if (!bridgeWs || bridgeWs.readyState !== WebSocket.OPEN) {
        connectBridge();
      }
    }
  });
}

// ── Keep-Alive (MV3 service worker stays awake for WebSocket) ────
// Chrome MV3 service workers terminate after ~30s of inactivity.
// This alarm fires every 25s to keep the SW alive and bridge connected.
if (typeof api.alarms !== "undefined") {
  api.alarms.create("tokenizer-keepalive", { periodInMinutes: 0.4 }); // ~24s
  api.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "tokenizer-keepalive") {
      // Ping bridge if it's disconnected
      if (!bridgeWs || bridgeWs.readyState !== WebSocket.OPEN) {
        connectBridge();
      }
    }
  });
}
