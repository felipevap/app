
import * as tf from '@tensorflow/tfjs';

// Define the detection result interface
export interface DetectionResult {
    bbox: [number, number, number, number]; // [x, y, width, height]
    class: string;
    score: number;
}

let model: tf.GraphModel | null = null;

const YOLO_CLASSES = [
    'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat', 'traffic light',
    'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat', 'dog', 'horse', 'sheep', 'cow',
    'elephant', 'bear', 'zebra', 'giraffe', 'backpack', 'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee',
    'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard',
    'tennis racket', 'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
    'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch',
    'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote', 'keyboard', 'cell phone',
    'microwave', 'oven', 'toaster', 'sink', 'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear',
    'hair drier', 'toothbrush'
];

/**
 * Loads the YOLOv8n model.
 */
export async function loadModel(): Promise<boolean> {
    try {
        if (model) {
            console.log('Model already loaded.');
            return true;
        }

        console.log('Loading YOLOv8n model...');
        await tf.ready();

        // Try setting backend to 'webgl' if available
        if (!tf.getBackend()) {
            await tf.setBackend('webgl');
        }
        console.log('TensorFlow backend:', tf.getBackend());

        model = await tf.loadGraphModel('/models/yolov8n/model.json');

        // Warmup
        const dummyInput = tf.zeros([1, 640, 640, 3]);
        model.execute(dummyInput);
        dummyInput.dispose();

        console.log('YOLOv8n model loaded successfully.');
        return true;
    } catch (error) {
        console.error('Failed to load YOLOv8n model:', error);
        return false;
    }
}

/**
 * Detects objects in an image or video element using YOLOv8.
 */
export async function detectObjects(
    img: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Promise<DetectionResult[]> {
    if (!model) {
        console.warn('Model not loaded yet. Calling loadModel()...');
        const loaded = await loadModel();
        if (!loaded || !model) {
            return [];
        }
    }

    let tfImg: tf.Tensor3D | null = null;
    let resized: tf.Tensor3D | null = null;
    let normalized: tf.Tensor4D | null = null;
    let output: tf.Tensor | null = null;
    let transposed: tf.Tensor | null = null;
    let boxes: tf.Tensor | null = null;
    let scores: tf.Tensor | null = null;
    let classIndices: tf.Tensor | null = null;
    let nmsIndices: tf.Tensor | null = null;

    try {
        // Preprocessing
        tfImg = tf.browser.fromPixels(img);

        // Resize and normalize
        // YOLOv8 expects 640x640
        resized = tf.image.resizeBilinear(tfImg, [640, 640]);
        normalized = resized.div(255.0).expandDims(0).toFloat() as tf.Tensor4D;

        // Inference
        output = model.execute(normalized) as tf.Tensor;

        // Post-processing
        // YOLOv8 output: [1, 84, 8400] -> 4 coords + 80 classes
        transposed = output.squeeze().transpose([1, 0]); // [8400, 84]

        boxes = tf.tidy(() => {
            const w = transposed!.slice([0, 2], [-1, 1]);
            const h = transposed!.slice([0, 3], [-1, 1]);
            const x1 = tf.sub(transposed!.slice([0, 0], [-1, 1]), tf.div(w, 2));
            const y1 = tf.sub(transposed!.slice([0, 1], [-1, 1]), tf.div(h, 2));
            return tf.concat([y1, x1, tf.add(y1, h), tf.add(x1, w)], 1); // [y1, x1, y2, x2] for NMS
        });

        scores = tf.tidy(() => {
            const rawScores = transposed!.slice([0, 4], [-1, 80]); // [8400, 80]
            return rawScores.max(1); // Max score per anchor
        });

        classIndices = tf.tidy(() => {
            const rawScores = transposed!.slice([0, 4], [-1, 80]);
            return rawScores.argMax(1);
        });

        // NMS
        nmsIndices = await tf.image.nonMaxSuppressionAsync(
            boxes as tf.Tensor2D,
            scores as tf.Tensor1D,
            20, // Max output size (limit to top 20 to avoid clutter)
            0.45, // IOU threshold
            0.25 // Score threshold
        );

        const detections: DetectionResult[] = [];
        // Ensure indices is an array
        const indicesData = nmsIndices.dataSync();
        const indices = Array.from(indicesData);

        if (indices.length > 0) {
            const boxesData = boxes.arraySync() as number[][];
            const scoresData = scores.dataSync();
            const classesData = classIndices.dataSync();

            // Calculate scale factors
            let origW = 0;
            let origH = 0;

            if (img instanceof HTMLVideoElement) {
                origW = img.videoWidth;
                origH = img.videoHeight;
            } else if (img instanceof HTMLImageElement) {
                origW = img.naturalWidth || img.width;
                origH = img.naturalHeight || img.height;
            } else {
                origW = img.width;
                origH = img.height;
            }

            // prevent division by zero
            if (origW === 0 || origH === 0) {
                origW = 640;
                origH = 640;
            }

            const scaleX = origW / 640;
            const scaleY = origH / 640;

            for (const idx of indices) {
                const box = boxesData[idx]; // [y1, x1, y2, x2]
                const score = scoresData[idx];
                const classIdx = classesData[idx];
                const label = YOLO_CLASSES[classIdx];

                // Convert back from [y1, x1, y2, x2] to [x, y, w, h] and scale

                const y1 = box[0];
                const x1 = box[1];
                const y2 = box[2];
                const x2 = box[3];

                const w_det = (x2 - x1);
                const h_det = (y2 - y1);

                const finalX = x1 * scaleX;
                const finalY = y1 * scaleY;
                const finalW = w_det * scaleX;
                const finalH = h_det * scaleY;

                detections.push({
                    bbox: [finalX, finalY, finalW, finalH],
                    class: label,
                    score: score
                });
            }
        }

        return detections;

    } catch (error) {
        console.error('YOLOv8 detection failed:', error);
        return [];
    } finally {
        // Cleanup tensors
        if (tfImg) tfImg.dispose();
        if (resized) resized.dispose();
        if (normalized) normalized.dispose();
        if (output) output.dispose();
        if (transposed) transposed.dispose();
        if (boxes) boxes.dispose();
        if (scores) scores.dispose();
        if (classIndices) classIndices.dispose();
        if (nmsIndices) nmsIndices.dispose();
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
        width = Math.min(width, (sourceImage.naturalWidth || sourceImage.width) - x);
        height = Math.min(height, (sourceImage.naturalHeight || sourceImage.height) - y);
    } else if (sourceImage instanceof HTMLVideoElement) {
        width = Math.min(width, sourceImage.videoWidth - x);
        height = Math.min(height, sourceImage.videoHeight - y);
    }

    // Sanity check
    if (width <= 0 || height <= 0) return null;

    canvas.width = width;
    canvas.height = height;

    // Draw the cropped area
    try {
        ctx.drawImage(sourceImage, x, y, width, height, 0, 0, width, height);
        return canvas.toDataURL('image/jpeg');
    } catch (e) {
        console.error("Crop failed", e);
        return null;
    }
}
