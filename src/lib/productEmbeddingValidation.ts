const EMBEDDING_DIM = 1024;

export function parseEmbeddingInput(value: unknown): number[] | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (!Array.isArray(value) || value.length !== EMBEDDING_DIM) return undefined;
    const out: number[] = new Array(EMBEDDING_DIM);
    for (let i = 0; i < EMBEDDING_DIM; i++) {
        const x = value[i];
        if (typeof x !== 'number' || !Number.isFinite(x)) return undefined;
        out[i] = x;
    }
    return out;
}
