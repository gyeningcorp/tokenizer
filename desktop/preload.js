const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("tokenizerAPI", {
  testConnection: (opts) => ipcRenderer.invoke("test-connection", opts),
  countTokensLocal: (opts) => ipcRenderer.invoke("count-tokens-local", opts),
});
