// Map COCO-SSD classes to our Product Categories (and keywords)
// Categories: "Eletrônicos", "Roupas", "Móveis", "Livros", "Brinquedos", "Esportes", "Decoração", 
// "CD", "DVD", "LP", "Itens cozinha", "Ferramentas", "Itens piscina", "Cama mesa e banho", 
// "Eletrodomésticos", "Saúde", "Outros"

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
    products: { id: string, imagens: string[], categoria?: string, tags?: string[], nome?: string }[], // Added optional fields
    limit = 5,
    detectedClass?: string, // Optional class from coco-ssd
    minScore = 0.65 // NEW: Minimum score to be considered a match
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
                // Boost if category matches (Weak boost)
                // REDUCED from 0.2 to 0.1 to rely more on visual match
                if (targetCategories?.includes(product.categoria)) {
                    finalScore += 0.1;
                }

                // Boost if detected class match Keywords/Translations in Product Name (Strong boost - "Training")
                // REDUCED from 0.5 to 0.2. 
                // Previous 0.5 was too aggressive, causing "any cup" to match "the captured cup" even if visually distinct.
                const keywords = targetCategories || [];
                // Add the class itself as a keyword
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

            // Only add if it meets a base threshold (before sort) to save memory? 
            // Actually, we filter at the end.
            matches.push({ id: product.id, score: finalScore });
        }

        // Sort by score DESCENDING (higher is better)
        matches.sort((a, b) => b.score - a.score);

        // Filter by minimum score
        // This stops "everything" from showing up.
        // If the best match is 0.4, it returns empty (Not Found), forcing manual search or retry.
        const filteredMatches = matches.filter(m => m.score >= minScore);

        // Return top results
        return filteredMatches.slice(0, limit);

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
