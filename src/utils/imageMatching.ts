// Map COCO-SSD classes to our Product Categories (and keywords)
// Categories: "Eletrônicos", "Roupas", "Móveis", "Livros", "Brinquedos", "Esportes", "Decoração", 
// "CD", "DVD", "LP", "Itens cozinha", "Ferramentas", "Itens piscina", "Cama mesa e banho", 
// "Eletrodomésticos", "Saúde", "Outros"

export const COCO_TO_CATEGORY_MAP: Record<string, string[]> = {
    // Furniture -> Móveis, Decoração
    'chair': ['Móveis', 'Decoração'],
    'couch': ['Móveis', 'Decoração'],
    'potted plant': ['Decoração', 'Itens piscina'],
    'bed': ['Móveis', 'Cama mesa e banho'],
    'dining table': ['Móveis'],
    'toilet': ['Móveis', 'Outros'],
    'tv': ['Eletrônicos'],
    'laptop': ['Eletrônicos'],
    'mouse': ['Eletrônicos'],
    'remote': ['Eletrônicos'],
    'keyboard': ['Eletrônicos'],
    'cell phone': ['Eletrônicos'],
    'microwave': ['Eletrodomésticos', 'Itens cozinha'],
    'oven': ['Eletrodomésticos', 'Itens cozinha'],
    'toaster': ['Eletrodomésticos', 'Itens cozinha'],
    'sink': ['Móveis', 'Itens cozinha'],
    'refrigerator': ['Eletrodomésticos', 'Itens cozinha'],
    'book': ['Livros'],
    'clock': ['Decoração', 'Eletrônicos'],
    'vase': ['Decoração'],
    'scissors': ['Ferramentas', 'Outros'],
    'teddy bear': ['Brinquedos'],
    'hair drier': ['Eletrônicos', 'Saúde'],
    'toothbrush': ['Saúde'],
    'tie': ['Roupas'],
    'suitcase': ['Outros'],
    'frisbee': ['Esportes', 'Brinquedos'],
    'skis': ['Esportes'],
    'snowboard': ['Esportes'],
    'sports ball': ['Esportes', 'Brinquedos'],
    'kite': ['Brinquedos'],
    'baseball bat': ['Esportes'],
    'baseball glove': ['Esportes'],
    'skateboard': ['Esportes', 'Brinquedos'],
    'surfboard': ['Esportes'],
    'tennis racket': ['Esportes'],
    'bottle': ['Itens cozinha', 'Decoração'],
    'wine glass': ['Itens cozinha', 'Decoração'],
    'cup': ['Itens cozinha'],
    'fork': ['Itens cozinha'],
    'knife': ['Itens cozinha'],
    'spoon': ['Itens cozinha'],
    'bowl': ['Itens cozinha'],
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
    'bicycle': ['Esportes', 'Brinquedos'],
    'car': ['Brinquedos', 'Outros'],
    'motorcycle': ['Brinquedos', 'Outros'],
    'airplane': ['Brinquedos'],
    'bus': ['Brinquedos'],
    'train': ['Brinquedos'],
    'truck': ['Brinquedos'],
    'boat': ['Brinquedos'],
    'traffic light': ['Outros'],
    'fire hydrant': ['Outros'],
    'stop sign': ['Outros'],
    'parking meter': ['Outros'],
    'bench': ['Móveis'],
    'bird': ['Decoração', 'Outros'],
    'cat': ['Decoração', 'Outros'],
    'dog': ['Decoração', 'Outros'],
    'horse': ['Brinquedos', 'Decoração'],
    'sheep': ['Brinquedos', 'Decoração'],
    'cow': ['Brinquedos', 'Decoração'],
    'elephant': ['Brinquedos', 'Decoração'],
    'bear': ['Brinquedos', 'Decoração'],
    'zebra': ['Brinquedos', 'Decoração'],
    'giraffe': ['Brinquedos', 'Decoração'],
    'backpack': ['Outros', 'Esportes'],
    'umbrella': ['Outros'],
    'handbag': ['Roupas', 'Outros'],
};

export async function findMatchingProducts(
    capturedImageBase64: string,
    products: { id: string, imagens: string[], categoria?: string, tags?: string[], nome?: string }[], // Added optional fields
    limit = 5,
    detectedClass?: string // Optional class from coco-ssd
): Promise<{ id: string, score: number }[]> {
    if (products.length === 0) return [];

    const loadImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    };

    // Histogram Calculation: 4 bins per channel (4x4x4 = 64 bins)
    const getHistogram = (img: HTMLImageElement) => {
        const canvas = document.createElement('canvas');
        const size = 64; // Resize for speed
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        const histogram = new Array(64).fill(0);
        const totalPixels = size * size;

        for (let i = 0; i < data.length; i += 4) {
            const r = Math.floor(data[i] / 64); // 0-3
            const g = Math.floor(data[i + 1] / 64); // 0-3
            const b = Math.floor(data[i + 2] / 64); // 0-3
            const bin = r * 16 + g * 4 + b;
            histogram[bin]++;
        }

        // Normalize
        return histogram.map(count => count / totalPixels);
    };

    // Compare two histograms using Intersection (0 to 1, 1 is identical)
    const compareHistograms = (h1: number[], h2: number[]) => {
        let intersection = 0;
        for (let i = 0; i < h1.length; i++) {
            intersection += Math.min(h1[i], h2[i]);
        }
        return intersection;
    };

    try {
        const capturedImg = await loadImage(capturedImageBase64);
        const capturedHist = getHistogram(capturedImg);

        if (!capturedHist) return [];

        const matches: { id: string, score: number }[] = [];

        // Target categories from detection
        const targetCategories = detectedClass ? COCO_TO_CATEGORY_MAP[detectedClass] : [];

        for (const product of products) {
            if (!product.imagens || product.imagens.length === 0) continue;

            let bestProductScore = 0; // 0 to 1 (Similarity now, not diff)

            // 1. Calculate Image Similarity (Histogram)
            // We only check the first image for speed, or maybe first 2
            const imagesToCheck = product.imagens.slice(0, 2);

            for (const productImage of imagesToCheck) {
                try {
                    const productImg = await loadImage(productImage);
                    const productHist = getHistogram(productImg);
                    if (!productHist) continue;

                    const similarity = compareHistograms(capturedHist, productHist);
                    if (similarity > bestProductScore) {
                        bestProductScore = similarity;
                    }
                } catch (e) {
                    // console.error("Error comparing product image", product.id, e);
                }
            }

            // 2. Apply Boosting based on detected class
            let finalScore = bestProductScore;

            if (detectedClass && product.categoria) {
                // Boost if category matches
                if (targetCategories?.includes(product.categoria)) {
                    finalScore += 0.3; // Significant boost
                }

                // Boost if detected class name is in product name or tags
                if (product.nome?.toLowerCase().includes(detectedClass.toLowerCase()) ||
                    product.tags?.includes(detectedClass.toLowerCase())) {
                    finalScore += 0.4; // Huge boost for direct keyword match
                }
            }

            matches.push({ id: product.id, score: finalScore });
        }

        // Sort by score DESCENDING (higher is better)
        matches.sort((a, b) => b.score - a.score);

        // Return top results
        return matches.slice(0, limit);

    } catch (e) {
        console.error("Comparison error", e);
        return [];
    }
}

// Keep generic signature for backward compatibility
export async function findMatchingProduct(
    capturedImageBase64: string,
    products: { id: string, imagens: string[] }[]
): Promise<string | null> {
    const matches = await findMatchingProducts(capturedImageBase64, products, 1);
    return matches.length > 0 ? matches[0].id : null;
}
