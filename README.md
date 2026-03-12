# Tokenizer

**Real-time token counting & cost monitoring for every major LLM — as a browser extension.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.2.0-blue.svg)](CHANGELOG.md)
[![Chrome](https://img.shields.io/badge/Chrome-MV3-green.svg)]()
[![Edge](https://img.shields.io/badge/Edge-MV3-blue.svg)]()
[![Firefox](https://img.shields.io/badge/Firefox-MV2-orange.svg)]()
[![Brave](https://img.shields.io/badge/Brave-MV3-orange.svg)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

---

> **Stop getting surprised by your LLM bills.** Tokenizer sits in your browser and shows you — in real time — exactly how many tokens you're spending, what it's costing per input and output, and how that compares across every major model. Before you send a single message.

---

## Features

- 🟢 **Live input token count** — updates as you type, before you hit Send
- 🟣 **Output token tracking** — intercepts API responses to capture real output counts
- 💰 **Per-message cost breakdown** — input cost, output cost, and total, separately
- 📊 **Cross-model comparison** — see your prompt's token count in GPT-4o, GPT-4, Codex, Claude, Gemini, and LLaMA side-by-side with costs
- 🔁 **Session accumulator** — running total of tokens and spend across all calls
- 📤 **CSV export** of session data
- 🖱️ **Draggable overlay** — move it wherever it's not in the way
- 🔥 **No backend, no account, no tracking** — 100% local, open source

---

## Supported Platforms

| Platform | Input | Output | Tokenizer |
|----------|-------|--------|-----------|
| **ChatGPT** (chat.openai.com) | ✅ Exact | ✅ API | o200k_base |
| **Claude** (claude.ai) | ✅ ±3% | ✅ API | Claude (calibrated) |
| **Gemini** (gemini.google.com) | ✅ ±3% | ✅ API | Gemini (calibrated) |
| **Perplexity** | ✅ ±3% | ✅ API | LLaMA 3 |
| **HuggingFace Chat** | ✅ ±5% | ✅ API | LLaMA 3 |
| **OpenAI Playground / Codex** | ✅ Exact | ✅ API | o200k_base |
| **Google AI Studio** | ✅ ±3% | ✅ API | Gemini (calibrated) |
| **Anthropic Console** | ✅ ±3% | ✅ API | Claude (calibrated) |

> More platforms welcome — see [CONTRIBUTING.md](CONTRIBUTING.md)

---

## Installation

### Chrome (Manifest V3)

1. [Download the latest release ZIP](https://github.com/gyeningcorp/Tokenizer/releases/latest) and unzip it, **or** clone this repo
2. Open `chrome://extensions`
3. Enable **Developer mode** (toggle, top-right)
4. Click **Load unpacked** → select the `Tokenizer/` folder
5. Visit ChatGPT, Claude, HuggingFace — start typing

### Microsoft Edge (Manifest V3)

Edge is Chromium-based — the exact same extension package works with no changes.

1. [Download the latest release ZIP](https://github.com/gyeningcorp/Tokenizer/releases/latest) and unzip it, **or** clone this repo
2. Open `edge://extensions`
3. Enable **Developer mode** (toggle, bottom-left)
4. Click **Load unpacked** → select the `Tokenizer/` folder
5. Done — works identically to Chrome

> For permanent install: submit to the [Microsoft Edge Add-ons Store](https://microsoftedge.microsoft.com/addons/Microsoft-Edge-Extensions-Home)

### Brave (Manifest V3)

1. Open `brave://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select the `Tokenizer/` folder

### Firefox (Manifest V2)

1. Clone or download this repo
2. Rename `manifest.firefox.json` to `manifest.json` (back up the original first)
3. Open `about:debugging#/runtime/this-firefox`
4. Click **Load Temporary Add-on** → select `manifest.json`

> For permanent Firefox install: submit to [addons.mozilla.org](https://addons.mozilla.org)

### Safari
Planned for v0.3.0 via `xcrun safari-web-extension-converter`.

---

## How output token interception works

`injected.js` is loaded into the **page's own JavaScript context** (not the sandboxed extension context). This lets it wrap `window.fetch` and `XMLHttpRequest` before the LLM web app uses them.

When an API response arrives:
- **Streaming (SSE):** buffers all `data:` chunks and parses `usage` fields from the final chunk
- **Non-streaming (JSON):** parses the response body directly

Supported response formats:
- OpenAI: `usage.prompt_tokens` / `usage.completion_tokens`
- Anthropic: `usage.input_tokens` / `usage.output_tokens` (via `message_start` + `message_delta` events)
- HuggingFace Inference API: token count from response metadata

Results are posted via `window.postMessage` → `content.js` → `background.js` for session accumulation.

---

## Pricing Table (March 2026)

| Model | Input / 1M tokens | Output / 1M tokens |
|-------|------------------|-------------------|
| GPT-4o | $2.50 | $10.00 |
| GPT-4o mini / Codex | $0.15 | $0.60 |
| GPT-4 | $30.00 | $60.00 |
| Claude 3.5 Sonnet | $3.00 | $15.00 |
| Claude 3 Opus | $15.00 | $75.00 |
| Gemini 1.5 Pro | $1.25 | $5.00 |
| Gemini 2.0 Flash | $0.10 | $0.40 |
| LLaMA 3 70B (HuggingFace) | $0.59 | $0.79 |

Pricing is editable in `background.js` → `PRICING` and `content.js` → `PRICING_LOCAL`.

---

## File Structure

```
Tokenizer/
├── manifest.json           # Chrome / Edge / Brave (MV3)
├── manifest.firefox.json   # Firefox (MV2)
├── background.js           # Service worker — session tracking + pricing
├── content.js              # Page monitoring + overlay rendering
├── injected.js             # Fetch/XHR interceptor (runs in page context)
├── overlay.css             # Floating overlay styles
├── popup.html              # Extension popup UI
├── popup.js                # Popup logic
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── LICENSE                 # MIT
├── CONTRIBUTING.md
└── CHANGELOG.md
```

No build step. No dependencies. No bundler. Load the folder directly.

---

## Roadmap

- [ ] v0.3.0 — Safari support via Xcode converter
- [ ] v0.3.0 — Per-model pricing selector in popup (override defaults)
- [ ] v0.3.0 — HuggingFace Inference API key integration (see any model's tokens)
- [ ] v0.3.0 — Mistral, Groq, Cohere platform support
- [ ] v0.4.0 — Cloud dashboard (Tokenizer.dev) with history + spend charts
- [ ] v0.4.0 — Claude Code CLI token tracking (companion desktop app)
- [ ] v0.5.0 — Chrome Web Store + Firefox Add-ons Store submission

---

## Contributing

PRs are welcome. Adding a new platform takes about 10 lines of config.
See [CONTRIBUTING.md](CONTRIBUTING.md) for full details.

---

## License

[MIT](LICENSE) — free to use, modify, and distribute.

---

Built by [The Digital Duo](https://thedigitalduo.net) · [chris@thedigitalduo.net](mailto:chris@thedigitalduo.net)
