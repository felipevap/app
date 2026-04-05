import { getMobileNetEmbedding } from './mobileNetEmbedding';

const EMBEDDING_DIM = 1024;

function meanEmbeddings(vectors: number[][]): number[] {
    if (vectors.length === 0) return [];
    const dim = vectors[0].length;
    const out = new Float64Array(dim);
    for (const v of vectors) {
        if (v.length !== dim) continue;
        for (let i = 0; i < dim; i++) out[i] += v[i];
    }
    const n = vectors.filter(v => v.length === dim).length;
    if (n === 0) return [];
    for (let i = 0; i < dim; i++) out[i] /= n;
    return Array.from(out);
}

export function isValidStoredEmbedding(v: unknown): v is number[] {
    if (!Array.isArray(v) || v.length !== EMBEDDING_DIM) return false;
    return v.every((x) => typeof x === 'number' && Number.isFinite(x));
}

export async function computeProductEmbeddingMean(imageSrcs: string[]): Promise<number[] | null> {
    if (!imageSrcs.length) return null;
    const vectors: number[][] = [];
    for (const src of imageSrcs) {
        try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = src;
            await new Promise<void>((resolve) => {
                img.onload = () => resolve();
                img.onerror = () => resolve();
            });
            if (!img.complete || img.naturalWidth === 0) continue;
            const t = await getMobileNetEmbedding(img);
            if (t) {
                const arr = (await t.array()) as number[];
                t.dispose();
                if (arr.length === EMBEDDING_DIM) vectors.push(arr);
            }
        } catch {
            continue;
        }
    }
    const mean = meanEmbeddings(vectors);
    return mean.length === EMBEDDING_DIM ? mean : null;
}
