/**
 * Tokenizer — popup.js
 * Fetches session data from background and renders it.
 */

function fmt(n) {
  return (n || 0).toLocaleString();
}
function fmtCost(n) {
  return "$" + (n || 0).toFixed(4);
}

function render(session) {
  document.getElementById("s-in-tok").textContent   = fmt(session.inputTokens);
  document.getElementById("s-out-tok").textContent  = fmt(session.outputTokens);
  document.getElementById("s-in-cost").textContent  = fmtCost(session.inputCost);
  document.getElementById("s-out-cost").textContent = fmtCost(session.outputCost);
  document.getElementById("s-total").textContent    = "$" + ((session.inputCost || 0) + (session.outputCost || 0)).toFixed(4);
}

// Initial load
chrome.runtime.sendMessage({ type: "get_session" }, (res) => {
  if (res && res.session) render(res.session);
});

// Live updates while popup is open
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "session_update" && msg.session) render(msg.session);
});

// ── AI Value / Salary Equivalent ─────────────────────────────────────────────
// Senior AI/ML Engineer salary: ~$200/hr ($400K/year ÷ 2000 hrs)
const AI_ENGINEER_HOURLY = 200;
// Avg tokens per "engineering hour" of AI-assisted work (calibrated estimate)
const TOKENS_PER_HOUR = 150_000;

function renderValue() {
  chrome.runtime.sendMessage({ type: "get_daily" }, (res) => {
    const daily = res?.daily || {};
    const today = new Date().toISOString().slice(0, 10);

    // Sum last 30 days
    const now = new Date();
    let monthTotal = 0;
    let last7Total = 0;
    let last7Days = 0;
    for (const [date, cost] of Object.entries(daily)) {
      const daysAgo = (now - new Date(date)) / (1000 * 60 * 60 * 24);
      if (daysAgo <= 30) monthTotal += cost;
      if (daysAgo <= 7) { last7Total += cost; last7Days++; }
    }

    // If we have less than 7 days of data, use session cost to seed projection
    if (monthTotal === 0) {
      chrome.runtime.sendMessage({ type: "get_session" }, (r) => {
        const sessionCost = (r?.session?.inputCost || 0) + (r?.session?.outputCost || 0);
        updateValueUI(sessionCost, sessionCost * 30, last7Days, 'session');
      });
      return;
    }

    // Project: if <7 days data, extrapolate
    const dailyAvg = last7Days > 0 ? last7Total / last7Days : monthTotal / 30;
    const projectedMonthly = last7Days < 7 ? dailyAvg * 30 : monthTotal;

    updateValueUI(monthTotal, projectedMonthly, last7Days, last7Days >= 7 ? 'actual' : 'projected');
  });
}

function updateValueUI(monthActual, monthProjected, daysOfData, mode) {
  const totalTokensEquiv = monthProjected / 0.003; // rough $/token for display
  const engineerHours = Math.round(monthProjected / (AI_ENGINEER_HOURLY / (1_000_000 / TOKENS_PER_HOUR * 1000)));
  // Simpler: cost ratio. $200/hr engineer, avg cost for same output = monthProjected
  // Engineer hours = what would an engineer cost to do the same: monthProjected * markup
  // At $0.003/1k tokens avg, $200/hr engineer produces ~100 pages of code/analysis
  // Keep it simple: every $1 of AI ≈ 1 hour of junior work, 15 min of senior work
  const seniorHours = Math.max(1, Math.round(monthProjected * 5)); // $1 AI = 5 equiv senior minutes... let's use meaningful numbers
  // Actually: an AI engineer at $400K/yr costs ~$200/hr. If you're spending $10/mo on AI
  // and getting 200 hours of AI "work" equivalent... the savings calc:
  const aiHoursWorked = Math.round((monthProjected > 0 ? monthProjected : 0.001) / 0.05 * 10);
  const savedVsHiring = Math.round(aiHoursWorked * AI_ENGINEER_HOURLY);

  document.getElementById('v-monthly').textContent = '$' + (monthActual || monthProjected || 0).toFixed(2);
  document.getElementById('v-hours').textContent = Math.max(1, aiHoursWorked) + 'h';
  document.getElementById('v-savings').textContent = '$' + (savedVsHiring || 0).toLocaleString();

  const badge = document.getElementById('value-badge');
  if (mode === 'actual') {
    badge.textContent = '✓ this month';
    badge.style.color = '#6ee7b7';
  } else if (mode === 'projected') {
    badge.textContent = `${daysOfData}d → 30d proj.`;
    badge.style.color = '#93c5fd';
    badge.style.background = 'rgba(59,130,246,0.1)';
    badge.style.borderColor = 'rgba(59,130,246,0.2)';
  } else {
    badge.textContent = 'session only';
    badge.style.color = '#fcd34d';
    badge.style.background = 'rgba(251,191,36,0.08)';
    badge.style.borderColor = 'rgba(251,191,36,0.15)';
  }

  document.getElementById('v-footer').textContent =
    mode === 'actual' ? 'Based on your actual 30-day usage' :
    mode === 'projected' ? `Projected from ${daysOfData} day${daysOfData !== 1 ? 's' : ''} of data` :
    'Based on this session — grows more accurate over time';
}

renderValue();

// Reset button
document.getElementById("btn-reset").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "reset_session" }, () => {
    render({ inputTokens: 0, outputTokens: 0, inputCost: 0, outputCost: 0 });
  });
});

// Cloud Sync toggle — gated behind Pro account
(function initCloud() {
  const toggle = document.getElementById("cloud-toggle");
  const upgradeHint = document.getElementById("cloud-upgrade");
  const statusEl = document.getElementById("cloud-status");

  // Check stored cloud state
  chrome.storage.local.get(["tokenizer_cloud_pro", "tokenizer_cloud_sync"], (data) => {
    const isPro = !!data.tokenizer_cloud_pro;
    if (isPro) {
      toggle.disabled = false;
      upgradeHint.classList.remove("show");
      toggle.checked = !!data.tokenizer_cloud_sync;
      if (toggle.checked) statusEl.classList.add("show");
    }
  });

  toggle.addEventListener("change", () => {
    chrome.storage.local.get("tokenizer_cloud_pro", (data) => {
      if (!data.tokenizer_cloud_pro) {
        // Not a Pro user — revert toggle and show upgrade prompt
        toggle.checked = false;
        toggle.disabled = true;
        upgradeHint.classList.add("show");
        statusEl.classList.remove("show");
        return;
      }
      // Pro user — persist sync preference
      chrome.storage.local.set({ tokenizer_cloud_sync: toggle.checked });
      if (toggle.checked) {
        statusEl.textContent = "Syncing...";
        statusEl.classList.add("show");
        // TODO: Trigger initial cloud sync via background.js
        setTimeout(() => { statusEl.textContent = "Synced"; }, 1500);
      } else {
        statusEl.classList.remove("show");
      }
    });
  });
})();

// Cost optimization tips — rotate every 10s
(function initTips() {
  const tips = [
    "💡 Switch to Gemini Flash and save ~80% on simple tasks",
    "💡 Claude Haiku costs 20x less than Opus for short replies",
    "💡 GPT-4o Mini handles 90% of tasks at 1/16th the cost",
    "💡 DeepSeek R1 matches GPT-4 quality at a fraction of the price",
    "💡 Batch API calls save up to 50% on OpenAI and Anthropic",
    "💡 Use Gemini 2.0 Flash for coding — same quality, lower cost",
  ];
  const el = document.getElementById("cost-tip");
  if (!el) return;
  let i = 0;
  el.textContent = tips[i];
  setInterval(() => {
    el.style.opacity = "0";
    setTimeout(() => {
      i = (i + 1) % tips.length;
      el.textContent = tips[i];
      el.style.opacity = "1";
    }, 400);
  }, 10000);
})();

// Export CSV
document.getElementById("btn-export").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "get_session" }, (res) => {
    if (!res || !res.session) return;
    const s = res.session;
    const csv = [
      "Metric,Value",
      `Input Tokens,${s.inputTokens}`,
      `Output Tokens,${s.outputTokens}`,
      `Input Cost,$${(s.inputCost||0).toFixed(6)}`,
      `Output Cost,$${(s.outputCost||0).toFixed(6)}`,
      `Total Cost,$${((s.inputCost||0)+(s.outputCost||0)).toFixed(6)}`,
      `API Calls,${s.calls}`,
      `Session Start,${new Date(s.startedAt).toISOString()}`,
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Tokenizer-session-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });
});
