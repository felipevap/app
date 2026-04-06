import type { GarageSale, User } from "@prisma/client";

export const CONTRACT_PHASE_ONBOARDING = "onboarding";
export const CONTRACT_PHASE_PRE_EVENT = "pre_event";

export type ContractSegment = { text: string; paramKey: string | null };

export const CONTRACT_PARAM_OPTIONS: { value: string; label: string }[] = [
    { value: "EVENT_NAME", label: "Nome do evento" },
    { value: "RESPONSIBLE_NAME", label: "Nome do responsável" },
    { value: "OWNER_EMAIL", label: "E-mail do proprietário" },
    { value: "EVENT_ADDRESS", label: "Endereço do evento" },
    { value: "CEP", label: "CEP" },
    { value: "CPF", label: "CPF" },
    { value: "PIX", label: "Chave PIX" },
    { value: "START_DATE", label: "Data de início" },
    { value: "END_DATE", label: "Data de término" },
];

export function parseContractSegmentsFromText(raw: string): ContractSegment[] {
    const parts = raw
        .split(/\n\s*\n/)
        .map((s) => s.trim())
        .filter(Boolean);
    return parts.map((text) => ({ text, paramKey: null }));
}

export function normalizeSegments(input: unknown): ContractSegment[] | null {
    if (!Array.isArray(input) || input.length === 0) return null;
    const out: ContractSegment[] = [];
    for (const row of input) {
        if (!row || typeof row !== "object") return null;
        const text = typeof (row as { text?: unknown }).text === "string" ? (row as { text: string }).text : "";
        const pk = (row as { paramKey?: unknown }).paramKey;
        const paramKey = pk === null || pk === "" ? null : typeof pk === "string" ? pk : null;
        if (paramKey !== null && !/^[A-Z][A-Z0-9_]*$/.test(paramKey)) return null;
        out.push({ text, paramKey });
    }
    return out;
}

function fmtDate(d: Date | null | undefined, loc = "pt-BR"): string {
    if (!d) return "";
    try {
        return d.toLocaleDateString(loc);
    } catch {
        return d.toISOString().split("T")[0];
    }
}

export function buildContractParamMap(gs: GarageSale, ownerName: string | null): Record<string, string> {
    return {
        EVENT_NAME: gs.nome ?? "",
        RESPONSIBLE_NAME: gs.responsavel ?? "",
        OWNER_EMAIL: gs.email ?? "",
        EVENT_ADDRESS: gs.endereco ?? "",
        CEP: gs.cep ?? "",
        CPF: gs.cpf ?? "",
        PIX: gs.pix ?? "",
        START_DATE: fmtDate(gs.dataInicio),
        END_DATE: fmtDate(gs.dataFim ?? undefined),
        OWNER_NAME: ownerName ?? gs.responsavel ?? "",
    };
}

export function renderContractBody(segments: ContractSegment[], params: Record<string, string>): string {
    const chunks: string[] = [];
    for (const seg of segments) {
        if (seg.paramKey) {
            chunks.push(params[seg.paramKey] ?? "");
        } else {
            chunks.push(seg.text);
        }
    }
    return chunks.join("\n\n").trim();
}

export function isValidSignatureDataUrl(s: string): boolean {
    if (typeof s !== "string" || s.length < 800) return false;
    if (!s.startsWith("data:image/png;base64,")) return false;
    if (s.length > 4_000_000) return false;
    return true;
}
