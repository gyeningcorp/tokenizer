#!/usr/bin/env node
/**
 * Tokenizer CLI Proxy v0.5.0
 * ───────────────────────────────────────────────────────
 * Runs a local proxy that intercepts OpenAI-compatible API calls,
 * counts tokens in real time, and prints a live terminal dashboard.
 *
 * Works with: Claude Code, OpenAI CLI, Ollama, LM Studio, Jan,
 *             AnythingLLM, any tool that accepts a custom --base-url
 *
 * Usage:
 *   node tokenizer-proxy.js [--port 4242] [--target http://localhost:11434]
 *   node tokenizer-proxy.js --target https://api.anthropic.com
 *   node tokenizer-proxy.js --target https://api.openai.com
 *
 * Then point your tool at http://localhost:4242
 *   OPENAI_BASE_URL=http://localhost:4242 claude
 *   OPENAI_API_BASE=http://localhost:4242 openai ...
 *   ollama run llama3  (after setting OLLAMA_HOST=http://localhost:4242)
 */

"use strict";

const http   = require("http");
const https  = require("https");
const url    = require("url");

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(name, def) {
  const i = args.indexOf(name);
  return i !== -1 && args[i+1] ? args[i+1] : def;
}
const PROXY_PORT = parseInt(getArg("--port", "4242"), 10);
const TARGET_RAW = getArg("--target", "https://api.openai.com");
const target     = url.parse(TARGET_RAW);
const USE_HTTPS  = target.protocol === "https:";

// ── Session state ─────────────────────────────────────────────────────────────
let session = {
  totalInputTokens:  0,
  totalOutputTokens: 0,
  totalCost:         0,
  calls:             0,
  startTime:         Date.now(),
};

// ── Pricing (per 1M tokens) ───────────────────────────────────────────────────
const PRICING = {
  // OpenAI
  "gpt-4o":                  { in: 2.50,  out: 10.00 },
  "gpt-4o-mini":             { in: 0.15,  out:  0.60 },
  "gpt-4-turbo":             { in: 10.00, out: 30.00 },
  "gpt-4":                   { in: 30.00, out: 60.00 },
  "gpt-3.5-turbo":           { in:  0.50, out:  1.50 },
  "o1":                      { in: 15.00, out: 60.00 },
  "o1-mini":                 { in:  3.00, out: 12.00 },
  // Anthropic
  "claude-3-5-sonnet":       { in:  3.00, out: 15.00 },
  "claude-3-5-haiku":        { in:  0.80, out:  4.00 },
  "claude-3-opus":           { in: 15.00, out: 75.00 },
  "claude-sonnet-4":         { in:  3.00, out: 15.00 },
  "claude-opus-4":           { in: 15.00, out: 75.00 },
};

function getPricing(model) {
  if (!model) return { in: 0, out: 0 };
  const key = Object.keys(PRICING).find(k => model.toLowerCase().includes(k));
  return key ? PRICING[key] : { in: 0, out: 0 };
}

function calcCost(model, inTok, outTok) {
  const p = getPricing(model);
  return (inTok / 1_000_000 * p.in) + (outTok / 1_000_000 * p.out);
}

// ── Simple token estimator ────────────────────────────────────────────────────
function estimateTokens(text) {
  if (!text) return 0;
  const words = text.trim().split(/\s+/).length;
  return Math.round(words * 1.33);
}

// ── Terminal dashboard ────────────────────────────────────────────────────────
const RESET  = "\x1b[0m";
const BOLD   = "\x1b[1m";
const DIM    = "\x1b[2m";
const GREEN  = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN   = "\x1b[36m";
const MAGENTA= "\x1b[35m";
const WHITE  = "\x1b[97m";
const GRAY   = "\x1b[90m";

function banner() {
  process.stdout.write("\x1b[2J\x1b[H"); // clear
  console.log(`${BOLD}${YELLOW}┌─────────────────────────────────────────────┐${RESET}`);
  console.log(`${BOLD}${YELLOW}│  🔢 Tokenizer CLI Proxy  v0.5.0              │${RESET}`);
  console.log(`${BOLD}${YELLOW}│  Listening :${PROXY_PORT}  →  ${TARGET_RAW.slice(0,28).padEnd(28)} │${RESET}`);
  console.log(`${BOLD}${YELLOW}└─────────────────────────────────────────────┘${RESET}`);
}

function printCall(model, inTok, outTok, cost, durationMs) {
  const elapsed = ((Date.now() - session.startTime) / 1000).toFixed(0);
  banner();
  console.log(`\n${BOLD}${CYAN}── Latest Call ──────────────────────────────${RESET}`);
  console.log(`  ${DIM}Model:${RESET}  ${WHITE}${model || "unknown"}${RESET}`);
  console.log(`  ${DIM}Input:${RESET}  ${GREEN}${inTok.toLocaleString()} tokens${RESET}  ${GRAY}(~${durationMs}ms)${RESET}`);
  console.log(`  ${DIM}Output:${RESET} ${MAGENTA}${outTok.toLocaleString()} tokens${RESET}`);
  console.log(`  ${DIM}Cost:${RESET}   ${YELLOW}$${cost.toFixed(6)}${RESET}`);
  console.log(`\n${BOLD}${CYAN}── Session Total ────────────────────────────${RESET}`);
  console.log(`  ${DIM}Calls:${RESET}  ${WHITE}${session.calls}${RESET}`);
  console.log(`  ${DIM}Input:${RESET}  ${GREEN}${session.totalInputTokens.toLocaleString()} tokens${RESET}`);
  console.log(`  ${DIM}Output:${RESET} ${MAGENTA}${session.totalOutputTokens.toLocaleString()} tokens${RESET}`);
  console.log(`  ${DIM}Total Cost:${RESET} ${BOLD}${YELLOW}$${session.totalCost.toFixed(6)}${RESET}`);
  console.log(`  ${DIM}Uptime:${RESET} ${GRAY}${elapsed}s${RESET}`);
  console.log(`\n${GRAY}Point your tool at: http://localhost:${PROXY_PORT}${RESET}`);
  console.log(`${GRAY}Press Ctrl+C to stop.${RESET}`);
}

// ── Proxy server ──────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const startMs = Date.now();
  let requestBody = [];

  req.on("data", chunk => requestBody.push(chunk));
  req.on("end", () => {
    const bodyBuf  = Buffer.concat(requestBody);
    const bodyStr  = bodyBuf.toString("utf8");
    let parsed     = null;
    let model      = "unknown";
    let inputTokens = 0;

    try {
      parsed = JSON.parse(bodyStr);
      model  = parsed.model || "unknown";
      // Estimate input tokens from messages
      if (parsed.messages) {
        const allText = parsed.messages.map(m => {
          if (typeof m.content === "string") return m.content;
          if (Array.isArray(m.content)) return m.content.map(b => b.text||"").join(" ");
          return "";
        }).join(" ");
        inputTokens = estimateTokens(allText);
      } else if (parsed.prompt) {
        inputTokens = estimateTokens(parsed.prompt);
      }
    } catch (_) {}

    // Forward to upstream
    const opts = {
      hostname: target.hostname,
      port:     target.port || (USE_HTTPS ? 443 : 80),
      path:     req.url,
      method:   req.method,
      headers:  { ...req.headers, host: target.host },
    };

    const lib  = USE_HTTPS ? https : http;
    const prox = lib.request(opts, (upRes) => {
      res.writeHead(upRes.statusCode, upRes.headers);
      let responseBody = [];
      let outputTokens = 0;
      let isStream     = (upRes.headers["content-type"]||"").includes("text/event-stream");
      let streamText   = "";

      upRes.on("data", chunk => {
        responseBody.push(chunk);
        res.write(chunk);

        // Parse streaming SSE for token counting
        if (isStream) {
          const chunkStr = chunk.toString("utf8");
          // OpenAI-style streaming
          chunkStr.split("\n").forEach(line => {
            if (line.startsWith("data: ") && !line.includes("[DONE]")) {
              try {
                const d = JSON.parse(line.slice(6));
                if (d.choices?.[0]?.delta?.content) streamText += d.choices[0].delta.content;
                if (d.usage) {
                  if (d.usage.prompt_tokens)     inputTokens  = d.usage.prompt_tokens;
                  if (d.usage.completion_tokens) outputTokens = d.usage.completion_tokens;
                }
              } catch (_) {}
            }
          });
        }
      });

      upRes.on("end", () => {
        res.end();
        const durationMs = Date.now() - startMs;

        // Try to get exact tokens from response body
        if (!isStream) {
          try {
            const respStr  = Buffer.concat(responseBody).toString("utf8");
            const respJson = JSON.parse(respStr);
            if (respJson.usage) {
              if (respJson.usage.input_tokens)      inputTokens  = respJson.usage.input_tokens;
              if (respJson.usage.prompt_tokens)     inputTokens  = respJson.usage.prompt_tokens;
              if (respJson.usage.output_tokens)     outputTokens = respJson.usage.output_tokens;
              if (respJson.usage.completion_tokens) outputTokens = respJson.usage.completion_tokens;
            }
          } catch (_) {}
        } else if (outputTokens === 0 && streamText) {
          outputTokens = estimateTokens(streamText);
        }

        const cost = calcCost(model, inputTokens, outputTokens);
        session.calls++;
        session.totalInputTokens  += inputTokens;
        session.totalOutputTokens += outputTokens;
        session.totalCost         += cost;

        printCall(model, inputTokens, outputTokens, cost, durationMs);
      });
    });

    prox.on("error", (err) => {
      console.error(`${BOLD}\x1b[31mProxy error:${RESET}`, err.message);
      res.writeHead(502);
      res.end(`Tokenizer Proxy error: ${err.message}`);
    });

    prox.write(bodyBuf);
    prox.end();
  });
});

server.listen(PROXY_PORT, "127.0.0.1", () => {
  banner();
  console.log(`\n${GREEN}✓ Proxy running on http://localhost:${PROXY_PORT}${RESET}`);
  console.log(`${DIM}Forwarding to: ${TARGET_RAW}${RESET}\n`);
  console.log(`${BOLD}Usage examples:${RESET}`);
  console.log(`  ${CYAN}Claude Code:${RESET}  ANTHROPIC_BASE_URL=http://localhost:${PROXY_PORT} claude`);
  console.log(`  ${CYAN}OpenAI CLI:${RESET}   OPENAI_BASE_URL=http://localhost:${PROXY_PORT} openai ...`);
  console.log(`  ${CYAN}Ollama:${RESET}       OLLAMA_HOST=http://localhost:${PROXY_PORT} ollama run llama3`);
  console.log(`  ${CYAN}LM Studio:${RESET}    Set base URL to http://localhost:${PROXY_PORT} in settings`);
  console.log(`  ${CYAN}Any tool:${RESET}     Point API base URL to http://localhost:${PROXY_PORT}\n`);
  console.log(`${GRAY}Waiting for requests...${RESET}`);
});

process.on("SIGINT", () => {
  const elapsed = ((Date.now() - session.startTime) / 1000).toFixed(0);
  console.log(`\n\n${BOLD}${YELLOW}── Final Session Summary ──────────────────────${RESET}`);
  console.log(`  Calls:        ${WHITE}${session.calls}${RESET}`);
  console.log(`  Input tokens: ${GREEN}${session.totalInputTokens.toLocaleString()}${RESET}`);
  console.log(`  Output tokens:${MAGENTA}${session.totalOutputTokens.toLocaleString()}${RESET}`);
  console.log(`  Total cost:   ${BOLD}${YELLOW}$${session.totalCost.toFixed(6)}${RESET}`);
  console.log(`  Duration:     ${GRAY}${elapsed}s${RESET}\n`);
  process.exit(0);
});
