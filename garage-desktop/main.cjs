const { app, BrowserWindow, Menu, shell, ipcMain, net } = require("electron");
const path = require("path");
const fs = require("fs");

const PARTITION = "persist:portal-garage-desktop";
const OUTBOX = "outbox.json";

function appBase() {
    const u = process.env.PORTAL_GARAGE_APP_URL || "http://localhost:3000";
    return u.replace(/\/$/, "");
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
    const url = appBase() + "/";
    const list = await ses.cookies.get({ url });
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
    for (const row of q) {
        if (row.type !== "sale") {
            remaining.push(row);
            continue;
        }
        try {
            const res = await fetch(`${appBase()}/api/sales`, {
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

function createWindow() {
    mainWindow = new BrowserWindow({
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

    const startUrl = `${appBase()}/login`;
    mainWindow.loadURL(startUrl);

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: "deny" };
    });

    mainWindow.webContents.on("did-navigate", (_e, url) => {
        try {
            const base = new URL(appBase());
            const u = new URL(url);
            if (u.origin !== base.origin) return;
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
                    label: "Abrir PDV (navegador)",
                    click: () => {
                        if (mainWindow) mainWindow.loadURL(`${appBase()}/pos`);
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
                        if (mainWindow) mainWindow.loadURL(`${appBase()}/login`);
                    },
                },
                {
                    label: "Painel",
                    click: () => {
                        if (mainWindow) mainWindow.loadURL(`${appBase()}/administracao`);
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
    createWindow();
    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});
