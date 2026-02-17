export async function findMatchingProducts(
    capturedImageBase64: string,
    products: { id: string, imagens: string[] }[],
    limit = 5
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

    const getImageData = (img: HTMLImageElement, size = 32) => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.drawImage(img, 0, 0, size, size);
        return ctx.getImageData(0, 0, size, size).data;
    };

    try {
        const capturedImg = await loadImage(capturedImageBase64);
        const capturedData = getImageData(capturedImg);
        if (!capturedData) return [];

        const matches: { id: string, score: number }[] = [];

        // Increased threshold to find more creates suggestions
        const THRESHOLD = 85;

        for (const product of products) {
            if (!product.imagens || product.imagens.length === 0) continue;

            let bestProductScore = Infinity;

            for (const productImage of product.imagens) {
                try {
                    const productImg = await loadImage(productImage);
                    const productData = getImageData(productImg);
                    if (!productData) continue;

                    let diff = 0;
                    let totalPixels = capturedData.length / 4;

                    for (let i = 0; i < capturedData.length; i += 4) {
                        const r = Math.abs(capturedData[i] - productData[i]);
                        const g = Math.abs(capturedData[i + 1] - productData[i + 1]);
                        const b = Math.abs(capturedData[i + 2] - productData[i + 2]);
                        diff += (r + g + b) / 3;
                    }

                    const avgDiff = diff / totalPixels;
                    if (avgDiff < bestProductScore) {
                        bestProductScore = avgDiff;
                    }
                } catch (e) {
                    console.error("Error comparing product image", product.id, e);
                }
            }

            if (bestProductScore < THRESHOLD) {
                matches.push({ id: product.id, score: bestProductScore });
            }
        }

        matches.sort((a, b) => a.score - b.score);
        return matches.slice(0, limit);

    } catch (e) {
        console.error("Comparison error", e);
        return [];
    }
}

// Keep generic signature for backward compatibility if mostly needed, 
// but we will use the plural one in the app.
export async function findMatchingProduct(
    capturedImageBase64: string,
    products: { id: string, imagens: string[] }[]
): Promise<string | null> {
    const matches = await findMatchingProducts(capturedImageBase64, products, 1);
    return matches.length > 0 ? matches[0].id : null;
}
