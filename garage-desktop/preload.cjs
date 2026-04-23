const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("portalGarageDesktop", {
    getBaseUrl: () => ipcRenderer.invoke("app:get-base-url"),
    isOnline: () => ipcRenderer.invoke("app:is-online"),
    setBaseUrl: (url) => ipcRenderer.invoke("config:set-base-url", url),
    openLogin: () => ipcRenderer.invoke("app:open-login"),
    enqueueSale: (payload) => ipcRenderer.invoke("outbox:enqueue-sale", payload),
    syncOutbox: () => ipcRenderer.invoke("outbox:sync"),
    onAuthMaybeReady: (fn) => {
        ipcRenderer.on("auth:maybe-ready", fn);
    },
});
