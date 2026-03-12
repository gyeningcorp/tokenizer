# Contributing to TokenRoute

Thanks for wanting to help! TokenRoute is MIT-licensed and welcomes PRs from anyone.

---

## Ways to contribute

### 🐛 Bug reports
Open an issue with:
- Browser + version
- Which LLM platform
- What happened vs. what you expected
- Console errors (F12 → Console)

### ✨ New platform support
Want to add Mistral, Cohere, Groq, or another LLM?

1. Add a new entry to the `PLATFORMS` object in `content.js`:
```js
your_platform: {
  match: /your\.domain\.com/,
  label: "Display Name",
  model: "model-name",        // matches a key in PRICING_LOCAL
  tok: "cl100k_base",         // tokenizer scale key
  color: "#hexcolor",
  exact: false,               // true = exact tokenizer, false = calibrated estimate
  selectors: ['textarea', 'div[contenteditable="true"]'],
},
```

2. Add the domain to `host_permissions` in `manifest.json` and `manifest.firefox.json`
3. Add the domain to the `content_scripts.matches` array in both manifests
4. Add pricing to `PRICING_LOCAL` in `content.js` and `PRICING` in `background.js`
5. Test it, then open a PR

### 💰 Pricing updates
Model pricing changes constantly. If you spot outdated rates:
- Update `PRICING` in `background.js`
- Update `PRICING_LOCAL` in `content.js`
- Update the table in `README.md`
- Open a PR with the source (provider pricing page link)

### 🎨 UI improvements
The overlay (`overlay.css`) and popup (`popup.html`) are plain CSS/HTML — no build step needed. Edit and reload the extension to see changes instantly.

---

## Development setup

No build tools required. It's vanilla JS.

```bash
git clone https://github.com/gyeningcorp/tokenroute.git
cd tokenroute
# Load the folder directly in Chrome as an unpacked extension
```

**Chrome:**
1. `chrome://extensions` → Developer mode ON → Load unpacked → select `tokenroute/`
2. Edit files → click the refresh icon on the extension card → reload the LLM tab

**Firefox:**
1. Rename / copy `manifest.firefox.json` → `manifest.json`
2. `about:debugging` → Load Temporary Add-on → select `manifest.json`

---

## PR guidelines

- Keep PRs focused — one feature or fix per PR
- No build step, no dependencies unless absolutely necessary
- Test on at least Chrome before submitting
- Add yourself to the contributors list in `README.md` if you'd like credit

---

## Code style

- Vanilla JS (ES2020+), no frameworks, no bundler
- 2-space indentation
- Comments on anything non-obvious
- Keep the content script under 30KB unminified — it runs on every LLM page

---

Questions? Open an issue or email **chris@thedigitalduo.net**
