
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

// Define the detection result interface
export interface DetectionResult {
    bbox: [number, number, number, number]; // [x, y, width, height]
    class: string;
    score: number;
}

let model: cocoSsd.ObjectDetection | null = null;

/**
 * Loads the COCO-SSD model.
 */
export async function loadModel(): Promise<boolean> {
    try {
        if (model) {
            console.log('Model already loaded.');
            return true;
        }

        console.log('Loading TensorFlow.js model...');
        await tf.ready();
        console.log('TensorFlow backend:', tf.getBackend());

        // Try setting backend to 'webgl' if available, otherwise 'cpu'
        if (!tf.getBackend()) {
            await tf.setBackend('webgl');
            console.log('Set backend to webgl');
        }

        model = await cocoSsd.load({
            base: 'lite_mobilenet_v2' // Use a lighter model for mobile compatibility
        });
        console.log('TensorFlow.js model loaded successfully.');
        return true;
    } catch (error) {
        console.error('Failed to load TensorFlow.js model:', error);
        return false;
    }
}

/**
 * Detects objects in an image or video element.
 */
export async function detectObjects(
    img: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Promise<DetectionResult[]> {
    if (!model) {
        console.warn('Model not loaded yet. Calling loadModel()...');
        const loaded = await loadModel();
        if (!loaded || !model) {
            console.error('Model failed to load on demand.');
            return [];
        }
    }

    try {
        // console.log('Detecting objects...');
        const predictions = await model.detect(img);
        // console.log(`Found ${predictions.length} objects`);
        return predictions.map(pred => ({
            bbox: pred.bbox,
            class: pred.class,
            score: pred.score
        }));
    } catch (error) {
        console.error('Object detection failed:', error);
        return [];
    }
}

/**
 * Crops an image based on the bounding box.
 * Returns the cropped image as a Data URL (base64 string).
 */
export function cropImage(
    sourceImage: HTMLImageElement | HTMLVideoElement,
    bbox: [number, number, number, number],
    padding: number = 0
): string | null {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    let [x, y, width, height] = bbox;

    // Apply padding
    x = Math.max(0, x - padding);
    y = Math.max(0, y - padding);
    width = width + (padding * 2);
    height = height + (padding * 2);

    // Ensure we don't go out of bounds if source dimensions are available
    if (sourceImage instanceof HTMLImageElement) {
        width = Math.min(width, sourceImage.naturalWidth - x);
        height = Math.min(height, sourceImage.naturalHeight - y);
    } else if (sourceImage instanceof HTMLVideoElement) {
        width = Math.min(width, sourceImage.videoWidth - x);
        height = Math.min(height, sourceImage.videoHeight - y);
    }

    canvas.width = width;
    canvas.height = height;

    // Draw the cropped area
    // source, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight
    ctx.drawImage(sourceImage, x, y, width, height, 0, 0, width, height);

    return canvas.toDataURL('image/jpeg');
}
