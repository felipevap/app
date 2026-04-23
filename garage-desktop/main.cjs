const { app, BrowserWindow, Menu, shell, ipcMain, net, session } = require("electron");
const path = require("path");
const fs = require("fs");

const PARTITION = "persist:portal-garage-desktop";
const OUTBOX = "outbox.json";
const USER_BASE_URL_FILE = "app-base-url.txt";
const DEFAULT_APP_BASE = "https://portalgarage.com.br";

function userBaseUrlPath() {
    return path.join(app.getPath("userData"), USER_BASE_URL_FILE);
}

function readUserBaseUrl() {
    try {
        const t = fs.readFileSync(userBaseUrlPath(), "utf8").trim();
        if (t && (t.startsWith("http://") || t.startsWith("https://"))) {
            return t.replace(/\/$/, "");
        }
    } catch {
        /* no file */
    }
    return null;
}

function appBase() {
    const fromFile = readUserBaseUrl();
    if (fromFile) return fromFile;
    const u = process.env.PORTAL_GARAGE_APP_URL;
    if (u && String(u).trim()) return String(u).trim().replace(/\/$/, "");
    return DEFAULT_APP_BASE;
}

function outboxPath() {
    return path.join(app.getPath("userData"), OUTBOX);
}

function readOutbox() {
    try {
        const raw = fs.readFileSync(outboxPath(), "utf8");
        const j = JSON.parse(raw);
        return Array.isArray(j) ? j : [];
    } catch {
        return [];
    }
}

function writeOutbox(rows) {
    fs.writeFileSync(outboxPath(), JSON.stringify(rows, null, 2), "utf8");
}

function appendOutbox(entry) {
    const q = readOutbox();
    q.push({ ...entry, queuedAt: new Date().toISOString() });
    writeOutbox(q);
}

async function getSessionCookieHeader(win) {
    const ses = win.webContents.session;
    const base = appBase();
    if (!base) return "";
    const list = await ses.cookies.get({ url: base + "/" });
    const gg = list.find((c) => c.name === "gg_session");
    if (!gg) return "";
    return `gg_session=${encodeURIComponent(gg.value)}`;
}

async function syncOutbox(win) {
    if (!net.isOnline()) return { ok: false, reason: "offline" };
    const cookie = await getSessionCookieHeader(win);
    if (!cookie) return { ok: false, reason: "no-session" };

    const q = readOutbox();
    if (q.length === 0) return { ok: true, synced: 0 };

    const remaining = [];
    let synced = 0;
    const base = appBase();
    for (const row of q) {
        if (row.type !== "sale") {
            remaining.push(row);
            continue;
        }
        try {
            const res = await fetch(`${base}/api/sales`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Cookie: cookie,
                },
                body: JSON.stringify(row.payload),
            });
            if (res.ok) {
                synced++;
            } else {
                remaining.push(row);
            }
        } catch {
            remaining.push(row);
        }
    }
    writeOutbox(remaining);
    return { ok: true, synced };
}

let mainWindow = null;
let loadFailedOnce = false;

function loadConfigurePage() {
    if (!mainWindow) return;
    loadFailedOnce = false;
    mainWindow.loadFile(path.join(__dirname, "static", "configure.html"));
}

async function resolveStartPath() {
    const base = appBase();
    try {
        const ses = session.fromPartition(PARTITION);
        const list = await ses.cookies.get({ url: `${base}/` });
        const gg = list.find((c) => c.name === "gg_session");
        if (gg?.value) return "/administracao";
    } catch {
        /* ignore */
    }
    return "/login";
}

function loadLoginPage() {
    if (!mainWindow) return;
    loadFailedOnce = false;
    mainWindow.loadURL(`${appBase()}/login`);
}

function loadErrorPage() {
    if (!mainWindow) return;
    loadFailedOnce = true;
    mainWindow.loadFile(path.join(__dirname, "static", "load-error.html"));
}

async function createWindow() {
    mainWindow = new BrowserWindow({
        title: "Portal Garage",
        width: 1280,
        height: 840,
        minWidth: 900,
        minHeight: 600,
        webPreferences: {
            preload: path.join(__dirname, "preload.cjs"),
            contextIsolation: true,
            nodeIntegration: false,
            partition: PARTITION,
        },
    });

    const base = appBase();
    const startPath = await resolveStartPath();
    mainWindow.loadURL(`${base}${startPath}`);

    mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
        if (!isMainFrame) return;
        if (validatedURL.startsWith("file:")) return;
        if (errorCode === -3) return;
        if (loadFailedOnce) return;
        loadErrorPage();
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: "deny" };
    });

    mainWindow.webContents.on("did-navigate", (_e, url) => {
        try {
            const base = appBase();
            if (!base) return;
            const bo = new URL(base);
            const u = new URL(url);
            if (u.origin !== bo.origin) return;
            const p = u.pathname;
            if (
                p === "/administracao" ||
                p.startsWith("/portal") ||
                p.startsWith("/super") ||
                p.startsWith("/pos") ||
                p.startsWith("/capture")
            ) {
                mainWindow?.webContents.send("auth:maybe-ready");
            }
        } catch {
            /* ignore */
        }
    });

    const template = [
        {
            label: "Arquivo",
            submenu: [
                {
                    label: "Definir URL do site…",
                    click: () => {
                        loadConfigurePage();
                    },
                },
                { type: "separator" },
                {
                    label: "Abrir PDV (navegador)",
                    click: () => {
                        const b = appBase();
                        if (mainWindow && b) mainWindow.loadURL(`${b}/pos`);
                    },
                },
                { type: "separator" },
                {
                    label: "Modo offline (informação)",
                    click: () => {
                        mainWindow?.loadFile(path.join(__dirname, "static", "offline.html"));
                    },
                },
                { type: "separator" },
                { role: process.platform === "darwin" ? "close" : "quit" },
            ],
        },
        {
            label: "Conta",
            submenu: [
                {
                    label: "Início / Login",
                    click: () => {
                        loadLoginPage();
                    },
                },
                {
                    label: "Painel",
                    click: () => {
                        const b = appBase();
                        if (mainWindow && b) mainWindow.loadURL(`${b}/administracao`);
                    },
                },
            ],
        },
        {
            label: "Sincronização",
            submenu: [
                {
                    label: "Sincronizar fila agora",
                    click: async () => {
                        if (!mainWindow) return;
                        const r = await syncOutbox(mainWindow);
                        const { dialog } = require("electron");
                        dialog.showMessageBox(mainWindow, {
                            type: r.ok ? "info" : "warning",
                            message: r.ok ? `Sincronizado: ${r.synced ?? 0} venda(s).` : "Não foi possível sincronizar (rede ou sessão).",
                        });
                    },
                },
            ],
        },
    ];
    if (process.platform === "darwin") {
        template.unshift({
            label: app.name,
            submenu: [
                { role: "about" },
                { type: "separator" },
                { role: "services" },
                { type: "separator" },
                { role: "hide" },
                { role: "hideOthers" },
                { role: "unhide" },
                { type: "separator" },
                { role: "quit" },
            ],
        });
    }
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

ipcMain.handle("app:get-base-url", () => appBase());
ipcMain.handle("app:is-online", () => net.isOnline());
ipcMain.handle("config:set-base-url", (_e, url) => {
    const trimmed = String(url || "").trim().replace(/\/$/, "");
    if (!trimmed || (!trimmed.startsWith("http://") && !trimmed.startsWith("https://"))) {
        return { ok: false, error: "invalid" };
    }
    try {
        fs.writeFileSync(userBaseUrlPath(), trimmed + "\n", "utf8");
        return { ok: true };
    } catch {
        return { ok: false, error: "write" };
    }
});
ipcMain.handle("app:open-login", () => {
    loadLoginPage();
    return { ok: true };
});
ipcMain.handle("outbox:enqueue-sale", (_e, payload) => {
    appendOutbox({ type: "sale", payload });
    return { ok: true };
});
ipcMain.handle("outbox:sync", async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    if (!win) return { ok: false };
    return syncOutbox(win);
});

app.whenReady().then(() => {
    void createWindow();
    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) void createWindow();
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});
