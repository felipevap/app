export const DEFAULT_AR_SCORE_THRESHOLD = 0.72;
export const MIN_AR_SCORE_THRESHOLD = 0.55;
export const MAX_AR_SCORE_THRESHOLD = 0.95;

export const DEFAULT_RESERVATION_TTL_MINUTES = 30;
export const MIN_RESERVATION_TTL_MINUTES = 5;
export const MAX_RESERVATION_TTL_MINUTES = 24 * 60;

export function parseArScoreThresholdInput(
    input: unknown,
    fallback: number = DEFAULT_AR_SCORE_THRESHOLD
): number {
    if (input === undefined || input === null || input === "") return fallback;
    const n = typeof input === "number" ? input : parseFloat(String(input).replace(",", "."));
    if (!Number.isFinite(n)) return fallback;
    return Math.min(MAX_AR_SCORE_THRESHOLD, Math.max(MIN_AR_SCORE_THRESHOLD, n));
}

export function parseReservationTTLInput(
    input: unknown,
    fallback: number = DEFAULT_RESERVATION_TTL_MINUTES
): number {
    if (input === undefined || input === null || input === "") return fallback;
    const n = typeof input === "number" ? input : parseInt(String(input), 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(MAX_RESERVATION_TTL_MINUTES, Math.max(MIN_RESERVATION_TTL_MINUTES, Math.round(n)));
}
