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
