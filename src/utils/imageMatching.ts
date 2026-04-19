import { cosineSimilarity } from './mobileNetEmbedding';

// Map YOLO/COCO classes to our Product Categories (and keywords used for boosts).
export const COCO_TO_CATEGORY_MAP: Record<string, string[]> = {
    // Furniture -> Móveis, Decoração
    'chair': ['Móveis', 'Decoração', 'Cadeira'],
    'couch': ['Móveis', 'Decoração', 'Sofá'],
    'potted plant': ['Decoração', 'Itens piscina', 'Planta'],
    'bed': ['Móveis', 'Cama mesa e banho', 'Cama'],
    'dining table': ['Móveis', 'Mesa'],
    'toilet': ['Móveis', 'Outros', 'Privada'],
    'tv': ['Eletrônicos', 'TV', 'Televisão'],
    'laptop': ['Eletrônicos', 'Notebook', 'Laptop', 'Computador'],
    'mouse': ['Eletrônicos', 'Mouse'],
    'remote': ['Eletrônicos', 'Controle'],
    'keyboard': ['Eletrônicos', 'Teclado'],
    'cell phone': ['Eletrônicos', 'Celular', 'Smartphone', 'iPhone', 'Android'],
    'microwave': ['Eletrodomésticos', 'Itens cozinha', 'Microondas'],
    'oven': ['Eletrodomésticos', 'Itens cozinha', 'Forno'],
    'toaster': ['Eletrodomésticos', 'Itens cozinha', 'Torradeira'],
    'sink': ['Móveis', 'Itens cozinha', 'Pia'],
    'refrigerator': ['Eletrodomésticos', 'Itens cozinha', 'Geladeira'],
    'book': ['Livros', 'Livro'],
    'clock': ['Decoração', 'Eletrônicos', 'Relógio'],
    'vase': ['Decoração', 'Vaso'],
    'scissors': ['Ferramentas', 'Outros', 'Tesoura'],
    'teddy bear': ['Brinquedos', 'Urso'],
    'hair drier': ['Eletrônicos', 'Saúde', 'Secador'],
    'toothbrush': ['Saúde', 'Escova'],
    'tie': ['Roupas', 'Gravata'],
    'suitcase': ['Outros', 'Mala'],
    'frisbee': ['Esportes', 'Brinquedos'],
    'skis': ['Esportes'],
    'snowboard': ['Esportes'],
    'sports ball': ['Esportes', 'Brinquedos', 'Bola'],
    'kite': ['Brinquedos', 'Pipa'],
    'baseball bat': ['Esportes', 'Taco'],
    'baseball glove': ['Esportes', 'Luva'],
    'skateboard': ['Esportes', 'Brinquedos', 'Skate'],
    'surfboard': ['Esportes', 'Prancha'],
    'tennis racket': ['Esportes', 'Raquete'],
    'bottle': ['Itens cozinha', 'Decoração', 'Garrafa'],
    'wine glass': ['Itens cozinha', 'Decoração', 'Taça'],
    'cup': ['Itens cozinha', 'Copo', 'Xícara'],
    'fork': ['Itens cozinha', 'Garfo'],
    'knife': ['Itens cozinha', 'Faca'],
    'spoon': ['Itens cozinha', 'Colher'],
    'bowl': ['Itens cozinha', 'Tigela'],
    'banana': ['Outros'],
    'apple': ['Outros'],
    'sandwich': ['Outros'],
    'orange': ['Outros'],
    'broccoli': ['Outros'],
    'carrot': ['Outros'],
    'hot dog': ['Outros'],
    'pizza': ['Outros'],
    'donut': ['Outros'],
    'cake': ['Outros'],
    'bicycle': ['Esportes', 'Brinquedos', 'Bicicleta'],
    'car': ['Brinquedos', 'Outros', 'Carro'],
    'motorcycle': ['Brinquedos', 'Outros', 'Moto'],
    'airplane': ['Brinquedos', 'Avião'],
    'bus': ['Brinquedos', 'Ônibus'],
    'train': ['Brinquedos', 'Trem'],
    'truck': ['Brinquedos', 'Caminhão'],
    'boat': ['Brinquedos', 'Barco'],
    'traffic light': ['Outros'],
    'fire hydrant': ['Outros'],
    'stop sign': ['Outros'],
    'parking meter': ['Outros'],
    'bench': ['Móveis', 'Banco'],
    'bird': ['Decoração', 'Outros'],
    'cat': ['Decoração', 'Outros'],
    'dog': ['Decoração', 'Outros'],
    'horse': ['Brinquedos', 'Decoração', 'Cavalo'],
    'sheep': ['Brinquedos', 'Decoração', 'Ovelha'],
    'cow': ['Brinquedos', 'Decoração', 'Vaca'],
    'elephant': ['Brinquedos', 'Decoração', 'Elefante'],
    'bear': ['Brinquedos', 'Decoração', 'Urso'],
    'zebra': ['Brinquedos', 'Decoração', 'Zebra'],
    'giraffe': ['Brinquedos', 'Decoração', 'Girafa'],
    'backpack': ['Outros', 'Esportes', 'Mochila'],
    'umbrella': ['Outros', 'Guarda-chuva'],
    'handbag': ['Roupas', 'Outros', 'Bolsa'],
};

/**
 * Minimum visual cosine similarity required before considering a product a
 * potential match. Below this floor we treat it as noise (no match), even if
 * category/keyword boosts would otherwise push it past the threshold.
 */
const MIN_VISUAL_SIMILARITY = 0.55;

/**
 * Match a captured image against the product catalog. Only products with a
 * pre-computed embedding can produce a real match; if either the captured
 * embedding or the stored embedding is missing we no longer assign a bogus
 * fallback score — the product is simply not considered for that frame.
 */
export async function findMatchingProducts(
    capturedImageBase64: string,
    products: { id: string, imagens: string[], categoria?: string, tags?: string[], nome?: string, embedding?: number[] | null }[],
    limit = 5,
    detectedClass?: string,
    minScore = 0.68
): Promise<{ id: string, score: number }[]> {

    // Generate the captured image embedding once.
    const img = new Image();
    img.src = capturedImageBase64;
    await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
    });
    if (!img.complete || img.naturalWidth === 0) return [];

    let capturedEmbedding: number[] | null = null;

    try {
        const { getMobileNetEmbedding } = await import('./mobileNetEmbedding');
        const tensorEmbedding = await getMobileNetEmbedding(img);
        if (tensorEmbedding) {
            capturedEmbedding = (await tensorEmbedding.array()) as number[];
            tensorEmbedding.dispose();
        }
    } catch (e) {
        console.error("Failed to generate embedding for captured image", e);
    }

    // Without a captured embedding we cannot make a reliable visual match.
    if (!capturedEmbedding || capturedEmbedding.length !== 1024) return [];

    const matches: { id: string, score: number }[] = [];
    const targetCategories = detectedClass ? COCO_TO_CATEGORY_MAP[detectedClass] : null;

    for (const product of products) {
        // Skip products without an indexable embedding — they cannot match visually.
        if (!product.embedding || product.embedding.length !== 1024) continue;

        const visualScore = cosineSimilarity(capturedEmbedding, product.embedding);
        if (visualScore < MIN_VISUAL_SIMILARITY) continue;

        let finalScore = visualScore;

        // Apply small, conservative boosts when the YOLO class hints align.
        if (detectedClass && product.categoria) {
            if (targetCategories?.includes(product.categoria)) {
                finalScore += 0.05;
            }

            const keywords = [...(targetCategories ?? []), detectedClass];
            const productName = product.nome?.toLowerCase() ?? "";
            const productTags = product.tags ?? [];

            const hasKeywordMatch = keywords.some((kw) => {
                const k = kw.toLowerCase();
                return productName.includes(k) || productTags.includes(k);
            });
            if (hasKeywordMatch) finalScore += 0.08;
        }

        // Clamp so boosts never make an OK match look certain.
        if (finalScore > 0.99) finalScore = 0.99;

        if (finalScore >= minScore) {
            matches.push({ id: product.id, score: finalScore });
        }
    }

    matches.sort((a, b) => b.score - a.score);
    return matches.slice(0, limit);
}
