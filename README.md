<div align="center">

# 🔢 Tokenizer

### See exactly what every AI message costs. Before you send it.

**Real-time token counting & cost monitoring for ChatGPT, Claude, Gemini, and more — as a free, open-source browser extension.**

[![Firefox](https://img.shields.io/badge/Firefox-Live%20on%20AMO-FF7139?style=for-the-badge&logo=firefox-browser&logoColor=white)](https://addons.mozilla.org/en-US/firefox/addon/tokenizer-token-cost-monitor/)
[![Chrome](https://img.shields.io/badge/Chrome-Pending%20Review-4285F4?style=for-the-badge&logo=google-chrome&logoColor=white)](https://chromewebstore.google.com/detail/epokekkmgfeegphmkhjfgdddknaodkom)
[![Edge](https://img.shields.io/badge/Edge-Pending%20Review-0078D7?style=for-the-badge&logo=microsoft-edge&logoColor=white)](https://microsoftedge.microsoft.com/addons)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

---

![Tokenizer Demo](https://raw.githubusercontent.com/gyeningcorp/tokenizer/main/assets/demo.gif)

*👆 Live token count updates as you type. Cost shown before you hit Send.*

</div>

---

## Why Tokenizer?

You pay per token. Every message. Every response. But every AI chat interface hides this from you.

**Tokenizer fixes that.** It sits in your browser — completely local, zero tracking — and shows you:

- 💬 **How many tokens your message is** — *before* you send it
- 💰 **Exactly what it costs** — input and output, separately  
- 📊 **Your running session total** — so surprises don't show up on your bill
- 🔁 **Cross-model comparison** — paste once, see cost on GPT-4o, Claude, Gemini side by side

No account. No backend. No data leaves your browser. [MIT licensed](LICENSE).

---

## Install

| Browser | Status | Link |
|---------|--------|------|
| 🦊 **Firefox** | ✅ Live | [Install from Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/tokenizer-token-cost-monitor/) |
| 🌐 **Chrome** | ⏳ Pending review | [Chrome Web Store](https://chromewebstore.google.com/detail/epokekkmgfeegphmkhjfgdddknaodkom) |
| 🔷 **Edge** | ⏳ Pending review | Edge Add-ons Store |
| 🦁 **Brave** | ✅ Load unpacked | [See instructions below](#manual-install) |

> **Can't wait for Chrome/Edge approval?** Load it manually in 60 seconds — [see instructions below](#manual-install).

---

## Features

- ⚡ **Live input token count** — updates as you type, before you hit Send
- 📡 **Output token tracking** — intercepts API responses to capture real output counts
- 💵 **Per-message cost breakdown** — input cost, output cost, and total, separately
- 🔁 **Cross-model comparison** — see your prompt's cost on GPT-4o, Claude, Gemini, LLaMA side-by-side
- 📈 **Session accumulator** — running total of tokens and spend across all messages
- 📤 **CSV export** of your session data
- 🖱️ **Draggable overlay** — move it wherever it's not in the way
- 🔒 **100% local** — no backend, no account, no tracking

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

> More platforms welcome — adding one takes ~10 lines. See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Pricing (March 2026)

| Model | Input / 1M | Output / 1M |
|-------|-----------|------------|
| GPT-4o | $2.50 | $10.00 |
| GPT-4o mini | $0.15 | $0.60 |
| GPT-4 | $30.00 | $60.00 |
| Claude 3.5 Sonnet | $3.00 | $15.00 |
| Claude 3 Opus | $15.00 | $75.00 |
| Gemini 1.5 Pro | $1.25 | $5.00 |
| Gemini 2.0 Flash | $0.10 | $0.40 |
| LLaMA 3 70B | $0.59 | $0.79 |

Pricing is editable in `background.js` → `PRICING`.

---

## Manual Install

### Chrome / Brave / Edge (unpacked)

1. [Download the latest release ZIP](https://github.com/gyeningcorp/tokenizer/releases/latest) and unzip it
2. Open `chrome://extensions` (or `edge://extensions` / `brave://extensions`)
3. Enable **Developer mode** (toggle, top-right)
4. Click **Load unpacked** → select the `Tokenizer/` folder
5. Visit ChatGPT, Claude, or Gemini — start typing

### Firefox (temporary)

1. Clone or download this repo
2. Open `about:debugging#/runtime/this-firefox`
3. Click **Load Temporary Add-on** → select `manifest.json`

Or just install from the [Firefox Add-ons store](https://addons.mozilla.org/en-US/firefox/addon/tokenizer-token-cost-monitor/) — it's live now.

---

## How it works

`injected.js` runs in the **page's own JavaScript context** — not the sandboxed extension context. This lets it wrap `window.fetch` and `XMLHttpRequest` before the LLM web app uses them.

When an API response arrives:
- **Streaming (SSE):** buffers all `data:` chunks and parses `usage` fields from the final chunk
- **Non-streaming (JSON):** parses the response body directly

Results are posted via `window.postMessage` → `content.js` → `background.js` for session accumulation.

No build step. No dependencies. No bundler. Load the folder directly.

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

---

## Roadmap

- [ ] **v0.7.0** — Safari support via Xcode converter
- [ ] **v0.7.0** — Per-model pricing selector in popup
- [ ] **v0.7.0** — Mistral, Groq, Cohere support
- [ ] **v0.8.0** — Tokenizer.dev cloud dashboard (history + spend charts)
- [ ] **v0.8.0** — Claude Code CLI companion (track local usage)

---

## Contributing

PRs welcome. Adding a new platform takes ~10 lines of config.  
See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

---

## License

[MIT](LICENSE) — free to use, modify, and distribute.

---

<div align="center">

Built by [Gyening Corp](https://github.com/gyeningcorp) · [chris@thedigitalduo.net](mailto:chris@thedigitalduo.net)

⭐ **Star this repo if it saves you money** ⭐

</div>
