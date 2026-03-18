# Tokenizer — Launch Posts for All Platforms

---

## 🟠 REDDIT — r/ChatGPT

**Title:** I built a free browser extension that shows you live token counts and exactly what every ChatGPT message costs as you type

**Post:**
Hey r/ChatGPT — I built something I kept wishing existed.

**Tokenizer** is a free Chrome/Firefox extension that shows a live overlay on ChatGPT (and 30+ other AI platforms) as you type:

- 🔢 **Token count** — updates every keystroke
- 💰 **Dollar cost** — input, output, and session running total
- 🔤 **Word-by-word breakdown** — each word color-coded by token cost (so you can see why "compound" costs more tokens than "cat")
- ⚡ **Data center energy** — estimated Wh and CO₂ per prompt
- 📊 **Cross-model comparison** — same prompt cost across GPT-4o, Claude, Gemini, DeepSeek side by side

Everything runs 100% locally. Zero data collection. No account needed.

**Install / GitHub:** https://gyeningcorp.github.io/tokenizer/

Would love feedback from this community — what features would make this more useful for you?

---

## 🟠 REDDIT — r/LocalLLaMA

**Title:** Built a free extension that shows live token counts + energy usage on Ollama, LM Studio, Open WebUI, Jan — and 30+ cloud LLMs

**Post:**
Hey everyone — built something I think this sub will appreciate.

**Tokenizer** — a browser extension that overlays live token counts, costs, and energy usage on any LLM web UI.

What makes it relevant here: **it works on localhost.** Specifically tested with:
- Ollama (:11434)
- LM Studio (:1234)
- Open WebUI (:3000)
- Jan (:1337)
- AnythingLLM (:3001)
- Generic localhost fallback for any port

Also ships with a **CLI proxy** (`node tokenizer-proxy.js --target http://localhost:11434`) that wraps any OpenAI-compatible API and gives you a live terminal dashboard showing tokens, costs, and session totals.

For cloud platforms: ChatGPT, Claude, Gemini, DeepSeek, Grok, Mistral, Groq, Together AI, Fireworks + more.

MIT licensed, zero deps, vanilla JS only.

GitHub: https://github.com/gyeningcorp/tokenizer
Website: https://gyeningcorp.github.io/tokenizer/

---

## 🟠 REDDIT — r/artificial

**Title:** Free browser extension — live token counts, dollar costs, and CO₂ emissions for every AI prompt on 30+ platforms

**Post:**
Built **Tokenizer** — a free open-source browser extension that shows you exactly what every AI message costs before you send it.

Works on ChatGPT, Claude, Gemini, Grok, DeepSeek, Mistral, Copilot, Cursor, Bolt.new, and 30+ others — including local LLMs running on localhost.

Unique feature: shows **data center energy usage** (Wh/mWh) and **CO₂ emitted** per prompt, based on IEA 2024 AI Energy Report data.

Also has a word-by-word **token breakdown** — each word color-coded by how many tokens it costs, with syllable analysis.

Zero data collection. All local. MIT licensed.

→ https://gyeningcorp.github.io/tokenizer/

---

## 🟠 REDDIT — r/programming + r/webdev

**Title:** Show HN-style: I built a browser extension that tokenizes your LLM prompts live, shows costs, and estimates data center energy usage

**Post:**
I wanted to understand the real cost of LLM usage — not just the dollar amount but the energy footprint too.

Built **Tokenizer** — a Manifest V3 Chrome / MV2 Firefox extension, pure vanilla JS, no bundler, no dependencies.

Technical breakdown:
- Injects `content.js` on page load, auto-detects platform by URL regex
- `injected.js` wraps `fetch`/`XHR` in page context to intercept API responses and extract exact output token counts from usage fields
- BPE-approximation tokenizer using vowel-group syllable analysis + scale factors per model family
- MutationObserver disconnects after input is found (perf fix)
- Energy: Wh/1M tokens per model, US EPA grid intensity for CO₂

Supports 30+ platforms including localhost (Ollama, LM Studio, etc.)

GitHub: https://github.com/gyeningcorp/tokenizer

---

## 🔶 HACKER NEWS — Show HN

**Title:** Show HN: Tokenizer – Live token counts, costs, and energy usage on 30+ LLM platforms

**Post:**
I built Tokenizer, a browser extension (Chrome MV3 + Firefox MV2) that shows a live overlay while you type on ChatGPT, Claude, Gemini, and 30+ other AI platforms.

Features:
- Live token count (BPE approximation, updates per keystroke)
- Input/output cost tracking with session totals
- Cross-model cost comparison (GPT-4o, Claude, Gemini, LLaMA, DeepSeek, Mistral)
- Word-by-word token breakdown with syllable analysis
- Data center energy estimation (Wh/mWh + CO₂, based on IEA 2024 AI energy report)
- Works on localhost (Ollama, LM Studio, Open WebUI, Jan, AnythingLLM)
- CLI proxy: node tokenizer-proxy.js --target https://api.openai.com

Zero data collection, MIT licensed, vanilla JS.

https://github.com/gyeningcorp/tokenizer

---

## 🐦 X / TWITTER — Thread

**Tweet 1:**
Just launched Tokenizer — a free browser extension that shows you live token counts, dollar costs, and energy usage on ChatGPT, Claude, Gemini + 30 more AI platforms 🧵

**Tweet 2:**
As you type, you see:
🔢 Exact token count (live)
💰 Dollar cost per message
📊 Same prompt cost on 6 models side by side
🔤 Every word color-coded by tokens
⚡ Data center energy (Wh + CO₂ per prompt)

**Tweet 3:**
Works on localhost too — Ollama, LM Studio, Jan, Open WebUI, AnythingLLM. Also ships with a Node.js CLI proxy for terminal AI tools.

**Tweet 4:**
Free. Open source. MIT licensed. Zero data collection. Everything runs in your browser.

→ https://gyeningcorp.github.io/tokenizer/
→ github.com/gyeningcorp/tokenizer

#OpenSource #ChatGPT #Claude #LLM #AI #BrowserExtension

---

## 💼 LINKEDIN (full post)

🚀 We just launched Tokenizer — a free, open-source browser extension that shows you exactly what your AI prompts cost in real time.

Every time you type a message into ChatGPT, Claude, Gemini, DeepSeek, or 30+ other AI platforms — Tokenizer shows you:

🔢 Live token count (updates every keystroke)
💰 Dollar cost — input, output, and session total
📊 Cross-model comparison — same prompt across 6 models at once
🔤 Word-by-word breakdown — color-coded chips showing exactly which words cost the most tokens
⚡ Data center energy — Wh used + CO₂ emitted per prompt (based on IEA 2024 data)

Everything runs 100% locally in your browser.
Zero data collection. No account needed. MIT licensed.

Works on: ChatGPT, Claude, Gemini, Grok, DeepSeek, Mistral, Copilot, Meta AI, Perplexity, Cursor, Bolt.new, Ollama, LM Studio + more.

👉 Website + install: https://gyeningcorp.github.io/tokenizer/
🔓 GitHub: github.com/gyeningcorp/tokenizer

This is our first open-source launch. Would love your feedback and a share if you find it useful 🙏

#AI #OpenSource #ChatGPT #Claude #LLM #BrowserExtension #ProductLaunch #Developers

---

## 🚀 PRODUCT HUNT

**Name:** Tokenizer — Live Token & Cost Monitor

**Tagline:** Know exactly what every AI prompt costs before you hit send

**Description:**
Tokenizer is a free browser extension that shows live token counts, dollar costs, energy usage, and word-by-word token breakdown on 30+ AI platforms as you type.

Works on ChatGPT, Claude, Gemini, Grok, DeepSeek, Mistral, Copilot, Cursor, Bolt.new, Ollama, LM Studio, and more.

Key features:
• Live token counter (BPE-accurate, updates per keystroke)
• Input/output cost tracking with session totals
• Cross-model comparison — same prompt on 6 models simultaneously
• Word-by-word breakdown — color-coded chips with syllable analysis
• Data center energy — Wh/mWh + CO₂ per prompt (IEA 2024 data)
• Works on localhost for local LLMs
• CLI proxy for terminal AI tools

Zero data collection. All local. MIT licensed. No account needed.

**Website:** https://gyeningcorp.github.io/tokenizer/
**GitHub:** https://github.com/gyeningcorp/tokenizer

---

## 💬 DEV.TO POST

**Title:** I built a browser extension that shows live token costs + CO₂ footprint for every AI prompt

Intro: "Every developer using LLMs has the same question: what is this actually costing me?"...
[Full dev.to article — see below]

---

## 📧 SUBMIT TO AI NEWSLETTERS
- **TLDR AI** → https://tldr.tech/ai/newsletter
- **The Rundown AI** → https://www.therundown.ai/submit
- **Ben's Bites** → https://bensbites.co/submit
- **AI Tool Report** → https://aitoolreport.com/submit-tool
- **There's An AI For That** → https://theresanaiforthat.com/submit/
- **Futurepedia** → https://www.futurepedia.io/submit-tool
- **AI Valley** → https://aivalley.ai/submit/

---

## 🗂 SUBMIT TO AI TOOL DIRECTORIES
- https://alternativeto.net/software/add/
- https://www.producthunt.com/posts/new
- https://dev.to/new (write an article)
- https://medium.com/new-story
- https://github.com/topics/tokenizer (add topics to repo)
