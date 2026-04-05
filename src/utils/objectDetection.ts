
import * as tf from '@tensorflow/tfjs';

export interface DetectionResult {
    bbox: [number, number, number, number];
    class: string;
    score: number;
}

let model: tf.GraphModel | null = null;

const MODEL_URL = '/models/yolo26n/model.json';
const INPUT_SIZE = 640;
const MAX_OUTPUT_BOXES = 25;
const SCORE_THRESHOLD = 0.25;
const NMS_IOU_THRESHOLD = 0.5;

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

function getImageDimensions(img: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement): { w: number; h: number } {
    if (img instanceof HTMLVideoElement) {
        return { w: img.videoWidth || img.width, h: img.videoHeight || img.height };
    }
    if (img instanceof HTMLImageElement) {
        return { w: img.naturalWidth || img.width, h: img.naturalHeight || img.height };
    }
    return { w: img.width, h: img.height };
}

export async function loadModel(): Promise<boolean> {
    try {
        if (model) {
            return true;
        }

        await tf.ready();
        if (!tf.getBackend()) {
            await tf.setBackend('webgl');
        }

        model = await tf.loadGraphModel(MODEL_URL);

        const dummyInput = tf.zeros([1, INPUT_SIZE, INPUT_SIZE, 3]);
        try {
            model.execute({ 'images:0': dummyInput });
        } catch {
            model.execute(dummyInput);
        }
        dummyInput.dispose();

        return true;
    } catch (error) {
        console.error('Failed to load YOLO26n model:', error);
        return false;
    }
}

export async function detectObjects(
    img: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Promise<DetectionResult[]> {
    if (!model) {
        const loaded = await loadModel();
        if (!loaded || !model) {
            return [];
        }
    }

    let tfImg: tf.Tensor3D | null = null;
    let resized: tf.Tensor3D | null = null;
    let normalized: tf.Tensor4D | null = null;
    let output: tf.Tensor | null = null;
    let nmsIndices: tf.Tensor1D | null = null;

    try {
        const { w: origW, h: origH } = getImageDimensions(img);
        const safeW = origW > 0 ? origW : INPUT_SIZE;
        const safeH = origH > 0 ? origH : INPUT_SIZE;
        const scaleX = safeW / INPUT_SIZE;
        const scaleY = safeH / INPUT_SIZE;

        tfImg = tf.browser.fromPixels(img);
        resized = tf.image.resizeBilinear(tfImg, [INPUT_SIZE, INPUT_SIZE]);
        normalized = resized.div(255.0).expandDims(0).toFloat() as tf.Tensor4D;

        try {
            output = model!.execute({ 'images:0': normalized }) as tf.Tensor;
        } catch {
            output = model!.execute(normalized) as tf.Tensor;
        }

        const squeezed = output.squeeze();
        const flat = await squeezed.data();
        squeezed.dispose();
        output.dispose();
        output = null;

        const numPred = flat.length / 6;
        const candY1: number[] = [];
        const candX1: number[] = [];
        const candY2: number[] = [];
        const candX2: number[] = [];
        const candScores: number[] = [];
        const candCls: number[] = [];

        for (let i = 0; i < numPred; i++) {
            const b = i * 6;
            const x1 = flat[b];
            const y1 = flat[b + 1];
            const x2 = flat[b + 2];
            const y2 = flat[b + 3];
            const score = flat[b + 4];
            const cls = Math.round(flat[b + 5]);

            if (score < SCORE_THRESHOLD || cls < 0 || cls >= YOLO_CLASSES.length) {
                continue;
            }
            if (x2 <= x1 || y2 <= y1) {
                continue;
            }

            candX1.push(x1);
            candY1.push(y1);
            candX2.push(x2);
            candY2.push(y2);
            candScores.push(score);
            candCls.push(cls);
        }

        if (candScores.length === 0) {
            return [];
        }


        const n = candScores.length;
        const nmsBoxes = new Float32Array(n * 4);
        for (let i = 0; i < n; i++) {
            nmsBoxes[i * 4] = candY1[i];
            nmsBoxes[i * 4 + 1] = candX1[i];
            nmsBoxes[i * 4 + 2] = candY2[i];
            nmsBoxes[i * 4 + 3] = candX2[i];
        }

        const boxesT = tf.tensor2d(nmsBoxes, [n, 4]);
        const scoresT = tf.tensor1d(candScores);

        nmsIndices = await tf.image.nonMaxSuppressionAsync(
            boxesT,
            scoresT,
            MAX_OUTPUT_BOXES,
            NMS_IOU_THRESHOLD,
            SCORE_THRESHOLD
        );

        boxesT.dispose();
        scoresT.dispose();

        const idxArr = Array.from(await nmsIndices.data());
        nmsIndices.dispose();
        nmsIndices = null;

        const detections: DetectionResult[] = [];
        for (const idx of idxArr) {
            const x1 = candX1[idx];
            const y1 = candY1[idx];
            const x2 = candX2[idx];
            const y2 = candY2[idx];
            const wDet = x2 - x1;
            const hDet = y2 - y1;
            const cls = candCls[idx];

            detections.push({
                bbox: [x1 * scaleX, y1 * scaleY, wDet * scaleX, hDet * scaleY],
                class: YOLO_CLASSES[cls],
                score: candScores[idx]
            });
        }

        detections.sort((a, b) => b.score - a.score);
        return detections;
    } catch (error) {
        console.error('YOLO26 detection failed:', error);
        return [];
    } finally {
        if (tfImg) tfImg.dispose();
        if (resized) resized.dispose();
        if (normalized) normalized.dispose();
        if (output) output.dispose();
        if (nmsIndices) nmsIndices.dispose();
    }
}

export function cropImage(
    sourceImage: HTMLImageElement | HTMLVideoElement,
    bbox: [number, number, number, number],
    padding: number = 0
): string | null {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    let [x, y, width, height] = bbox;

    x = Math.max(0, x - padding);
    y = Math.max(0, y - padding);
    width = width + (padding * 2);
    height = height + (padding * 2);

    if (sourceImage instanceof HTMLImageElement) {
        width = Math.min(width, (sourceImage.naturalWidth || sourceImage.width) - x);
        height = Math.min(height, (sourceImage.naturalHeight || sourceImage.height) - y);
    } else if (sourceImage instanceof HTMLVideoElement) {
        width = Math.min(width, sourceImage.videoWidth - x);
        height = Math.min(height, sourceImage.videoHeight - y);
    }

    if (width <= 0 || height <= 0) return null;

    canvas.width = width;
    canvas.height = height;

    try {
        ctx.drawImage(sourceImage, x, y, width, height, 0, 0, width, height);
        return canvas.toDataURL('image/jpeg');
    } catch (e) {
        console.error('Crop failed', e);
        return null;
    }
}
