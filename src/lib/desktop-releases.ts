import fs from "node:fs";
import path from "node:path";

export type DesktopReleasesPayload = {
    version: string;
    updatedAt?: string;
    windowsUrl?: string | null;
    macUrl?: string | null;
    windowsSha256?: string | null;
    macSha256?: string | null;
    notes?: string;
};

function loadPublicDesktopReleases(): DesktopReleasesPayload | null {
    try {
        const p = path.join(process.cwd(), "public", "desktop", "releases.json");
        if (!fs.existsSync(p)) return null;
        return JSON.parse(fs.readFileSync(p, "utf8")) as DesktopReleasesPayload;
    } catch {
        return null;
    }
}

export function parseDesktopReleasesFromEnv(): DesktopReleasesPayload {
    const raw = process.env.DESKTOP_RELEASES_JSON;
    if (raw?.trim()) {
        try {
            return JSON.parse(raw) as DesktopReleasesPayload;
        } catch {
            return { version: "0.0.0", notes: "DESKTOP_RELEASES_JSON inválido." };
        }
    }
    const local = loadPublicDesktopReleases();
    if (local) return local;
    return {
        version: "—",
        notes: "Crie public/desktop/releases.json ou defina DESKTOP_RELEASES_JSON. Para Windows: npm run desktop:dist:win e copie o .exe para public/desktop/PortalGarage-Setup-0.1.0.exe.",
    };
}
