import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

// Define the object detection result type
export interface DetectionResult {
    class: string;
    score: number;
    bbox: [number, number, number, number]; // [x, y, width, height]
}

// Load the model
let model: cocoSsd.ObjectDetection | null = null;

export const loadModel = async (): Promise<boolean> => {
    try {
        await tf.ready();
        model = await cocoSsd.load();
        console.log('Model loaded successfully');
        return true;
    } catch (error) {
        console.error('Failed to load model:', error);
        return false;
    }
};

// Detect objects in an image element (img, video, or canvas)
export const detectObjects = async (
    imageElement: tf.Tensor3D | ImageData | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
    minScore = 0.6
): Promise<DetectionResult[]> => {
    if (!model) {
        console.warn('Model not loaded yet');
        return [];
    }

    try {
        const predictions = await model.detect(imageElement);
        return predictions.filter(p => p.score >= minScore).map(p => ({
            class: p.class,
            score: p.score,
            bbox: p.bbox
        }));
    } catch (error) {
        console.error('Detection error:', error);
        return [];
    }
};
