export type ContractParameter = { name: string; type: 'text' | 'date' | 'number'; required: boolean };

// Parameter names may only contain letters, digits, and underscores, 1..64 chars.
const PARAM_NAME_RE = /^[a-zA-Z0-9_]{1,64}$/;

export function isValidParamName(name: string): boolean {
    return typeof name === "string" && PARAM_NAME_RE.test(name);
}

/**
 * Parse the set of `{{paramName}}` placeholders found in a contract body
 * (plain text or HTML; placeholders live inside text content either way).
 */
export function parsePlaceholders(text: string): ContractParameter[] {
    const paramSet = new Set<string>();
    const regex = /\{\{\s*([a-zA-Z0-9_]{1,64})\s*\}\}/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
        paramSet.add(match[1]);
    }
    return Array.from(paramSet).map((name) => ({ name, type: "text" as const, required: true }));
}

/**
 * Heuristic detector for whether a contract body is already HTML.
 */
export function looksLikeHtml(s: string): boolean {
    return /<(p|div|span|br|strong|em|ul|ol|li|h[1-6])\b/i.test(s);
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/**
 * Convert a plain-text body to a simple HTML paragraph structure, preserving
 * line breaks. Legacy (non-HTML) contract bodies flow through here so that we
 * can render everything uniformly as HTML on screen.
 */
export function plainTextToHtml(text: string): string {
    const escaped = escapeHtml(text);
    return escaped
        .split(/\n{2,}/)
        .map((block) => `<p>${block.replace(/\n/g, "<br/>")}</p>`)
        .join("");
}

/**
 * Replace `{{paramName}}` placeholders with filled values, always returning
 * HTML. Values are HTML-escaped so user-provided input cannot inject tags.
 */
export function renderContractBody(text: string, params: Record<string, string>): string {
    const body = looksLikeHtml(text) ? text : plainTextToHtml(text);
    return body.replace(/\{\{\s*([a-zA-Z0-9_]{1,64})\s*\}\}/g, (_match, key: string) => {
        const raw = params[key];
        if (typeof raw !== "string") return "";
        return escapeHtml(raw);
    });
}

export function isValidSignatureDataUrl(s: string): boolean {
    if (typeof s !== "string" || s.length < 800) return false;
    if (!s.startsWith("data:image/png;base64,")) return false;
    if (s.length > 4_000_000) return false;
    return true;
}
