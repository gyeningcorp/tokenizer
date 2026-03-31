const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("tokenizerAPI", {
  testConnection: (opts) => ipcRenderer.invoke("test-connection", opts),
  countTokensLocal: (opts) => ipcRenderer.invoke("count-tokens-local", opts),
  onBridgeTokens: (callback) => ipcRenderer.on("bridge-tokens", (_, data) => callback(data)),
});
