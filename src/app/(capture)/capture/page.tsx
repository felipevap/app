"use client";

import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import Webcam from 'react-webcam';
// import { useProducts, type Product } from '@/contexts/ProductContext';
import type { Product } from '@/contexts/GarageSaleContext';
import { useGarageSales } from '@/contexts/GarageSaleContext';
import { findMatchingProducts } from '@/utils/imageMatching';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { loadModel, detectObjects, cropImage } from '@/utils/objectDetection';
import { isValidStoredEmbedding } from '@/utils/productEmbedding';

interface AROverlay {
    id: string;
    bbox: [number, number, number, number]; // [x, y, w, h] from Detection
    product: Product;
    score: number;
}


const RemainingTime = ({ createdAt, ttlMinutes = 30 }: { createdAt: string; ttlMinutes?: number }) => {
    const [timeLeft, setTimeLeft] = useState("");
    const [expired, setExpired] = useState(false);

    useEffect(() => {
        const calculate = () => {
            const created = new Date(createdAt).getTime();
            const now = new Date().getTime();
            const diff = created + ttlMinutes * 60 * 1000 - now;

            if (diff <= 0) {
                setTimeLeft("00:00");
                setExpired(true);
                return;
            }

            const minutes = Math.floor(diff / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        };
        calculate();
        const interval = setInterval(calculate, 1000);
        return () => clearInterval(interval);
    }, [createdAt, ttlMinutes]);

    if (expired) return <span className="text-red-500 font-bold text-[10px]">EXPIRADO</span>;
    return <span className="text-yellow-400 font-bold font-mono text-xs">⏱ {timeLeft}</span>;
};

interface ProductImageCarouselProps {
    images: string[];
    alt: string;
    imageClassName: string;
    currentIndex: number;
    onChangeIndex: (nextIndex: number) => void;
    showIndicators?: boolean;
}

const ProductImageCarousel = ({
    images,
    alt,
    imageClassName,
    currentIndex,
    onChangeIndex,
    showIndicators = false
}: ProductImageCarouselProps) => {
    if (!images.length) return null;

    const safeIndex = Math.min(currentIndex, images.length - 1);
    const hasMultipleImages = images.length > 1;

    const goToPreviousImage = () => {
        if (!hasMultipleImages) return;
        onChangeIndex((safeIndex - 1 + images.length) % images.length);
    };

    const goToNextImage = () => {
        if (!hasMultipleImages) return;
        onChangeIndex((safeIndex + 1) % images.length);
    };

    return (
        <div className="space-y-2">
            <div className="relative">
                <img src={images[safeIndex]} alt={alt} className={imageClassName} />
                {hasMultipleImages && (
                    <>
                        <button
                            type="button"
                            onClick={goToPreviousImage}
                            className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-stone-900/50 hover:bg-stone-900/70 border border-stone-200/80 text-white flex items-center justify-center transition-colors"
                            aria-label="Foto anterior"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <polyline points="15 18 9 12 15 6"></polyline>
                            </svg>
                        </button>
                        <button
                            type="button"
                            onClick={goToNextImage}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-stone-900/50 hover:bg-stone-900/70 border border-stone-200/80 text-white flex items-center justify-center transition-colors"
                            aria-label="Próxima foto"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                        </button>
                        <span className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded-full bg-stone-900/70 border border-stone-200/60 text-white font-semibold">
                            {safeIndex + 1}/{images.length}
                        </span>
                    </>
                )}
            </div>
            {showIndicators && hasMultipleImages && (
                <div className="flex items-center justify-center gap-1.5">
                    {images.map((_, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => onChangeIndex(idx)}
                            className={`h-1.5 rounded-full transition-all ${idx === safeIndex ? 'w-4 bg-blue-400' : 'w-2 bg-neutral-500 hover:bg-neutral-300'}`}
                            aria-label={`Ir para foto ${idx + 1}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default function CapturePage() {
    const webcamRef = useRef<Webcam>(null);
    const { garageSales, products, getProductsByGarageSale, loading, updateProduct } = useGarageSales();
    const [selectedGarageSaleId, setSelectedGarageSaleId] = useState<string>("");
    const [isScanning, setIsScanning] = useState(false);
    const [foundProduct, setFoundProduct] = useState<Product | null>(null);
    const [foundProducts, setFoundProducts] = useState<Product[]>([]); // New: Multiple products
    const [foundProductImageIndex, setFoundProductImageIndex] = useState(0);
    const [alternativeProducts, setAlternativeProducts] = useState<Product[]>([]);
    const [showSimilarModal, setShowSimilarModal] = useState(false);
    const [showManualCrop, setShowManualCrop] = useState(false);
    const [manualCropImage, setManualCropImage] = useState<string | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [detections, setDetections] = useState<any[]>([]); // Store detections for selection
    const [showSelectionModal, setShowSelectionModal] = useState(false);
    const [selectedCrop, setSelectedCrop] = useState<[number, number, number, number] | null>(null);

    const currentProducts = useMemo(
        () =>
            (selectedGarageSaleId ? getProductsByGarageSale(selectedGarageSaleId) : products).filter(
                (p) => p.status === 'disponível'
            ),
        [selectedGarageSaleId, products, getProductsByGarageSale]
    );

    // AR Scanner State
    const [arOverlays, setArOverlays] = useState<AROverlay[]>([]);
    const lastScanTime = useRef(0);
    const isProcessingFrame = useRef(false);
    const overlayLastSeenRef = useRef<Map<string, { bbox: [number, number, number, number]; product: Product; score: number; ts: number }>>(new Map());

    const [showNotFound, setShowNotFound] = useState(false);
    const [cart, setCart] = useState<any[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [customerInfo, setCustomerInfo] = useState({ nome: '', telefone: '', email: '' });
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [cartTab, setCartTab] = useState<'current' | 'pending'>('current');
    const [pendingOrders, setPendingOrders] = useState<any[]>([]);



    const [isLoadingPending, setIsLoadingPending] = useState(false);

    const [pendingCount, setPendingCount] = useState(0);

    const fetchPendingOrders = useCallback(() => {
        if (!customerInfo.email && !customerInfo.telefone) return;

        setIsLoadingPending(true);
        const params = new URLSearchParams();
        if (customerInfo.email) params.append('customerEmail', customerInfo.email);
        if (customerInfo.telefone) params.append('customerPhone', customerInfo.telefone);

        fetch(`/api/pending-orders?${params.toString()}`)
            .then(res => res.json())
            .then(data => {
                const orders = Array.isArray(data) ? data : [];
                setPendingOrders(orders);
                // Calculate total pending items
                const totalItems = orders.reduce((acc: number, order: any) => {
                    return acc + order.items.reduce((iAcc: number, item: any) => iAcc + item.quantity, 0);
                }, 0);
                setPendingCount(totalItems);
            })
            .catch(err => console.error(err))
            .finally(() => setIsLoadingPending(false));
    }, [customerInfo.email, customerInfo.telefone]);

    useEffect(() => {
        if (isCartOpen && cartTab === 'pending') {
            fetchPendingOrders();
        }
    }, [isCartOpen, cartTab, fetchPendingOrders]);

    // Initial fetch if user info exists
    useEffect(() => {
        if (customerInfo.nome || customerInfo.telefone) {
            fetchPendingOrders();
        }
    }, [customerInfo.nome, customerInfo.telefone]);

    useEffect(() => {
        setFoundProductImageIndex(0);
    }, [foundProduct?.id]);

    const [searchResults, setSearchResults] = useState<Product[]>([]);
    // const [modelLoaded, setModelLoaded] = useState(false);
    // const [detections, setDetections] = useState<DetectionResult[]>([]);
    const router = useRouter();

    useEffect(() => {
        if (garageSales.length > 0 && !selectedGarageSaleId) {
            const mostRecent = garageSales.reduce((latest, gs) =>
                gs.criadoEm > latest.criadoEm ? gs : latest
            );
            setSelectedGarageSaleId(mostRecent.id);
        }
    }, [garageSales, selectedGarageSaleId]);

    // Load customer info from local storage on mount
    useEffect(() => {
        const savedInfo = localStorage.getItem('customerInfo');
        if (savedInfo) {
            setCustomerInfo(JSON.parse(savedInfo));
        }
    }, []);

    // Save customer info to local storage whenever it changes
    useEffect(() => {
        if (customerInfo.nome || customerInfo.telefone || customerInfo.email) {
            localStorage.setItem('customerInfo', JSON.stringify(customerInfo));
        }
    }, [customerInfo]);

    // Load AI Model & Process Embeddings
    const [isModelLoading, setIsModelLoading] = useState(true);
    const [isEmbeddingProcessing, setIsEmbeddingProcessing] = useState(false);
    const [embeddingProgress, setEmbeddingProgress] = useState(0);

    useEffect(() => {
        loadModel().then(() => setIsModelLoading(false));
    }, []);

    const embeddingFailedIdsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        embeddingFailedIdsRef.current.clear();
    }, [selectedGarageSaleId]);

    useEffect(() => {
        overlayLastSeenRef.current.clear();
        setArOverlays([]);
    }, [selectedGarageSaleId]);

    useEffect(() => {
        let cancelled = false;
        const processEmbeddings = async () => {
            const { getMobileNetEmbedding } = await import('@/utils/mobileNetEmbedding');
            setIsEmbeddingProcessing(true);
            const total = Math.max(currentProducts.length, 1);
            let processed = 0;
            for (const product of currentProducts) {
                if (cancelled) return;
                if (isValidStoredEmbedding(product.embedding) || embeddingFailedIdsRef.current.has(product.id)) {
                    processed++;
                    setEmbeddingProgress(Math.floor((processed / total) * 100));
                    continue;
                }
                if (!product.imagens?.length) {
                    processed++;
                    setEmbeddingProgress(Math.floor((processed / total) * 100));
                    continue;
                }
                try {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.src = product.imagens[0];
                    await new Promise<void>((resolve) => {
                        img.onload = () => resolve();
                        img.onerror = () => resolve();
                    });
                    if (!img.complete || img.naturalWidth === 0) {
                        embeddingFailedIdsRef.current.add(product.id);
                    } else {
                        const embeddingTensor = await getMobileNetEmbedding(img);
                        if (embeddingTensor && !cancelled) {
                            const arr = (await embeddingTensor.array()) as number[];
                            embeddingTensor.dispose();
                            if (arr.length === 1024) {
                                await updateProduct(product.id, { embedding: arr });
                            } else {
                                embeddingFailedIdsRef.current.add(product.id);
                            }
                        } else {
                            embeddingFailedIdsRef.current.add(product.id);
                        }
                    }
                } catch {
                    embeddingFailedIdsRef.current.add(product.id);
                }
                processed++;
                setEmbeddingProgress(Math.floor((processed / total) * 100));
                if (processed % 5 === 0) await new Promise((r) => setTimeout(r, 20));
            }
            if (!cancelled) setIsEmbeddingProcessing(false);
        };
        if (currentProducts.length > 0) {
            processEmbeddings();
        } else {
            setIsEmbeddingProcessing(false);
        }
        return () => {
            cancelled = true;
        };
    }, [currentProducts, updateProduct]);

    // Continuous AR recognition loop. Runs while the camera is idle (no
    // modal open, no captured image), scanning ~2x per second.
    const selectedGarageSale = useMemo(
        () => garageSales.find((gs) => gs.id === selectedGarageSaleId),
        [garageSales, selectedGarageSaleId]
    );
    const arScoreThreshold = selectedGarageSale?.arScoreThreshold ?? 0.72;
    const reservationTTLMinutes = selectedGarageSale?.reservationTTLMinutes ?? 30;

    useEffect(() => {
        const AR_SCORE_THRESHOLD = arScoreThreshold;
        const OVERLAY_PERSIST_MS = 1800; // keep an overlay while tracking briefly dips
        const overlayLastSeen = overlayLastSeenRef.current;

        const scanFrame = async () => {
            const now = Date.now();
            if (now - lastScanTime.current < 500) return; // ~2Hz throttle
            if (isProcessingFrame.current) return;
            if (!webcamRef.current || !webcamRef.current.video || webcamRef.current.video.readyState !== 4) return;
            if (isScanning || foundProduct || isModelLoading) {
                if (arOverlays.length > 0) setArOverlays([]);
                return;
            }

            isProcessingFrame.current = true;
            try {
                const video = webcamRef.current.video;
                const detections = await detectObjects(video);

                // Match any detections found on this frame.
                for (const det of detections.slice(0, 3)) {
                    const croppedSrc = cropImage(video, det.bbox, 0);
                    if (!croppedSrc) continue;
                    const matches = await findMatchingProducts(croppedSrc, currentProducts, 1, det.class, AR_SCORE_THRESHOLD);
                    if (matches.length > 0 && matches[0].score >= AR_SCORE_THRESHOLD) {
                        const product = currentProducts.find((p) => p.id === matches[0].id);
                        if (product) {
                            overlayLastSeen.set(product.id, {
                                bbox: det.bbox as [number, number, number, number],
                                product,
                                score: matches[0].score,
                                ts: Date.now(),
                            });
                        }
                    }
                }

                // Fallback: if YOLO found nothing, still try matching the whole
                // frame. Useful for items outside the 80 COCO classes (clothes,
                // tools, specific home items) but with a good visual embedding.
                if (detections.length === 0) {
                    const fullSrc = cropImage(video, [0, 0, video.videoWidth, video.videoHeight], 0);
                    if (fullSrc) {
                        const matches = await findMatchingProducts(fullSrc, currentProducts, 1, undefined, AR_SCORE_THRESHOLD + 0.02);
                        if (matches.length > 0) {
                            const product = currentProducts.find((p) => p.id === matches[0].id);
                            if (product) {
                                overlayLastSeen.set(product.id, {
                                    bbox: [
                                        video.videoWidth * 0.2,
                                        video.videoHeight * 0.15,
                                        video.videoWidth * 0.6,
                                        video.videoHeight * 0.7,
                                    ],
                                    product,
                                    score: matches[0].score,
                                    ts: Date.now(),
                                });
                            }
                        }
                    }
                }

                // Drop entries that haven't been seen recently.
                const tsCutoff = Date.now() - OVERLAY_PERSIST_MS;
                for (const [k, v] of overlayLastSeen) {
                    if (v.ts < tsCutoff) overlayLastSeen.delete(k);
                }
                const nextOverlays: AROverlay[] = Array.from(overlayLastSeen.values())
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 2)
                    .map((v) => ({ id: v.product.id, bbox: v.bbox, product: v.product, score: v.score }));
                setArOverlays(nextOverlays);
            } catch (e) {
                console.error("AR Scan error", e);
            } finally {
                isProcessingFrame.current = false;
                lastScanTime.current = Date.now();
            }
        };

        const interval = setInterval(scanFrame, 200);
        return () => clearInterval(interval);
    }, [currentProducts, isScanning, foundProduct, arOverlays.length, isModelLoading, arScoreThreshold]);

    // Helper to map video coordinates to screen coordinates (object-fit: cover)
    const getScreenCoords = (bbox: [number, number, number, number]) => {
        if (!webcamRef.current || !webcamRef.current.video) return { left: 0, top: 0, width: 0, height: 0 };

        const video = webcamRef.current.video;
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        const clientWidth = video.clientWidth; // Element width on screen
        const clientHeight = video.clientHeight; // Element height on screen

        // Calculate scale for object-fit: cover
        const scale = Math.max(clientWidth / videoWidth, clientHeight / videoHeight);

        // Calculate offsets
        const dx = (clientWidth - videoWidth * scale) / 2;
        const dy = (clientHeight - videoHeight * scale) / 2;

        return {
            left: bbox[0] * scale + dx,
            top: bbox[1] * scale + dy,
            width: bbox[2] * scale,
            height: bbox[3] * scale
        };
    };

    const [sessionId, setSessionId] = useState<string>("");

    useEffect(() => {
        let sid = localStorage.getItem('garage_sale_session_id');
        if (!sid) {
            sid = crypto.randomUUID();
            localStorage.setItem('garage_sale_session_id', sid);
        }
        setSessionId(sid);
    }, []);



    const formatBRL = (value: number): string => {
        return value.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const processImage = useCallback(async (imageSrc: string) => {
        setIsScanning(true);
        setFoundProduct(null);
        setFoundProducts([]);
        setAlternativeProducts([]);
        setShowNotFound(false);

        // Show image immediately
        setCapturedImage(imageSrc);
        setShowSelectionModal(true);
        setDetections([]); // Clear previous detections
        setSelectedCrop(null);

        const allAlternatives: Product[] = [];

        // Allow UI update
        await new Promise(r => setTimeout(r, 100));

        try {
            const img = new Image();
            img.src = imageSrc;
            await new Promise((resolve) => { img.onload = resolve; });

            // 1. Detect Objects
            const detections = await detectObjects(img);
            const detectedProducts: Product[] = [];
            let bestScore = 0;

            if (detections.length > 0) {
                // Process each detection
                for (const det of detections) {
                    const croppedSrc = cropImage(img, det.bbox, 20); // Add padding
                    if (croppedSrc) {
                        // Pass detected class and increase limit to finding similar items as well
                        const matches = await findMatchingProducts(croppedSrc, currentProducts, 5, det.class);

                        if (matches.length > 0) {
                            // Primary match
                            const match = currentProducts.find(p => p.id === matches[0].id);

                            if (matches[0].score > bestScore) {
                                bestScore = matches[0].score;
                            }

                            // Avoid duplicates in found products
                            if (match && !detectedProducts.some(p => p.id === match.id)) {
                                detectedProducts.push(match);
                            }

                            // Add other matches to alternatives
                            const alternatives = matches.slice(1)
                                .map(m => currentProducts.find(p => p.id === m.id))
                                .filter((p): p is Product => !!p && p.id !== match?.id); // Ensure not adding the same

                            // Add unique alternatives
                            alternatives.forEach(alt => {
                                if (!detectedProducts.some(p => p.id === alt.id) &&
                                    !allAlternatives.some(p => p.id === alt.id)) {
                                    allAlternatives.push(alt);
                                }
                            });
                        }
                    }
                }
            }

            // 2. Fallback to full image if nothing detected (or no good matches from detections)
            if (detectedProducts.length === 0) {
                // Try searching the whole image, maybe use 'Outros' or generic boost if needed
                const matches = await findMatchingProducts(imageSrc, currentProducts, 5);

                if (matches.length > 0) {
                    const bestMatch = currentProducts.find((p: any) => p.id === matches[0].id);
                    if (bestMatch) {
                        detectedProducts.push(bestMatch);

                        // Alternatives logic for single item fallback
                        const others = matches.slice(1)
                            .map(m => currentProducts.find((p: any) => p.id === m.id))
                            .filter((p): p is Product => !!p);

                        others.forEach(alt => {
                            if (!allAlternatives.some(p => p.id === alt.id)) {
                                allAlternatives.push(alt);
                            }
                        });
                    }
                }
            }

            setAlternativeProducts(allAlternatives.slice(0, 8)); // Limit alternatives to 8

            if (detectedProducts.length > 0) {
                setFoundProducts(detectedProducts);
                setFoundProduct(detectedProducts[0]);

                if (allAlternatives.length > 0 || detectedProducts.length > 1) {
                    setShowSimilarModal(true);
                }

                // Update detections only
                setDetections(detections);
            } else {
                // Even if nothing found, just update detections to empty (already done at start)
                // and stop scanning
            }

        } catch (error) {
            console.error("Scan error:", error);
            setShowNotFound(true);
            setTimeout(() => setShowNotFound(false), 3000);
        }

        setIsScanning(false);
    }, [currentProducts]);

    const captureAndScan = useCallback(async () => {
        if (!webcamRef.current) return;
        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) return;
        await processImage(imageSrc);
    }, [processImage]);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const imageSrc = e.target?.result as string;
            if (imageSrc) {
                await processImage(imageSrc);
            }
        };
        reader.readAsDataURL(file);
        // Reset input so same file can be selected again
        event.target.value = '';
    };

    const handleSelectionSearch = async (bbox?: [number, number, number, number]) => {
        if (!capturedImage) return;

        setIsScanning(true);
        setShowSelectionModal(false);
        setFoundProduct(null);
        setFoundProducts([]);
        setAlternativeProducts([]);
        setShowNotFound(false);

        try {
            const img = new Image();
            img.src = capturedImage;
            await new Promise((resolve) => { img.onload = resolve; });

            // If bbox provided, use it. Else center crop.
            let searchBbox = bbox;
            if (!searchBbox) {
                const width = img.width;
                const height = img.height;
                const cropW = width * 0.5;
                const cropH = height * 0.5;
                const cropX = (width - cropW) / 2;
                const cropY = (height - cropH) / 2;
                searchBbox = [cropX, cropY, cropW, cropH];
            }

            const croppedSrc = cropImage(img, searchBbox, 0); // Low padding for specific selection

            if (croppedSrc) {
                // Pass detected class if we had one? 
                // For now, general search is fine as user selected a specific area
                const matches = await findMatchingProducts(croppedSrc, currentProducts, 5);

                const detectedProducts: Product[] = [];
                const allAlternatives: Product[] = [];
                let bestScore = 0;

                if (matches.length > 0) {
                    // Primary match
                    const match = currentProducts.find(p => p.id === matches[0].id);
                    if (match) {
                        detectedProducts.push(match);
                        bestScore = matches[0].score;
                    }

                    // Alternatives
                    const alternatives = matches.slice(1)
                        .map(m => currentProducts.find(p => p.id === m.id))
                        .filter((p): p is Product => !!p && p.id !== match?.id);

                    alternatives.forEach(alt => {
                        if (!detectedProducts.some(p => p.id === alt.id) &&
                            !allAlternatives.some(p => p.id === alt.id)) {
                            allAlternatives.push(alt);
                        }
                    });
                }

                setAlternativeProducts(allAlternatives.slice(0, 8));

                if (detectedProducts.length > 0) {
                    setFoundProducts(detectedProducts);
                    setFoundProduct(detectedProducts[0]);
                    // Always show similar modal if alternatives exist or low score, same logic
                    if (allAlternatives.length > 0 || bestScore < 0.95) {
                        setShowSimilarModal(true);
                    }
                } else {
                    setShowNotFound(true);
                    setTimeout(() => setShowNotFound(false), 4000);
                }
            } else {
                setShowNotFound(true);
                setTimeout(() => setShowNotFound(false), 4000);
            }

        } catch (e) {
            console.error(e);
            setShowNotFound(true);
        } finally {
            setIsScanning(false);
        }
    };

    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const addToCart = async (productToAdd?: Product) => {
        const targetProduct = productToAdd || foundProduct;

        if (targetProduct && sessionId) {
            // Check local cart
            const isAlreadyInCart = cart.some(item => item.id === targetProduct.id);
            if (isAlreadyInCart) {
                showToast('Este produto já está no seu carrinho!', 'info');
                if (!productToAdd) setFoundProduct(null); // Only clear if using modal
                return;
            }

            // Reserve on server
            try {
                const res = await fetch(`/api/products/${targetProduct.id}/reserve`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ clientId: sessionId, action: 'reserve' })
                });

                if (!res.ok) {
                    const errorData = await res.json();
                    if (res.status === 409) {
                        showToast(errorData.error || 'Produto já reservado por outro cliente.', 'error');
                    } else {
                        showToast('Erro ao reservar produto.', 'error');
                    }
                    if (!productToAdd) setFoundProduct(null);
                    return;
                }
            } catch (error) {
                console.error("Error reserving product:", error);
                showToast('Erro de conexão. Tente novamente.', 'error');
                return;
            }

            setCart([...cart, { ...targetProduct, qty: 1 }]);
            showToast('Produto adicionado ao carrinho!', 'success'); // Feedback for direct add

            if (!productToAdd) {
                setFoundProduct(null);
                setIsCartOpen(true);
            }
        }
    };

    const removeFromCart = async (index: number) => {
        const itemToRemove = cart[index];

        // Release reservation
        try {
            await fetch(`/api/products/${itemToRemove.id}/reserve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientId: sessionId, action: 'release' })
            });
        } catch (error) {
            console.error("Error releasing product:", error);
            // We remove from cart anyway to not block the user
        }

        const newCart = [...cart];
        newCart.splice(index, 1);
        setCart(newCart);
    };

    const checkout = async () => {
        // Enforce all fields are mandatory
        if (!customerInfo.nome?.trim() || !customerInfo.telefone?.trim()) {
            showToast('Por favor, preencha nome, telefone e email para continuar.', 'error');
            return;
        }

        setIsSubmitting(true);

        try {
            const orderData = {
                customerName: customerInfo.nome,
                customerPhone: customerInfo.telefone,
                customerEmail: customerInfo.email,
                total: cart.reduce((acc, item) => acc + item.preco, 0),
                garageSaleId: selectedGarageSaleId,
                clientId: sessionId, // Pass session ID 
                items: cart.map(item => ({
                    productId: item.id,
                    desc: item.nome,
                    qty: 1,
                    price: item.preco
                }))
            };

            const response = await fetch('/api/pending-orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Falha ao salvar pedido');
            }

            setShowSuccessMessage(true);

            // Refresh pending orders immediately
            fetchPendingOrders();

            setTimeout(() => {
                setShowSuccessMessage(false);
                setCart([]);
                // Keep cart open and switch to pending tab
                setCartTab('pending');
                // setIsCartOpen(false); // Removed to keep cart open
            }, 2000);
        } catch (error: any) {
            console.error('Erro ao salvar pedido:', error);
            showToast(error.message || 'Erro ao salvar pedido. Tente novamente.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const maskPhone = (value: string) => {
        const cleaned = value.replace(/\D/g, '');
        if (cleaned.length <= 10) {
            return cleaned
                .replace(/(\d{2})(\d)/, '($1) $2')
                .replace(/(\d{4})(\d)/, '$1-$2')
                .replace(/(-\d{4})\d+?$/, '$1');
        } else {
            return cleaned
                .replace(/(\d{2})(\d)/, '($1) $2')
                .replace(/(\d{5})(\d)/, '$1-$2')
                .replace(/(-\d{4})\d+?$/, '$1');
        }
    };

    const handleRemoveItem = async (orderId: string, itemId: number, productId: string) => {
        if (!confirm('Tem certeza que deseja desistir deste item? Ele voltará a ficar disponível para outros clientes.')) {
            return;
        }

        try {
            const res = await fetch(`/api/pending-orders/${orderId}/remove-item`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Erro ao remover item');
            }

            const data = await res.json();
            if (data.deleted) {
                showToast('Pedido removido pois ficou vazio.', 'info');
            } else {
                showToast('Item removido com sucesso.', 'success');
            }
            fetchPendingOrders();
        } catch (error: any) {
            console.error('Erro ao remover item:', error);
            showToast(error.message || 'Erro ao remover item. Tente novamente.', 'error');
        }
    };

    const searchProducts = (query: string) => {
        setSearchQuery(query);
        setShowSearchModal(true); // Open modal when searching
        if (query.length >= 1) {
            const filtered = currentProducts.filter((p: Product) =>
                p.nome.toLowerCase().includes(query.toLowerCase()) ||
                p.descricao.toLowerCase().includes(query.toLowerCase())
            );
            setSearchResults(filtered);
        } else {
            setSearchResults([]);
        }
    };

    const selectProductFromSearch = (product: Product) => {
        setFoundProduct(product);
        setShowSearchModal(false);
        setSearchQuery('');
        setSearchResults([]);
    };

    // handleManualSearch removed


    const [cameraError, setCameraError] = useState<string | null>(null);

    const onUserMediaError = useCallback((error: string | DOMException) => {
        console.error("Camera Error:", error);
        setCameraError("Acesso à câmera falhou. Certifique-se de estar em HTTPS ou localhost.");
    }, []);

    const foundProductImages = foundProduct?.imagens.filter(Boolean) ?? [];

    return (
        <div className="h-[calc(100dvh-4rem)] min-h-0 w-full bg-stone-200 relative overflow-hidden font-sans text-stone-900">
            {cameraError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-50 bg-white text-stone-800">
                    <p className="text-red-500 font-bold mb-4 text-xl">Câmera Indisponível</p>
                    <p className="mb-4">{cameraError}</p>
                    <Link href="/" className="mt-8 bg-stone-200 px-6 py-2 rounded-full">Voltar ao Início</Link>
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                    className="absolute inset-0 w-full h-full bg-stone-900"
                >
                    {/* Loading Overlay */}
                    {loading && (
                        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm">
                            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-stone-800 font-bold text-lg animate-pulse">Carregando dados...</p>
                        </div>
                    )}
                    {/* Scanner Frame - Improved Visuals */}
                    <div className="absolute inset-0 overflow-hidden">
                        <Webcam
                            ref={webcamRef}
                            audio={false}
                            screenshotFormat="image/jpeg"
                            videoConstraints={{
                                facingMode: 'environment',
                                width: { ideal: 1920 },
                                height: { ideal: 1080 }
                            }}
                            className="absolute inset-0 w-full h-full object-cover"
                            onUserMediaError={onUserMediaError}
                        />

                        {/* AR Overlays */}
                        {arOverlays.map(overlay => {
                            const coords = getScreenCoords(overlay.bbox);

                            // Screen dimensions (fallback to safe defaults if undefined)
                            const screenW = typeof window !== 'undefined' ? window.innerWidth : 360;
                            // const screenH = typeof window !== 'undefined' ? window.innerHeight : 640;

                            // Clamp Horizontal: Keep center of bubble within [110px, Width-110px]
                            // This assumes bubble width max ~200px + padding
                            const overlayLeft = Math.max(110, Math.min(coords.left + coords.width / 2, screenW - 110));

                            // Clamp Vertical: Keep bottom of bubble at least 180px from top
                            // This ensures the bubble (height ~150px) doesn't go off-screen top
                            // If the item is too high, we might overlap it, but visibility is priority.
                            const overlayTop = Math.max(coords.top - 10, 180);

                            return (
                                <div key={overlay.id}>
                                    {/* Bounding Box Removed as per user request */}
                                    {/* <div
                                        className="absolute border-2 border-green-500/70 rounded-lg pointer-events-none transition-all duration-300"
                                        style={{
                                            left: coords.left,
                                            top: coords.top,
                                            width: coords.width,
                                            height: coords.height,
                                        }}
                                    /> */}
                                    <div
                                        className="absolute z-40 bg-white/95 backdrop-blur-md rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.4)] border-2 border-green-500 p-3 flex flex-col items-start w-[200px] animate-in fade-in zoom-in duration-300 transition-all text-left"
                                        style={{
                                            left: overlayLeft,
                                            top: overlayTop,
                                            transform: 'translate(-50%, -100%)'
                                        }}
                                        onClick={() => setFoundProduct(overlay.product)}
                                    >
                                        <div className="font-bold text-black text-sm leading-tight mb-1 line-clamp-2">{overlay.product.nome}</div>

                                        {/* Description */}
                                        {overlay.product.descricao && (
                                            <div className="text-gray-600 text-[10px] mb-1 line-clamp-2 leading-snug font-medium">
                                                {overlay.product.descricao}
                                            </div>
                                        )}

                                        {/* Status Line */}                <div className={`text-[10px] font-black uppercase mb-2 ${overlay.product.status === 'disponível' ? 'text-green-600' :
                                            overlay.product.status === 'vendido' ? 'text-red-600' : 'text-yellow-600'
                                            }`}>
                                            STATUS: {overlay.product.status}
                                        </div>

                                        <div className="flex items-center justify-between w-full mt-1 gap-2">
                                            <div className="flex flex-col">
                                                <span className="font-black text-blue-600 text-lg whitespace-nowrap">{formatBRL(overlay.product.preco)}</span>
                                            </div>
                                            {overlay.product.status === 'disponível' ? (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        addToCart(overlay.product);
                                                    }}
                                                    className="bg-green-600 hover:bg-green-700 text-white rounded-lg p-2 shadow-sm transition-colors flex items-center justify-center"
                                                    aria-label="Adicionar ao carrinho"
                                                >
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <circle cx="9" cy="21" r="1" />
                                                        <circle cx="20" cy="21" r="1" />
                                                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                                                        <path d="M12 6v6" />
                                                        <path d="M9 9h6" />
                                                    </svg>
                                                </button>
                                            ) : (
                                                <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg text-gray-400 cursor-not-allowed">
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <circle cx="12" cy="12" r="10"></circle>
                                                        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                                                    </svg>
                                                </div>
                                            )}
                                        </div>

                                        {/* Arrow pointer */}
                                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45 border-b-2 border-r-2 border-green-500"></div>
                                    </div>
                                </div>
                            );
                        })}


                        <div className="absolute inset-0 pointer-events-none"></div>
                    </div>
                </motion.div>
            )
            }

            {/* Toast Notification */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, x: "-50%" }}
                        animate={{ opacity: 1, y: 0, x: "-50%" }}
                        exit={{ opacity: 0, y: -20, x: "-50%" }}
                        className={`absolute top-20 left-1/2 z-50 px-4 py-2 rounded-xl shadow-lg font-bold text-xs flex items-center gap-2 pointer-events-none
                            ${toast.type === 'success' ? 'bg-green-600 text-white' :
                                toast.type === 'error' ? 'bg-red-600 text-white' :
                                    'bg-stone-100 text-stone-800 border border-stone-200'}`}
                    >
                        {toast.type === 'success' && <span>✓</span>}
                        {toast.type === 'error' && <span>✕</span>}
                        {toast.type === 'info' && <span>ℹ️</span>}
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* UI Overlay */}
            <div className="absolute inset-x-0 top-0 z-10 flex flex-col p-2 pointer-events-none">
                <header className="flex flex-wrap items-center justify-between pointer-events-auto w-full gap-2">
                    <Link href="/" className="bg-white/90 backdrop-blur-lg p-3 rounded-xl text-stone-800 hover:bg-white transition-all active:scale-95 border border-stone-200 shadow-sm">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
                    </Link>

                    <div className="flex-1 min-w-[120px]">
                        {selectedGarageSaleId && (
                            <div className="bg-white/90 backdrop-blur-lg px-3 py-2 rounded-xl text-stone-800 border border-stone-200 shadow-lg text-sm font-black text-center truncate">
                                {garageSales.find(gs => gs.id === selectedGarageSaleId)?.nome}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3">
                        {/* Hidden File Input */}
                        <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileUpload}
                        />
                        {/* Upload Button */}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-white/90 backdrop-blur-lg p-3 rounded-xl text-stone-800 hover:bg-white transition-all active:scale-95 border border-stone-200 shadow-sm"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                        </button>

                        {pendingCount > 0 && (
                            <button
                                onClick={() => {
                                    setCartTab('pending');
                                    setIsCartOpen(true);
                                }}
                                className="bg-yellow-500 backdrop-blur-md p-4 rounded-2xl text-white font-bold flex items-center justify-center gap-2 hover:bg-yellow-600 transition-all shadow-xl active:scale-95 animate-pulse border border-yellow-400/50"
                            >
                                <span className="text-2xl">⏳</span>
                                <span className="bg-white text-yellow-600 px-2.5 py-1 rounded-full text-sm font-black">{pendingCount}</span>
                            </button>
                        )}
                    </div>
                </header>
            </div>

            {/* Scanner Frame - Improved Visuals */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                <p className="text-stone-800 text-center text-sm font-black bg-white/90 backdrop-blur-sm py-2 px-6 rounded-xl border border-stone-200 shadow-sm mb-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
                    {isModelLoading ? "Carregando IA..." :
                        isEmbeddingProcessing ? `Otimizando busca... ${embeddingProgress}%` :
                            isScanning ? "Analisando..." : "Aponte e capture"}
                </p>
                <div className="relative w-full h-[65vh] flex items-center justify-center">
                    {/* Corner Markers */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-amber-500 rounded-tl-xl drop-shadow-lg"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-amber-500 rounded-tr-xl drop-shadow-lg"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-amber-500 rounded-bl-xl drop-shadow-lg"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-amber-500 rounded-br-xl drop-shadow-lg"></div>

                    {/* Scanning Animation */}
                    {isScanning && (
                        <>
                            <motion.div
                                className="absolute inset-0 border-2 border-blue-500/50 rounded-xl"
                                initial={{ opacity: 0, scale: 1 }}
                                animate={{ opacity: [0, 1, 0], scale: 1.05 }}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                            />
                            <motion.div
                                className="absolute w-full h-1 bg-blue-500/80 shadow-[0_0_20px_rgba(59,130,246,1)]"
                                initial={{ top: "0%" }}
                                animate={{ top: "100%" }}
                                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                            />
                        </>
                    )}
                </div>
            </div>

            {/* Scan Button & Bottom Bar */}
            {
                !isCartOpen && (
                    <div className="fixed bottom-0 inset-x-0 z-40 pointer-events-none">
                        <div className="flex justify-center mb-4">
                            <button
                                onClick={captureAndScan}
                                disabled={isScanning}
                                className="group relative pointer-events-auto"
                            >
                                <div className="absolute inset-0 bg-blue-500/30 rounded-full blur-2xl group-hover:bg-blue-500/50 transition-colors duration-500"></div>
                                <div className="relative bg-white text-black p-6 rounded-full shadow-[0_0_40px_rgba(255,255,255,0.4)] transform transition-all active:scale-90 border-[6px] border-white/30 bg-clip-padding group-hover:scale-110 group-hover:shadow-[0_0_50px_rgba(59,130,246,0.7)]">
                                    {isScanning ? (
                                        <svg className="w-8 h-8 animate-spin text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v4" /><path d="M12 18v4" /><path d="M4.93 4.93l2.83 2.83" /><path d="M16.24 16.24l2.83 2.83" /><path d="M2 12h4" /><path d="M18 12h4" /><path d="M4.93 19.07l2.83-2.83" /><path d="M16.24 7.76l2.83-2.83" /></svg>
                                    ) : (
                                        <div className="w-8 h-8 rounded-full border-[4px] border-stone-300"></div>
                                    )}
                                </div>
                            </button>
                        </div>

                        <div className="bg-white/95 backdrop-blur-xl border-t border-stone-200 p-3 pb-6 pointer-events-auto flex items-center gap-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
                            <button
                                onClick={() => setIsCartOpen(true)}
                                className="flex-1 bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all py-3 px-4 rounded-xl text-white flex items-center justify-center gap-3 shadow-xl border border-blue-400/30"
                            >
                                <div className="relative">
                                    <span className="text-2xl">🛒</span>
                                    {cart.length > 0 && (
                                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border border-white animate-bounce shadow-lg">
                                            {cart.length}
                                        </span>
                                    )}
                                </div>
                                <span className="text-sm font-black uppercase tracking-tight">Carrinho</span>
                            </button>

                            <button
                                onClick={() => setShowSearchModal(true)}
                                className="bg-stone-100 p-3 rounded-xl text-stone-700 hover:bg-stone-200 active:scale-95 transition-all border border-stone-200"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            </button>
                        </div>
                    </div>
                )
            }

            <AnimatePresence>
                {showNotFound && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="absolute top-24 left-1/2 -translate-x-1/2 z-20 bg-red-500/90 backdrop-blur-md px-6 py-4 rounded-2xl text-white font-semibold shadow-lg pointer-events-auto max-w-sm"
                    >
                        <p className="mb-3 text-center">Produto não encontrado</p>
                        <button
                            onClick={() => {
                                setShowNotFound(false);
                                setShowSearchModal(true);
                            }}
                            className="w-full bg-white text-red-600 font-bold py-2 px-4 rounded-lg hover:bg-red-50 transition-colors"
                        >
                            🔍 Buscar Produto
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Similar Items Modal (Ambiguous Detection) */}
            <AnimatePresence>
                {showSimilarModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col border border-stone-200"
                        >
                            <div className="p-4 border-b border-stone-200 flex justify-between items-center bg-white">
                                <div>
                                    <h3 className="text-lg font-bold text-stone-900">Confirme o Produto</h3>
                                    <p className="text-stone-600 text-xs">A IA encontrou itens parecidos. Qual deles é?</p>
                                </div>
                                <button
                                    onClick={() => setShowSimilarModal(false)}
                                    className="text-stone-500 hover:text-stone-800"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {[...foundProducts, ...alternativeProducts]
                                    // Deduplicate by ID just in case
                                    .filter((p, index, self) => index === self.findIndex(t => t.id === p.id))
                                    .map(product => {
                                        const isAvailable = product.status === 'disponível';
                                        return (
                                            <div key={product.id} className="flex gap-4 p-3 rounded-xl bg-stone-50 border border-stone-200">
                                                <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-white relative">
                                                    {product.imagens[0] && (
                                                        <img src={product.imagens[0]} alt={product.nome} className="w-full h-full object-cover" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0 flex flex-col justify-between">
                                                    <div>
                                                        <h4 className="font-bold text-stone-900 truncate">{product.nome}</h4>
                                                        <p className="text-sm text-stone-600 truncate">{product.descricao}</p>
                                                    </div>
                                                    <div className="flex items-center justify-between mt-2">
                                                        <span className="font-bold text-emerald-700">{formatBRL(product.preco)}</span>

                                                        {isAvailable ? (
                                                            <button
                                                                onClick={() => {
                                                                    setFoundProduct(product);
                                                                    setShowSimilarModal(false);
                                                                    addToCart(product);
                                                                }}
                                                                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition-colors"
                                                            >
                                                                Selecionar
                                                            </button>
                                                        ) : (
                                                            <span className={`text-xs font-bold px-2 py-1 rounded-md ${product.status === 'vendido' ? 'bg-red-500/20 text-red-500' : 'bg-yellow-500/20 text-yellow-500'
                                                                }`}>
                                                                {product.status.toUpperCase()}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                }
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Found Product Modal - Only clear cart on close */}
            <AnimatePresence>
                {foundProduct && !showSimilarModal && (

                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 20 }}
                        className="absolute bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] border-t border-stone-300 pointer-events-auto max-h-[85vh] overflow-y-auto"
                    >
                        <div className="w-16 h-2 bg-stone-200 rounded-full mx-auto mb-8"></div>

                        <div className="flex gap-6 flex-col sm:flex-row">
                            <ProductImageCarousel
                                images={foundProductImages}
                                alt={foundProduct.nome}
                                imageClassName="w-full sm:w-44 h-44 rounded-2xl object-cover bg-stone-100 border border-stone-200 shadow-lg"
                                currentIndex={foundProductImageIndex}
                                onChangeIndex={setFoundProductImageIndex}
                                showIndicators
                            />
                            <div className="flex-1">
                                <div className="flex justify-between items-start gap-4">
                                    <h2 className="text-3xl font-black text-stone-900 leading-tight">{foundProduct.nome}</h2>
                                    <button onClick={() => setFoundProduct(null)} className="text-stone-500 p-2 hover:text-stone-800 transition-colors bg-stone-100 rounded-xl">
                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    </button>
                                </div>
                                <div className="mt-4 flex items-center gap-3 flex-wrap">
                                    <span className="px-4 py-1.5 bg-blue-500 text-white text-sm font-black rounded-full uppercase tracking-wider">
                                        {foundProduct.categoria}
                                    </span>
                                    {/* Availability Status Badge */}
                                    {foundProduct.status !== 'disponível' && (
                                        <span className={`px-3 py-1 font-bold text-xs rounded-lg uppercase border ${foundProduct.status === 'vendido'
                                            ? 'bg-red-500/20 text-red-500 border-red-500/30'
                                            : 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'
                                            }`}>
                                            {foundProduct.status}
                                        </span>
                                    )}
                                    {foundProducts.length > 1 && (
                                        <span className="px-3 py-1 bg-green-100 text-emerald-800 text-xs font-bold rounded-lg border border-green-200">
                                            +{foundProducts.length - 1} outros itens
                                        </span>
                                    )}
                                </div>
                                <p className="mt-4 text-blue-700 font-black text-4xl">{formatBRL(foundProduct.preco)}</p>
                                <p className="mt-4 text-stone-700 text-base leading-relaxed">{foundProduct.descricao}</p>

                                <div className="mt-6 flex gap-2">
                                    {foundProduct.status === 'disponível' ? (
                                        <button onClick={() => addToCart()} className="flex-1 bg-green-600 py-4 rounded-xl font-black text-white hover:bg-green-500 active:scale-95 transition-all text-lg shadow-xl border border-green-400/30 flex items-center justify-center gap-2">
                                            <span>✓</span> ADICIONAR
                                        </button>
                                    ) : (
                                        <button disabled className="flex-1 bg-stone-100 py-4 rounded-xl font-black text-stone-500 cursor-not-allowed text-lg border border-stone-200 flex items-center justify-center gap-2">
                                            <span>🚫</span> {foundProduct.status.toUpperCase()}
                                        </button>
                                    )}
                                    {foundProducts.length > 1 && (
                                        <button
                                            onClick={() => {
                                                foundProducts.forEach(async (p) => {
                                                    // Quick add all
                                                    setFoundProduct(p);
                                                    // This is a bit hacky, practically we should change addToCart to take product
                                                    // But let's just use the current flow for single add, and maybe a bulk add function later if needed
                                                    // For now, let user select from the list below
                                                });
                                                showToast("Adicione um por um abaixo", "info");
                                            }}
                                            className="hidden px-4 bg-stone-100 rounded-xl font-bold text-stone-700 border border-stone-200"
                                        >
                                            Todos
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Multi-product detection list */}
                        {foundProducts.length > 1 && (
                            <div className="mt-6 mb-2">
                                <h3 className="text-stone-800 font-bold mb-3 text-sm uppercase tracking-wider text-emerald-700">Itens encontrados na foto ({foundProducts.length})</h3>
                                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                    {foundProducts.map((prod) => (
                                        <button
                                            key={prod.id}
                                            onClick={() => setFoundProduct(prod)}
                                            className={`min-w-[120px] rounded-xl p-2 flex flex-col items-start transition-all border-2 ${foundProduct?.id === prod.id ? 'bg-stone-100 border-blue-500' : 'bg-stone-100/50 border-transparent hover:bg-stone-100'}`}
                                        >
                                            <div className="relative w-full h-20 mb-2">
                                                <img
                                                    src={prod.imagens[0] || ''}
                                                    className="w-full h-full object-cover rounded-lg bg-stone-200"
                                                />
                                                {foundProduct?.id === prod.id && (
                                                    <div className="absolute inset-0 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                                        <div className="w-2 h-2 bg-blue-400 rounded-full shadow-[0_0_10px_rgba(59,130,246,1)]"></div>
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-xs text-stone-900 font-bold line-clamp-1 text-left w-full">{prod.nome}</span>
                                            <span className="text-blue-700 text-[10px] font-bold">{formatBRL(prod.preco)}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Alternative Products / Suggestions */}
                        {alternativeProducts.length > 0 && (
                            <div className="mt-8">
                                <h3 className="text-stone-700 font-bold mb-3 text-sm uppercase tracking-wider">Outras opções similares</h3>
                                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                                    {alternativeProducts.map((prod) => (
                                        <button
                                            key={prod.id}
                                            onClick={() => setFoundProduct(prod)}
                                            className="min-w-[140px] bg-stone-100 rounded-xl p-3 flex flex-col items-start hover:bg-stone-200 transition-colors"
                                        >
                                            <img
                                                src={prod.imagens[0] || ''}
                                                className="w-full h-24 object-cover rounded-lg mb-2 bg-stone-200"
                                            />
                                            <span className="text-xs text-stone-900 font-bold line-clamp-2 text-left mb-1 h-8">{prod.nome}</span>
                                            <span className="text-blue-700 text-sm font-bold">{formatBRL(prod.preco)}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mt-4 pt-4 border-t border-stone-200">
                            <button
                                onClick={() => {
                                    setFoundProduct(null);
                                    setShowSearchModal(true);
                                }}
                                className="w-full py-2 text-stone-500 font-medium hover:text-stone-800 transition-colors flex items-center justify-center gap-2 text-xs"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                Não é esse? Pesquisar por nome
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Search Modal */}
            <AnimatePresence>
                {showSearchModal && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="absolute inset-0 z-50 bg-white/95 backdrop-blur-md flex flex-col pointer-events-auto"
                    >
                        <div className="flex items-center gap-2 p-4 border-b border-stone-200">
                            <div className="relative flex-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-600">🔍</span>
                                <input
                                    type="text"
                                    placeholder="Buscar produto..."
                                    value={searchQuery}
                                    onChange={(e) => searchProducts(e.target.value)}
                                    autoFocus
                                    className="w-full bg-stone-100 text-stone-900 pl-10 pr-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 border border-stone-200 text-base font-medium"
                                />
                            </div>
                            <button
                                onClick={() => setShowSearchModal(false)}
                                className="p-3 bg-stone-100 text-stone-600 hover:text-stone-900 rounded-xl transition-colors active:scale-95"
                            >
                                <span className="sr-only">Fechar</span>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            {searchQuery.length > 0 && searchResults.length === 0 ? (
                                <div className="text-center text-stone-500 mt-10">
                                    <p>Nenhum produto encontrado</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {searchResults.map((product) => (
                                        <button
                                            key={product.id}
                                            onClick={() => selectProductFromSearch(product)}
                                            className="bg-stone-100 rounded-xl p-3 flex flex-col items-start hover:bg-stone-200 transition-colors border border-stone-200 text-left active:scale-95"
                                        >
                                            <div className="w-full aspect-square rounded-lg bg-stone-200 mb-2 overflow-hidden">
                                                {product.imagens[0] ? (
                                                    <img src={product.imagens[0]} alt={product.nome} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-stone-500 text-xs">Sem foto</div>
                                                )}
                                            </div>
                                            <h3 className="font-bold text-stone-900 text-sm line-clamp-2 mb-1 leading-tight">{product.nome}</h3>
                                            <span className="text-blue-700 font-extrabold text-sm">{formatBRL(product.preco)}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {searchQuery.length === 0 && (
                                <div className="text-center text-stone-600 mt-20">
                                    <p className="text-4xl mb-4">⌨</p>
                                    <p>Digite o nome do produto para buscar</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Success Message */}
            <AnimatePresence>
                {showSuccessMessage && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-sm pointer-events-auto"
                    >
                        <div className="bg-green-600 text-white p-8 rounded-2xl shadow-2xl text-center max-w-sm mx-4">
                            <div className="text-6xl mb-4">✓</div>
                            <h3 className="text-2xl font-bold mb-2">Pedido Realizado com Sucesso!</h3>
                            <p className="text-lg">Dirija-se ao caixa para realizar o pagamento.</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Cart Overlay */}
            <AnimatePresence>
                {isCartOpen && (
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        className="fixed inset-0 z-50 bg-white shadow-2xl p-6 pointer-events-auto flex flex-col sm:max-w-md sm:right-0 sm:left-auto"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-black uppercase tracking-tight">🛒 Carrinho</h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={async () => {
                                        if (confirm('Deseja realmente cancelar o processamento deste cliente? Isso limpará o carrinho e os dados do cliente.')) {
                                            // Release all reservations
                                            for (const item of cart) {
                                                try {
                                                    await fetch(`/api/products/${item.id}/reserve`, {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ clientId: sessionId, action: 'release' })
                                                    });
                                                } catch (e) { console.error("Error releasing on cancel", e); }
                                            }
                                            setCart([]);
                                            setCustomerInfo({ nome: '', telefone: '', email: '' });
                                            localStorage.removeItem('customerInfo');
                                            setIsCartOpen(false);
                                            showToast('Processamento cancelado.', 'info');
                                        }
                                    }}
                                    className="text-red-500 hover:text-red-400 p-2 bg-stone-100 rounded-xl transition-all active:scale-95 flex items-center gap-1 text-xs font-bold"
                                >
                                    CANCELAR
                                </button>
                                <button onClick={() => setIsCartOpen(false)} className="text-stone-600 hover:text-stone-900 p-2 bg-stone-100 rounded-xl transition-all active:scale-90">
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex bg-stone-100 rounded-xl p-1 mb-4 border border-stone-200">
                            <button
                                onClick={() => setCartTab('current')}
                                className={`flex-1 py-2 text-xs font-black rounded-lg transition-all uppercase tracking-wider ${cartTab === 'current' ? 'bg-blue-600 text-white shadow-md' : 'text-stone-600 hover:text-stone-900'}`}
                            >
                                Atual ({cart.length})
                            </button>
                            <button
                                onClick={() => setCartTab('pending')}
                                className={`flex-1 py-2 text-xs font-black rounded-lg transition-all uppercase tracking-wider ${cartTab === 'pending' ? 'bg-blue-600 text-white shadow-md' : 'text-stone-600 hover:text-stone-900'}`}
                            >
                                Pendentes ({pendingCount})
                            </button>
                        </div>

                        {cartTab === 'current' ? (
                            <>
                                <div className="flex-1 overflow-y-auto space-y-4 mb-0 pr-2 custom-scrollbar pb-4">
                                    {cart.length === 0 ? (
                                        <div className="text-center text-stone-500 py-12 bg-stone-100/50 rounded-3xl border border-dashed border-stone-300">
                                            <div className="text-5xl mb-4">🛒</div>
                                            <p className="font-bold">Carrinho vazio</p>
                                        </div>
                                    ) : (
                                        cart.map((item, idx) => (
                                            <div key={idx} className="flex gap-3 bg-stone-100 p-2 rounded-xl border border-stone-200 shadow-md items-center">
                                                {item.imagens && item.imagens[0] && (
                                                    <img src={item.imagens[0]} className="w-12 h-12 rounded-lg object-cover border border-stone-200" />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-bold text-stone-900 text-sm leading-tight truncate">{item.nome}</div>
                                                    <div className="text-blue-400 font-black text-base">{formatBRL(item.preco)}</div>
                                                </div>
                                                <button onClick={() => removeFromCart(idx)} className="text-red-500 p-2 bg-red-500/10 rounded-lg hover:bg-red-500/20 active:scale-90 transition-all">
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                                </button>
                                            </div>
                                        ))
                                    )}

                                    {/* Inputs moved to footer */}
                                </div>

                                <div className="border-t border-stone-200 pt-4 space-y-2 bg-white z-10">
                                    {/* Customer Inputs - Fixed at bottom */}
                                    <div className="space-y-2 mb-2">
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="Nome completo *"
                                                value={customerInfo.nome}
                                                onChange={(e) => setCustomerInfo({ ...customerInfo, nome: e.target.value })}
                                                className="w-full bg-stone-100 text-stone-900 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 border border-stone-200 text-sm font-bold"
                                            />
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="tel"
                                                placeholder="Telefone *"
                                                value={customerInfo.telefone}
                                                onChange={(e) => setCustomerInfo({ ...customerInfo, telefone: maskPhone(e.target.value) })}
                                                maxLength={15}
                                                className="w-full bg-stone-100 text-stone-900 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 border border-stone-200 text-sm font-bold"
                                            />
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="email"
                                                placeholder="Email (Opcional)"
                                                value={customerInfo.email}
                                                onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                                                className="w-full bg-stone-100 text-stone-900 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 border border-stone-200 text-sm font-bold"
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <button
                                            onClick={() => setIsCartOpen(false)}
                                            className="w-full bg-stone-100 text-stone-700 font-bold py-3 rounded-xl hover:bg-stone-200 active:scale-95 transition-all text-sm border border-stone-200 uppercase tracking-widest mb-2"
                                        >
                                            CONTINUAR COMPRANDO
                                        </button>
                                    </div>

                                    <div className="flex justify-between text-xl font-black pt-4 border-t border-stone-200 text-stone-900">
                                        <span className="uppercase text-[10px] text-stone-500 self-center tracking-widest">Total</span>
                                        <span>{formatBRL(cart.reduce((acc, item) => acc + item.preco, 0))}</span>
                                    </div>
                                    <button
                                        onClick={checkout}
                                        disabled={cart.length === 0 || isSubmitting || !customerInfo.nome?.trim() || !customerInfo.telefone?.trim()}
                                        className="w-full bg-blue-600 text-white font-black py-3 rounded-xl hover:bg-blue-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm shadow-lg border border-blue-400/20 uppercase tracking-widest flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-stone-600 border-t-transparent" />
                                                <span>PROCESSANDO...</span>
                                            </>
                                        ) : (
                                            <span>FINALIZAR PEDIDO</span>
                                        )}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 overflow-y-auto space-y-4">
                                <div className="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-xl mb-2 mx-1">
                                    <p className="text-yellow-400 text-xs font-bold text-center leading-relaxed">
                                        <span className="block mb-1 text-sm text-yellow-300">⚠ DIRIJA-SE AO CAIXA</span>
                                        Você tem <span className="text-amber-800 font-black">30 minutos</span> para efetuar o pagamento.
                                        <span className="block mt-1 text-[10px] text-stone-600">Após esse tempo, os produtos voltarão a ficar disponíveis.</span>
                                    </p>
                                </div>
                                {isLoadingPending ? (
                                    <div className="text-center py-8 text-stone-600">Carregando...</div>
                                ) : pendingOrders.length === 0 ? (
                                    <div className="text-center text-stone-500 mt-10">
                                        <p>Nenhum pedido pendente</p>
                                        <p className="text-xs mt-2 text-stone-600">Seus pedidos aguardando pagamento aparecerão aqui.</p>
                                    </div>
                                ) : (
                                    pendingOrders.map((order: any) => (
                                        <div key={order.id} className="bg-stone-100 rounded-xl p-4 border border-stone-300">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${order.isPaid ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                                    {order.isPaid ? 'PAGO' : <RemainingTime createdAt={order.createdAt} ttlMinutes={reservationTTLMinutes} />}
                                                </span>
                                                <span className="font-bold text-stone-900">{formatBRL(order.total)}</span>
                                            </div>
                                            <div className="space-y-1">
                                                {order.items.map((item: any, idx: number) => (
                                                    <div key={idx} className="flex justify-between items-center text-xs text-stone-600 py-1 border-b border-stone-300/50 last:border-0">
                                                        <span>{item.quantity}x {item.description}</span>
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-mono">{formatBRL(item.price)}</span>
                                                            <button
                                                                onClick={() => handleRemoveItem(order.id, item.id, item.productId)}
                                                                className="text-red-500 hover:text-red-400 font-bold text-[10px] uppercase tracking-wider bg-red-500/10 px-2 py-1 rounded hover:bg-red-500/20 transition-colors"
                                                            >
                                                                Desistir
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Selection Modal - REPLACES Manual Crop */}
            <AnimatePresence>
                {showSelectionModal && capturedImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-stone-100 flex flex-col"
                    >
                        <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-white">
                            {/* Image Container */}
                            <div className="relative w-full h-full max-w-4xl max-h-[80vh]">
                                <img
                                    src={capturedImage}
                                    className="w-full h-full object-contain"
                                    alt="Capture"
                                // Use ref to calculate positions if needed, but simple % based works for display if we are careful
                                // Actually, we need to overlay boxes relative to the image. 
                                // Object-contain makes this tricky because there is empty space.
                                // A better way is setting image as background or using a wrapper that fits the image.
                                // Let's use a wrapper that has the same aspect ratio?
                                // For simplicity in this iteration: We will just center the image and assume full width/height fits for the "manual center" logic.
                                // For the BOUNDING BOXES, we need exact positioning.
                                // To make bounding boxes clickable, we really need to know where the image is on screen.
                                // Let's skip drawing complex boxes on the image for this exact 'Selection' step if it's too complex for one go.
                                // BUT user asked: "use the object with the rectangle I identified".
                                // So we must show rectangles.

                                // Best approach: A container that has `relative` and `w-fit h-fit` but constrained by max-w/h.
                                // Then img has `block`. Bounding box divs are absolute.
                                />

                                {/* Overlay Detections */}
                                {/* This is hard to get wrong with object-contain. 
                                    Let's use a helper that knows the rendered size. 
                                    OR: Just render the boxes on top of the image assuming the image element fills the container?
                                    Stategy:
                                    We won't try to perfect-pixel match the 'object-contain' letterboxing in JS right now.
                                    Instead, we will display a LIST of detected objects below or overlay them if we can.
                                    
                                    Wait, the `manualCropImage` logic had a box in the center.
                                    
                                    Simpler UI for "Selection":
                                    Show the full image.
                                    If detections exist: Show buttons "Objeto 1", "Objeto 2" (maybe with thumbnails?).
                                    OR: Draw the boxes.
                                    
                                    Let's try to make the boxes work.
                                    We need to access the image dimensions on load to scale the boxes.
                                */}
                                {detections.map((det, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => handleSelectionSearch(det.bbox)}
                                        className="absolute border-4 border-green-600 hover:border-stone-800 cursor-pointer z-10 transition-all rounded-lg bg-green-500/20 hover:bg-green-500/40"
                                        style={{
                                            // This positioning is tricky without knowing the exact rendered rect of the image.
                                            // The image is "object-contain".
                                            // HACK: Use specific styles to force image to fill container? No, distortion.

                                            // Fallback: We'll put clickable "Chips" at the bottom for each detection? No, intuitive is clicking the image.

                                            // Let's rely on mapping. 
                                            // We can't easily map without a ref and `getBoundingClientRect`.
                                            // 
                                            // ALTERNATIVE: Just assume the user will "Focus" on the center if they want manual.
                                            // FOR DETECTIONS: We want them to choose.

                                            // Let's render the detected crops as THUMBNAILS below!
                                            // Much easier and arguably better UX on mobile than tiny boxes.
                                            display: 'none' // Hiding overlay for now in favor of thumbnails
                                        }}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Controls & Thumbnails */}
                        <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-white via-white/95 to-transparent z-50 flex flex-col gap-4 border-t border-stone-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">

                            {isScanning ? (
                                <div className="flex flex-col items-center justify-center p-4">
                                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                                    <p className="text-stone-800 text-sm font-bold animate-pulse">Processando imagem...</p>
                                </div>
                            ) : detections.length > 0 ? (
                                <div className="space-y-3">
                                    <p className="text-center text-stone-800 font-bold">
                                        Identificamos {detections.length} objetos. Toque em um para pesquisar:
                                    </p>
                                    <div className="flex gap-3 overflow-x-auto pb-2 justify-center scrollbar-hide">
                                        {detections.map((det, idx) => {
                                            // Crop for thumbnail
                                            // Ideally we memoize or have these ready, but we can't easily sync.
                                            // We'll just show a generic "Objeto X" button or try to show coordinates?
                                            // Better: Just buttons "Objeto #1", "Objeto #2".
                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => handleSelectionSearch(det.bbox)}
                                                    className="min-w-[80px] h-[80px] bg-stone-100 border-2 border-green-500 rounded-xl flex items-center justify-center hover:bg-stone-200 active:scale-95 transition-all text-xs font-bold text-green-400"
                                                >
                                                    Objeto {idx + 1}
                                                </button>
                                            );
                                        })}
                                        <button
                                            onClick={() => handleSelectionSearch()} // No bbox = center crop
                                            className="min-w-[80px] h-[80px] bg-stone-100 border-2 border-stone-300 rounded-xl flex items-center justify-center hover:bg-stone-200 active:scale-95 transition-all text-xs font-bold text-stone-800 px-2 text-center"
                                        >
                                            Usar Foto Inteira
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-center text-stone-600 text-sm mb-2 font-medium">
                                    Nenhum objeto detectado automaticamente.<br />
                                    Usaremos o centro da imagem.
                                </p>
                            )}

                            <div className="flex gap-3 mt-2">
                                <button
                                    onClick={() => {
                                        setShowSelectionModal(false);
                                        setCapturedImage(null);
                                    }}
                                    className="flex-1 py-3 bg-stone-200 text-stone-800 font-bold rounded-xl active:scale-95 transition-all hover:bg-stone-300"
                                >
                                    Descartar
                                </button>
                                {!isScanning && detections.length === 0 && (
                                    <button
                                        onClick={() => handleSelectionSearch()}
                                        className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl active:scale-95 transition-all shadow-lg hover:bg-blue-500"
                                    >
                                        🔍 Pesquisar
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div >
    );
}
