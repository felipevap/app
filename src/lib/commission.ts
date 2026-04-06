export const DEFAULT_COMMISSION_PERCENT = 20;

export function clampCommissionPercent(n: number, fallback = DEFAULT_COMMISSION_PERCENT): number {
    if (!Number.isFinite(n)) return fallback;
    return Math.min(100, Math.max(0, n));
}

export function parseCommissionPercentInput(
    input: unknown,
    fallback: number = DEFAULT_COMMISSION_PERCENT
): number {
    if (input === undefined || input === null || input === "") return fallback;
    const n = typeof input === "number" ? input : parseFloat(String(input).replace(",", "."));
    return clampCommissionPercent(n, fallback);
}

export function commissionDecimalRate(percent: number): number {
    return clampCommissionPercent(percent) / 100;
}
