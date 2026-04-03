const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const https = require("https");
const http = require("http");
const { WebSocketServer } = require("ws");

let mainWindow;
let wss;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 780,
    minWidth: 700,
    minHeight: 600,
    backgroundColor: "#0d0d16",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, "../icons/icon128.png"),
  });

  mainWindow.loadFile(path.join(__dirname, "renderer.html"));
  mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  createWindow();
  startBridgeServer();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// ── Extension Bridge (WebSocket server on localhost:9877) ──────────
function startBridgeServer() {
  try {
    const ALLOWED_EXT_ID = process.env.TOKENIZER_EXT_ID || null;
    wss = new WebSocketServer({ port: 9877, host: "127.0.0.1" });
    wss.on("connection", (ws, req) => {
      // Validate extension identity from query parameter
      const url = new URL(req.url, "http://127.0.0.1:9877");
      const extId = url.searchParams.get("extId");
      if (!extId || (ALLOWED_EXT_ID && extId !== ALLOWED_EXT_ID)) {
        console.log("[Bridge] Rejected connection — invalid or missing extId");
        ws.close(4001, "Unauthorized");
        return;
      }
      console.log("[Bridge] Extension connected (id: " + extId + ")");
      ws.on("message", (raw) => {
        try {
          const msg = JSON.parse(raw);
          if (msg.type === "api_tokens" && mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("bridge-tokens", {
              inputTokens: msg.inputTokens || 0,
              outputTokens: msg.outputTokens || 0,
              model: msg.model || "",
              platform: msg.platform || "",
              url: msg.url || "",
            });
          }
        } catch (_) {}
      });
      ws.on("close", () => console.log("[Bridge] Extension disconnected"));
    });
    wss.on("error", (e) => {
      if (e.code === "EADDRINUSE") {
        console.log("[Bridge] Port 9877 in use — bridge disabled");
      }
    });
    console.log("[Bridge] WebSocket server listening on ws://127.0.0.1:9877");
  } catch (e) {
    console.log("[Bridge] Failed to start:", e.message);
  }
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Test local model connection
ipcMain.handle("test-connection", async (_, { url, model }) => {
  return new Promise((resolve) => {
    try {
      const testUrl = new URL(url);
      const lib = testUrl.protocol === "https:" ? https : http;
      // Try a lightweight ping — list models endpoint
      const pingUrl = `${testUrl.protocol}//${testUrl.host}/api/tags`;
      const req = lib.get(pingUrl, { timeout: 5000 }, (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            const models = json.models?.map((m) => m.name) || [];
            resolve({ ok: true, models, message: `Connected! ${models.length} model(s) found.` });
          } catch {
            resolve({ ok: true, models: [], message: "Connected (non-Ollama endpoint)." });
          }
        });
      });
      req.on("error", (e) => resolve({ ok: false, message: `Connection failed: ${e.message}` }));
      req.on("timeout", () => { req.destroy(); resolve({ ok: false, message: "Connection timed out." }); });
    } catch (e) {
      resolve({ ok: false, message: `Invalid URL: ${e.message}` });
    }
  });
});

// Count tokens via local model (optional — just returns estimate if unavailable)
ipcMain.handle("count-tokens-local", async (_, { url, model, text }) => {
  return new Promise((resolve) => {
    try {
      const apiUrl = new URL(url);
      const lib = apiUrl.protocol === "https:" ? https : http;
      const body = JSON.stringify({ model, prompt: text, stream: false });
      const options = {
        hostname: apiUrl.hostname,
        port: apiUrl.port || (apiUrl.protocol === "https:" ? 443 : 80),
        path: "/api/generate",
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
        timeout: 10000,
      };
      const req = lib.request(options, (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            // Ollama returns prompt_eval_count for input tokens
            const tokens = json.prompt_eval_count || null;
            resolve({ ok: true, tokens });
          } catch {
            resolve({ ok: false, tokens: null });
          }
        });
      });
      req.on("error", () => resolve({ ok: false, tokens: null }));
      req.on("timeout", () => { req.destroy(); resolve({ ok: false, tokens: null }); });
      req.write(body);
      req.end();
    } catch {
      resolve({ ok: false, tokens: null });
    }
  });
});
