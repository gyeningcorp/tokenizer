(function() {
  // Inject CSS
  if (!document.getElementById('tokenizer-style')) {
    const s = document.createElement('style');
    s.id = 'tokenizer-style';
    s.textContent = `/* Tokenizer Extension Overlay v0.2.0 — injected into LLM pages */

#Tokenizer-root {
  --tr-m: 'Segoe UI', system-ui, -apple-system, sans-serif;
  position: fixed;
  bottom: 22px;
  right: 22px;
  width: 320px;
  border-radius: 14px;
  background: #0e0e12;
  border: 1px solid rgba(255,255,255,0.07);
  box-shadow: 0 12px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,0,0,0.4);
  z-index: 2147483647;
  font-family: var(--tr-m);
  overflow: hidden;
  opacity: 0;
  transform: translateY(14px) scale(0.94);
  pointer-events: none;
  transition: opacity 0.3s cubic-bezier(0.16,1,0.3,1), transform 0.3s cubic-bezier(0.16,1,0.3,1);
  color: #d4d4d8;
  font-size: 12px;
  line-height: 1.4;
  user-select: none;
}
#Tokenizer-root.tr-visible {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}
#Tokenizer-root.tr-mini-mode {
  width: auto;
  min-width: 180px;
}
#Tokenizer-root * {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* ── HEADER ── */
.tr-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 7px 11px;
  background: rgba(255,255,255,0.02);
  border-bottom: 1px solid rgba(255,255,255,0.04);
  cursor: grab;
}
.tr-head:active { cursor: grabbing; }
.tr-logo { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.tr-logo-mark {
  width: 18px; height: 18px; border-radius: 4px;
  background: linear-gradient(135deg, #ecbb61, #d4943a);
  display: flex; align-items: center; justify-content: center;
  font-size: 8px; font-weight: 800; color: #08080c; flex-shrink: 0;
}
.tr-logo-name { font-size: 11px; font-weight: 700; color: #ecbb61; }
.tr-platform-badge {
  font-size: 8px; font-weight: 600; padding: 1px 6px; border-radius: 3px;
  letter-spacing: 0.04em;
}
.tr-head-btns { display: flex; gap: 2px; flex-shrink: 0; }
.tr-hbtn {
  width: 20px; height: 20px; border-radius: 4px;
  border: none; background: rgba(255,255,255,0.03);
  color: rgba(255,255,255,0.25); font-size: 10px;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: background 0.15s, color 0.15s;
}
.tr-hbtn:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.6); }

/* ── BODY ── */
.tr-body { padding: 11px 12px 8px; }
.tr-section-label {
  font-size: 7px; color: rgba(255,255,255,0.2);
  text-transform: uppercase; letter-spacing: 0.1em;
  margin-bottom: 4px;
}
.tr-api-badge {
  font-size: 7px; padding: 1px 5px; border-radius: 3px;
  background: rgba(167,139,250,0.12); color: #a78bfa;
  margin-left: 4px; font-weight: 600; letter-spacing: 0.04em;
}

/* ── COUNT ROWS ── */
.tr-count-row {
  display: flex; align-items: baseline; justify-content: space-between;
  margin-bottom: 2px;
}
.tr-count-block { display: flex; align-items: baseline; gap: 3px; flex-wrap: wrap; }
.tr-num {
  font-size: 36px; font-weight: 300; line-height: 1;
  letter-spacing: -0.03em; transition: color 0.2s;
}
.tr-num-out { font-size: 28px; }
.tr-unit { font-size: 9px; color: rgba(255,255,255,0.18); margin-left: 2px; }
.tr-cost-block { text-align: right; }
.tr-cost-val { font-size: 13px; font-weight: 500; color: #e4e4e7; }
.tr-cost-lbl { font-size: 7px; color: rgba(255,255,255,0.14); text-transform: uppercase; letter-spacing: 0.05em; }

/* ── TOTAL ── */
.tr-total-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 5px 8px; border-radius: 6px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.04);
  margin-top: 6px;
}
.tr-total-lbl { font-size: 8px; color: rgba(255,255,255,0.25); text-transform: uppercase; letter-spacing: 0.08em; }
.tr-total-val { font-size: 13px; font-weight: 600; color: #f4f4f5; }

/* ── BADGE ── */
.tr-badge {
  display: inline-flex; align-items: center; gap: 3px;
  padding: 2px 5px; border-radius: 3px;
  font-size: 7px; font-weight: 600; letter-spacing: 0.04em;
  margin-left: 4px;
}
.tr-badge-exact { background: rgba(16,185,129,0.1); color: #6ee7b7; }
.tr-badge-cal   { background: rgba(251,191,36,0.07); color: #fcd34d; }
.tr-badge-dot   { width: 4px; height: 4px; border-radius: 50%; display: inline-block; }

/* ── CROSS-MODEL GRID ── */
.tr-grid {
  display: grid; grid-template-columns: repeat(6, 1fr); gap: 3px;
  margin-top: 6px;
}
.tr-g {
  padding: 4px 2px; border-radius: 5px;
  background: rgba(255,255,255,0.015); text-align: center;
  border: 1px solid transparent;
}
.tr-g-active { background: rgba(236,187,97,0.04); border-color: rgba(236,187,97,0.1); }
.tr-g-name  { font-size: 6px; color: rgba(255,255,255,0.18); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1px; }
.tr-g-val   { font-size: 10px; font-weight: 600; }
.tr-g-cost  { font-size: 6px; color: rgba(255,255,255,0.2); margin-top: 1px; }
.tr-g-bar   { height: 2px; border-radius: 1px; background: rgba(255,255,255,0.03); margin-top: 3px; overflow: hidden; }
.tr-g-bar-fill { height: 100%; border-radius: 1px; transition: width 0.35s ease; }

/* ── STATS ── */
.tr-stats {
  display: flex; gap: 6px; margin-top: 8px; padding-top: 7px;
  border-top: 1px solid rgba(255,255,255,0.03);
}
.tr-stat { flex: 1; }
.tr-stat-lbl { font-size: 6px; color: rgba(255,255,255,0.15); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 1px; }
.tr-stat-val { font-size: 10px; font-weight: 500; color: #d4d4d8; }

/* ── FOOTER ── */
.tr-foot {
  padding: 4px 11px;
  background: rgba(255,255,255,0.01);
  border-top: 1px solid rgba(255,255,255,0.03);
  display: flex; align-items: center; justify-content: space-between;
}
.tr-foot-status { display: flex; align-items: center; gap: 4px; font-size: 7px; color: rgba(255,255,255,0.15); }
.tr-foot-dot    { width: 5px; height: 5px; border-radius: 50%; display: inline-block; }
.tr-session-info { font-size: 7px; color: rgba(255,255,255,0.1); }

/* ── MINIMIZED ── */
#tr-mini { padding: 6px 12px; display: flex; align-items: center; gap: 6px; }

/* ── ANIMATIONS ── */
@keyframes tr-bump {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.06); }
  100% { transform: scale(1); }
}
.tr-bump { animation: tr-bump 0.18s ease; }
`;
    document.head.appendChild(s);
  }

  // Minimal platform detection + overlay for testing
  const PLATFORM = {
    id: 'chatgpt', label: 'ChatGPT', color: '#10b981', tok: 'o200k_base',
    costPer1k: 0.0025, exact: true,
    selectors: ['#prompt-textarea','textarea']
  };

  if (document.getElementById('tokenizer-root')) return 'already injected';

  const root = document.createElement('div');
  root.id = 'tokenizer-root';
  root.innerHTML = `
    <div class="tr-head" id="tr-drag-handle">
      <div class="tr-logo">
        <div class="tr-logo-mark">T</div>
        <div class="tr-logo-text">
          <span class="tr-logo-name">Tokenizer</span>
          <span class="tr-platform-badge" style="background:#10b98122;color:#10b981">ChatGPT · GPT-4o</span>
        </div>
      </div>
      <div class="tr-head-btns">
        <button class="tr-hbtn" id="tr-btn-min">─</button>
        <button class="tr-hbtn" id="tr-btn-close">×</button>
      </div>
    </div>
    <div id="tr-full">
      <div class="tr-body">
        <div class="tr-section-label">INPUT</div>
        <div class="tr-count-row">
          <div class="tr-count-block">
            <span class="tr-num" id="tr-num-input" style="color:#10b981">0</span>
            <span class="tr-unit">tokens</span>
            <div class="tr-badge tr-badge-exact"><span class="tr-badge-dot" style="background:#10b981"></span>Exact</div>
          </div>
          <div class="tr-cost-block">
            <div class="tr-cost-val" id="tr-cost-input">\.000000</div>
            <div class="tr-cost-lbl">Input Cost</div>
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
          <span class="tr-total-val" id="tr-cost-total">\.000000</span>
        </div>
        <div class="tr-stats" style="margin-top:8px">
          <div class="tr-stat"><div class="tr-stat-lbl">Chars</div><div class="tr-stat-val" id="tr-chars">0</div></div>
          <div class="tr-stat"><div class="tr-stat-lbl">Words</div><div class="tr-stat-val" id="tr-words">0</div></div>
          <div class="tr-stat"><div class="tr-stat-lbl">Chars/Tok</div><div class="tr-stat-val" id="tr-ratio">—</div></div>
        </div>
      </div>
    </div>
    <div class="tr-foot">
      <div class="tr-foot-status">
        <span class="tr-foot-dot" style="background:#10b981"></span>
        <span id="tr-status">Detected — start typing</span>
      </div>
      <span class="tr-session-info">v0.4.0</span>
    </div>
  `;
  document.body.appendChild(root);
  root.classList.add('tr-visible');

  // Wire close/minimize
  document.getElementById('tr-btn-close').onclick = () => root.style.display='none';
  document.getElementById('tr-btn-min').onclick = () => {
    const full = document.getElementById('tr-full');
    full.style.display = full.style.display==='none' ? 'block' : 'none';
  };

  // Live token counting
  function estTokens(t) {
    if (!t||!t.trim()) return 0;
    const words = t.trim().split(/\s+/).length;
    return Math.round(words * 1.33);
  }
  function watch(el) {
    el.addEventListener('input', () => {
      const txt = el.value || el.innerText || '';
      const n = estTokens(txt);
      const cost = (n/1000000)*2.50;
      document.getElementById('tr-num-input').textContent = n.toLocaleString();
      document.getElementById('tr-cost-input').textContent = '\$'+cost.toFixed(6);
      document.getElementById('tr-cost-total').textContent = '\$'+cost.toFixed(6);
      document.getElementById('tr-chars').textContent = txt.length.toLocaleString();
      document.getElementById('tr-words').textContent = txt.trim().split(/\s+/).filter(Boolean).length.toLocaleString();
      document.getElementById('tr-ratio').textContent = n>0?(txt.length/n).toFixed(1):'—';
      document.getElementById('tr-status').textContent = 'Monitoring · '+n.toLocaleString()+' tokens';
    });
  }
  const el = document.querySelector('#prompt-textarea, textarea');
  if (el) { watch(el); document.getElementById('tr-status').textContent = 'Input detected — ready'; }

  return 'Tokenizer v0.4.0 injected on ' + window.location.hostname;
})();
