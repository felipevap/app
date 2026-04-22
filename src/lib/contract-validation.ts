import { isValidParamName, parsePlaceholders, type ContractParameter } from "@/lib/contract";
import { sanitizeContractHtml } from "@/lib/sanitize-html";

export const CONTRACT_NAME_MAX = 200;
export const CONTRACT_TEXT_MAX = 200_000; // ~200KB of HTML is more than generous.
export const CONTRACT_PARAM_MAX = 100;

export type ParsedContractInput = {
    name: string;
    type: "service" | "inventory";
    text: string;
    parameters: ContractParameter[];
};

/**
 * Validate + sanitize a payload sent to create/update a contract template.
 * Returns the normalized object on success or a string describing the error.
 */
export function validateContractInput(raw: unknown): ParsedContractInput | string {
    if (!raw || typeof raw !== "object") return "Payload inválido.";
    const body = raw as Record<string, unknown>;

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name || name.length > CONTRACT_NAME_MAX) {
        return `Nome do modelo inválido (máx. ${CONTRACT_NAME_MAX} caracteres).`;
    }

    const type = body.type === "service" || body.type === "inventory" ? body.type : null;
    if (!type) return "Tipo do contrato inválido.";

    const rawText = typeof body.text === "string" ? body.text : "";
    if (!rawText || rawText.length > CONTRACT_TEXT_MAX) {
        return `Texto do contrato vazio ou acima do limite (${CONTRACT_TEXT_MAX}).`;
    }
    const text = sanitizeContractHtml(rawText);
    if (!text.trim()) return "Texto do contrato ficou vazio após sanitização.";

    const paramsIn = Array.isArray(body.parameters) ? body.parameters : [];
    if (paramsIn.length > CONTRACT_PARAM_MAX) {
        return `Muitos parâmetros (limite ${CONTRACT_PARAM_MAX}).`;
    }
    const parameters: ContractParameter[] = [];
    const seen = new Set<string>();
    for (const p of paramsIn) {
        if (!p || typeof p !== "object") return "Parâmetro inválido.";
        const pObj = p as Record<string, unknown>;
        const pname = typeof pObj.name === "string" ? pObj.name.trim() : "";
        if (!isValidParamName(pname)) {
            return `Nome de parâmetro inválido: "${pname}". Use letras, números e _.`;
        }
        if (seen.has(pname)) return `Parâmetro duplicado: ${pname}.`;
        seen.add(pname);
        const ptype =
            pObj.type === "text" || pObj.type === "date" || pObj.type === "number"
                ? pObj.type
                : "text";
        const required = pObj.required === false ? false : true;
        parameters.push({ name: pname, type: ptype, required });
    }

    // Ensure every {{placeholder}} inside the body is declared.
    const detected = parsePlaceholders(text);
    for (const d of detected) {
        if (!seen.has(d.name)) {
            parameters.push({ name: d.name, type: "text", required: true });
            seen.add(d.name);
        }
    }

    return { name, type, text, parameters };
}

/**
 * Validate a `filledParams` object submitted when attaching a template to an
 * event. Accepts only known parameter names and enforces per-value limits.
 */
export function validateFilledParams(
    params: unknown,
    knownNames: Set<string>
): Record<string, string> | string {
    if (!params || typeof params !== "object" || Array.isArray(params)) {
        return "Parâmetros inválidos.";
    }
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(params as Record<string, unknown>)) {
        if (!isValidParamName(k)) return `Nome de parâmetro inválido: ${k}.`;
        if (!knownNames.has(k)) continue; // silently drop unknown keys
        if (typeof v !== "string") return `Valor inválido para ${k}.`;
        if (v.length > 5000) return `Valor de ${k} excede 5000 caracteres.`;
        out[k] = v;
    }
    return out;
}
