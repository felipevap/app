import type { GarageSale, User } from "@prisma/client";

export type ContractParameter = { name: string; type: 'text' | 'date' | 'number'; required: boolean };

export function parsePlaceholders(text: string): ContractParameter[] {
    const paramSet = new Set<string>();
    const regex = /\{\{([^}]+)\}\}/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
        paramSet.add(match[1].trim());
    }
    return Array.from(paramSet).map(name => ({ name, type: 'text' as const, required: true }));
}

export function renderContractBody(text: string, params: Record<string, string>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => params[key] || '');
}

export function isValidSignatureDataUrl(s: string): boolean {
    if (typeof s !== "string" || s.length < 800) return false;
    if (!s.startsWith("data:image/png;base64,")) return false;
    if (s.length > 4_000_000) return false;
    return true;
}
