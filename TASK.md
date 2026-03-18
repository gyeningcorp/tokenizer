# Task: Add Context Window Tracking + Cumulative Cost to Tokenizer v0.6.0

## Feature 1: Context Window Usage Bar

### Add CONTEXT_WINDOW lookup near the PRICING objects in content.js:
```js
const CONTEXT_WINDOW = {
  'gpt4o':      128000,
  'gpt4omini':  128000,
  'gpto1':      200000,
  'gpto3':      200000,
  'claude':     200000,
  'gemini':   1000000,
  'gemini15':   128000,
  'grok':       131072,
  'deepseek':   128000,
  'mistral':    128000,
  'llama3':     128000,
  'perplexity': 127072,
  'default':    128000,
};
```

### Track cumulative tokens across the whole conversation:
- Add a `let cumulativeTokens = 0;` variable
- In `updateFromAPI(inputTokens, outputTokens)`, add both to cumulativeTokens
- When displaying, use `cumulativeTokens + currentInputTokens` as total context used

### Add to overlay HTML (after the output section):
```html
<div class="tr-section-label" style="margin-top:8px">CONTEXT WINDOW</div>
<div style="margin: 4px 0 2px;">
  <div style="display:flex; justify-content:space-between; font-size:10px; color:#9ca3af; margin-bottom:3px;">
    <span id="tr-ctx-used">0</span>
    <span id="tr-ctx-pct">0%</span>
    <span id="tr-ctx-max">128k</span>
  </div>
  <div style="background:#374151; border-radius:3px; height:6px; overflow:hidden;">
    <div id="tr-ctx-bar" style="height:100%; width:0%; background:#10b981; border-radius:3px; transition:width 0.3s ease;"></div>
  </div>
  <div style="font-size:9px; color:#6b7280; margin-top:2px; text-align:center;">
    <span id="tr-ctx-remaining">128k remaining</span>
  </div>
</div>
```

Color bar: green under 60%, yellow 60-85%, red above 85%.

## Feature 2: Cumulative Session Cost

### Track total money spent in the session:
- Add `let cumulativeCost = 0;` 
- In `updateFromAPI`, add (inputCost + outputCost) to cumulativeCost each time
- Show it below the context bar:

```html
<div style="display:flex; justify-content:space-between; margin-top:6px; font-size:10px;">
  <span style="color:#9ca3af;">Session Cost</span>
  <span id="tr-session-cost" style="color:#f59e0b; font-weight:bold;">$0.000000</span>
</div>
```

Update with: `document.getElementById('tr-session-cost').textContent = '$' + cumulativeCost.toFixed(6);`

## Version bump
- Update manifest.json, manifest.firefox.json, manifest.edge.json to version "0.6.0"
- Add CHANGELOG entry for v0.6.0

## After making all changes:
1. Read content.js carefully to understand existing structure before editing
2. git add -A
3. git commit -m "feat: add context window bar and session cost tracking (v0.6.0)"
4. git push origin main
5. Delete this TASK.md file
6. Run: openclaw system event --text "Done: Tokenizer v0.6.0 with context window and session cost tracking" --mode now
