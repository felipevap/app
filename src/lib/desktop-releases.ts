export type DesktopReleasesPayload = {
    version: string;
    updatedAt?: string;
    windowsUrl?: string | null;
    macUrl?: string | null;
    windowsSha256?: string | null;
    macSha256?: string | null;
    notes?: string;
};

export function parseDesktopReleasesFromEnv(): DesktopReleasesPayload {
    const raw = process.env.DESKTOP_RELEASES_JSON;
    if (!raw?.trim()) {
        return {
            version: "0.0.0",
            notes: "Defina DESKTOP_RELEASES_JSON no servidor com JSON: version, windowsUrl, macUrl, updatedAt, notes (opcional), windowsSha256, macSha256.",
        };
    }
    try {
        return JSON.parse(raw) as DesktopReleasesPayload;
    } catch {
        return { version: "0.0.0", notes: "DESKTOP_RELEASES_JSON inválido." };
    }
}
