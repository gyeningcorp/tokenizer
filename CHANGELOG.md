# Changelog

All notable changes to TokenRoute will be documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/).

---

## [0.2.0] — 2026-03-12

### Added
- **Output token tracking** via `injected.js` fetch/XHR interceptor in page context
- **Input + Output cost breakdown** displayed separately in overlay
- **Session total cost** accumulator with reset + CSV export in popup
- **HuggingFace Chat** support (huggingface.co/chat)
- **OpenAI Playground / Codex** support (platform.openai.com)
- **Google AI Studio** support (aistudio.google.com)
- **Anthropic Console** support (console.anthropic.com)
- **6-column cross-model grid** — GPT-4o, GPT-4, Codex, Claude, Gemini, LLaMA/HF with per-cell cost
- **Draggable overlay** — drag by the header to reposition
- **Firefox MV2 manifest** (`manifest.firefox.json`) for Firefox/Add-ons submission
- **Background service worker** (`background.js`) for session state + pricing table
- **Popup rewrite** with session stats, pricing breakdown, platform list, reset + export buttons
- Updated pricing table (March 2026 rates for all major models)

### Changed
- Overlay width increased to 320px to accommodate output row
- Grid expanded from 5 to 6 columns (added Codex)
- Manifest updated to MV3 with `host_permissions` and `scripting` permission

---

## [0.1.0] — 2026-03-11

### Added
- Initial release
- Input token counting on ChatGPT, Claude, Perplexity, Gemini
- Floating overlay with live token count, cost estimate, 5-model comparison grid
- Minimize / close controls
- Popup with platform status list
