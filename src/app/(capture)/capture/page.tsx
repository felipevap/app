"use client";

import { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { useProducts, type Product } from '@/contexts/ProductContext';
import { findMatchingProduct } from '@/utils/imageMatching';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function CapturePage() {
    const webcamRef = useRef<Webcam>(null);
    // Cast context to any to avoid strict type issues if context definition slightly mismatches
    const { products, currentGarageSale } = useProducts() as any;
    const [isScanning, setIsScanning] = useState(false);
    const [foundProduct, setFoundProduct] = useState<Product | null>(null);
    const [showNotFound, setShowNotFound] = useState(false);
    const [cart, setCart] = useState<any[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const router = useRouter();

    const currentProducts = currentGarageSale
        ? products.filter((p: any) => p.garageSaleId === currentGarageSale.id)
        : products; // Fallback to all products if no GS selected

    const formatBRL = (value: number): string => {
        return value.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const captureAndScan = useCallback(async () => {
        if (!webcamRef.current) return;

        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) return;

        setIsScanning(true);
        setFoundProduct(null);
        setShowNotFound(false);

        // Simulate scanning delay
        await new Promise(r => setTimeout(r, 600));

        const matchId = await findMatchingProduct(imageSrc, currentProducts);

        if (matchId) {
            const product = currentProducts.find((p: any) => p.id === matchId);
            if (product) setFoundProduct(product);
        } else {
            setShowNotFound(true);
            setTimeout(() => setShowNotFound(false), 3000);
        }

        setIsScanning(false);
    }, [currentProducts]);

    const addToCart = () => {
        if (foundProduct) {
            setCart([...cart, { ...foundProduct, qty: 1 }]);
            setFoundProduct(null);
            setIsCartOpen(true);
        }
    };

    const removeFromCart = (index: number) => {
        const newCart = [...cart];
        newCart.splice(index, 1);
        setCart(newCart);
    };

    const checkout = () => {
        // Save cart to pending state for POS
        // We transpose the cart items to match the expected POS item format: { desc, qty, price }
        const posItems = cart.map(item => ({
            desc: item.name,
            qty: 1,
            price: item.price
        }));

        localStorage.setItem('pending_cart', JSON.stringify(posItems));
        router.push('/pos?import=true');
    };

    const [cameraError, setCameraError] = useState<string | null>(null);

    const onUserMediaError = useCallback((error: string | DOMException) => {
        console.error("Camera Error:", error);
        setCameraError("Camera access failed. Ensure you are on HTTPS or localhost.");
    }, []);

    return (
        <div className="h-screen w-full bg-black relative overflow-hidden font-sans text-white">
            {cameraError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center z-50 bg-neutral-900">
                    <p className="text-red-500 font-bold mb-4 text-xl">Camera Unavailable</p>
                    <p className="mb-4">{cameraError}</p>
                    <Link href="/" className="mt-8 bg-neutral-700 px-6 py-2 rounded-full">Back Home</Link>
                </div>
            ) : (
                <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{ facingMode: "environment" }}
                    className="absolute inset-0 w-full h-full object-cover"
                    onUserMediaError={onUserMediaError}
                />
            )}

            {/* UI Overlay */}
            <div className="absolute inset-0 z-10 flex flex-col justify-between p-6 pb-24 pointer-events-none">
                <header className="flex justify-between items-start pointer-events-auto">
                    <Link href="/" className="bg-black/40 backdrop-blur-md p-3 rounded-full text-white hover:bg-black/60 transition-colors">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
                    </Link>
                    <div className="flex gap-2">
                        <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full text-white text-sm font-medium">
                            {currentProducts.length} Products Loaded
                        </div>
                        <button onClick={() => setIsCartOpen(!isCartOpen)} className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full text-white text-sm font-bold flex items-center gap-2 hover:bg-blue-600/80 transition-colors">
                            <span>🛒 {cart.length}</span>
                        </button>
                    </div>
                </header>

                {/* Scanner Frame */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                    <div className="w-[80vw] h-[80vw] max-w-[400px] max-h-[400px] border-2 border-white/50 rounded-2xl relative">
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 -mt-0.5 -ml-0.5 rounded-tl-lg"></div>
                        <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 -mt-0.5 -mr-0.5 rounded-tr-lg"></div>
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 -mb-0.5 -ml-0.5 rounded-bl-lg"></div>
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 -mb-0.5 -mr-0.5 rounded-br-lg"></div>

                        {isScanning && (
                            <motion.div
                                className="absolute inset-0 bg-blue-500/20"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [0, 0.5, 0] }}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                            />
                        )}
                    </div>
                    <p className="text-white/80 text-center mt-4 text-sm font-medium drop-shadow-md">
                        Align product in frame
                    </p>
                </div>

                {/* Scan Button */}
                <div className="flex justify-center pointer-events-auto">
                    <button
                        onClick={captureAndScan}
                        disabled={isScanning}
                        className="group relative"
                    >
                        <div className="absolute inset-0 bg-white/20 rounded-full blur-xl group-hover:bg-blue-500/40 transition-colors"></div>
                        <div className="relative bg-white text-black p-5 rounded-full shadow-2xl transform transition-transform active:scale-95 border-4 border-white/50 bg-clip-padding">
                            {isScanning ? (
                                <svg className="w-8 h-8 animate-pulse text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /></svg>
                            ) : (
                                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                            )}
                        </div>
                    </button>
                </div>
            </div>

            {/* Not Found Alert */}
            <AnimatePresence>
                {showNotFound && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="absolute top-24 left-1/2 -translate-x-1/2 z-20 bg-red-500/90 backdrop-blur-md px-6 py-3 rounded-full text-white font-semibold shadow-lg pointer-events-none"
                    >
                        Product not found
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Found Product Modal */}
            <AnimatePresence>
                {foundProduct && (
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 20 }}
                        className="absolute bottom-0 left-0 right-0 z-30 bg-neutral-900 rounded-t-3xl p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] border-t border-neutral-700 pointer-events-auto"
                    >
                        <div className="w-12 h-1.5 bg-neutral-700 rounded-full mx-auto mb-6"></div>
                        <div className="flex gap-4">
                            {foundProduct.images[0] && (
                                <img src={foundProduct.images[0]} alt={foundProduct.name} className="w-24 h-24 rounded-xl object-cover bg-neutral-800" />
                            )}
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h2 className="text-xl font-bold text-white mb-1">{foundProduct.name}</h2>
                                    <button onClick={() => setFoundProduct(null)} className="text-neutral-500 p-1">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    </button>
                                </div>
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                                        {foundProduct.category}
                                    </span>
                                </div>
                                <p className="text-blue-400 font-bold text-lg mb-2">{formatBRL(foundProduct.price)}</p>
                            </div>
                        </div>
                        <button onClick={addToCart} className="w-full mt-6 bg-green-600 py-3 rounded-xl font-semibold text-white hover:bg-green-500 transition-colors">
                            Add to Cart
                        </button>
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
                        className="absolute inset-y-0 right-0 z-40 w-full max-w-sm bg-neutral-900 border-l border-neutral-800 shadow-2xl p-6 pointer-events-auto flex flex-col"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold">Cart ({cart.length})</h2>
                            <button onClick={() => setIsCartOpen(false)} className="text-neutral-400 hover:text-white">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-4">
                            {cart.length === 0 ? (
                                <div className="text-center text-neutral-500 mt-10">Cart is empty</div>
                            ) : (
                                cart.map((item, idx) => (
                                    <div key={idx} className="flex gap-4 bg-neutral-800 p-3 rounded-xl">
                                        {item.images && item.images[0] && (
                                            <img src={item.images[0]} className="w-16 h-16 rounded-lg object-cover" />
                                        )}
                                        <div className="flex-1">
                                            <div className="font-bold text-sm line-clamp-1">{item.name}</div>
                                            <div className="text-blue-400 font-bold">{formatBRL(item.price)}</div>
                                        </div>
                                        <button onClick={() => removeFromCart(idx)} className="text-red-500">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="mt-6 pt-6 border-t border-neutral-800">
                            <div className="flex justify-between mb-6 text-xl font-bold">
                                <span>Total</span>
                                <span>{formatBRL(cart.reduce((acc, item) => acc + item.price, 0))}</span>
                            </div>
                            <button
                                onClick={checkout}
                                disabled={cart.length === 0}
                                className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Send to Sales App
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
