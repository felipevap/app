// Removed unused import
import { cosineSimilarity } from './mobileNetEmbedding';

// Map COCO-SSD classes to our Product Categories (and keywords)
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

export async function findMatchingProducts(
    capturedImageBase64: string,
    products: { id: string, imagens: string[], categoria?: string, tags?: string[], nome?: string, embedding?: number[] }[],
    limit = 5,
    detectedClass?: string,
    minScore = 0.65
): Promise<{ id: string, score: number }[]> {

    // 1. MobileNet Embedding Match (Primary)
    // We generated embedding for the CAPTURED image.
    const img = new Image();
    img.src = capturedImageBase64;
    await new Promise((resolve) => { img.onload = resolve; });

    let capturedEmbedding: number[] | null = null;

    try {
        const { getMobileNetEmbedding } = await import('./mobileNetEmbedding');
        const tensorEmbedding = await getMobileNetEmbedding(img);
        if (tensorEmbedding) {
            capturedEmbedding = await tensorEmbedding.array() as number[];
            tensorEmbedding.dispose();
        }
    } catch (e) {
        console.error("Failed to generate embedding for captured image", e);
    }

    const matches: { id: string, score: number }[] = [];
    const targetCategories = detectedClass ? COCO_TO_CATEGORY_MAP[detectedClass] : null;

    for (const product of products) {
        let visualScore = 0;

        // A. Embedding Score (Best)
        if (capturedEmbedding && product.embedding) {
            const sim = cosineSimilarity(capturedEmbedding, product.embedding);
            visualScore = sim;
        } else {
            // Fallback for when embeddings are not ready
            visualScore = 0.4;
        }

        let finalScore = visualScore;

        // 2. Apply Boosting based on detected class
        if (detectedClass && product.categoria) {
            // Boost if category matches
            if (targetCategories?.includes(product.categoria)) {
                finalScore += 0.1;
            }

            // Boost if detected class match Keywords
            const keywords = targetCategories || [];
            keywords.push(detectedClass);

            const productName = product.nome?.toLowerCase() || "";
            const productTags = product.tags || [];

            const hasKeywordMatch = keywords.some(kw =>
                productName.includes(kw.toLowerCase()) ||
                productTags.includes(kw.toLowerCase())
            );

            if (hasKeywordMatch) {
                finalScore += 0.2;
            }
        }

        if (finalScore >= minScore) {
            matches.push({ id: product.id, score: finalScore });
        }
    }

    matches.sort((a, b) => b.score - a.score);
    return matches.slice(0, limit);
}
