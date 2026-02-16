export async function findMatchingProduct(
    capturedImageBase64: string,
    products: { id: string, imagens: string[] }[]
): Promise<string | null> {
    if (products.length === 0) return null;

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
        if (!capturedData) return null;

        let bestMatchId: string | null = null;
        let lowestDiff = Infinity;

        // Simple pixel difference threshold
        const THRESHOLD = 65;

        for (const product of products) {
            if (!product.imagens || product.imagens.length === 0) continue;

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

                    if (avgDiff < lowestDiff) {
                        lowestDiff = avgDiff;
                        bestMatchId = product.id;
                    }
                } catch (e) {
                    console.error("Error comparing product image", product.id, e);
                }
            }
        }

        console.log("Lowest Diff:", lowestDiff);
        return lowestDiff < THRESHOLD ? bestMatchId : null;

    } catch (e) {
        console.error("Comparison error", e);
        return null;
    }
}
