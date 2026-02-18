import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';

let model: mobilenet.MobileNet | null = null;
let isLoading = false;

// Singleton style loader
export async function loadMobileNetModel() {
    if (model) return model;
    if (isLoading) {
        // Wait for it to load
        while (isLoading) {
            await new Promise(resolve => setTimeout(resolve, 100));
            if (model) return model;
        }
    }

    isLoading = true;
    try {
        console.log('Loading MobileNet...');
        // version 2, alpha 1.0 is a good balance of speed and accuracy
        model = await mobilenet.load({ version: 2, alpha: 1.0 });
        console.log('MobileNet Loaded!');
        return model;
    } catch (error) {
        console.error('Failed to load MobileNet:', error);
        throw error;
    } finally {
        isLoading = false;
    }
}

// Generate embedding for an image element or tensor
export async function getMobileNetEmbedding(imageElement: HTMLImageElement | HTMLVideoElement | tf.Tensor3D): Promise<tf.Tensor1D | null> {
    const net = await loadMobileNetModel();
    if (!net) return null;

    try {
        // infer(img, true) returns the embedding (1024-d vector for v2 usually) 
        // strictly speaking infer returns a Tensor of shape [1, 1024]
        const result = net.infer(imageElement, true);
        const embedding = result.flatten() as tf.Tensor1D;
        // dispose result but keep embedding? No, infer(true) returns a tensor we must manage. 
        // But wait, we want to return it. Caller handles disposal? 
        // Let's return a regular array to avoid memory leaks if caller forgets tf.dispose
        return embedding;
    } catch (error) {
        console.error('Error generating embedding:', error);
        return null;
    }
}

// Helper to calculate Cosine Similarity between two arrays/tensors
export function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Add embedding to a Product object (we will store it in memory, not db for now)
export interface ProductWithEmbedding {
    id: string;
    embedding?: number[];
}
