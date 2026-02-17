"use client";

import { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
// import { useProducts, type Product } from '@/contexts/ProductContext';
import type { Product } from '@/contexts/GarageSaleContext';
import { useGarageSales } from '@/contexts/GarageSaleContext';
import { findMatchingProduct } from '@/utils/imageMatching';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function CapturePage() {
    const webcamRef = useRef<Webcam>(null);
    const { garageSales, products, getProductsByGarageSale } = useGarageSales();
    const [selectedGarageSaleId, setSelectedGarageSaleId] = useState<string>("");
    const [isScanning, setIsScanning] = useState(false);
    const [foundProduct, setFoundProduct] = useState<Product | null>(null);
    const [showNotFound, setShowNotFound] = useState(false);
    const [cart, setCart] = useState<any[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [customerInfo, setCustomerInfo] = useState({ nome: '', telefone: '', email: '' });
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const router = useRouter();

    useEffect(() => {
        if (garageSales.length > 0 && !selectedGarageSaleId) {
            const mostRecent = garageSales.reduce((latest, gs) =>
                gs.criadoEm > latest.criadoEm ? gs : latest
            );
            setSelectedGarageSaleId(mostRecent.id);
        }
    }, [garageSales, selectedGarageSaleId]);

    const currentProducts = selectedGarageSaleId
        ? getProductsByGarageSale(selectedGarageSaleId)
        : products;

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

    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const addToCart = () => {
        if (foundProduct) {
            const isAlreadyInCart = cart.some(item => item.id === foundProduct.id);
            if (isAlreadyInCart) {
                showToast('Este produto já está no seu carrinho!', 'info');
                setFoundProduct(null);
                return;
            }

            const pendingOrders = JSON.parse(localStorage.getItem('pending_orders') || '[]');
            const isReserved = pendingOrders.some((order: any) =>
                order.items.some((item: any) => item.productId === foundProduct.id)
            );

            if (isReserved) {
                showToast('Este produto já está no carrinho de outro cliente!', 'error');
                setFoundProduct(null);
                return;
            }

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

    const checkout = async () => {
        if (!customerInfo.nome || !customerInfo.telefone || !customerInfo.email) {
            showToast('Por favor, preencha todos os campos', 'error');
            return;
        }

        try {
            const orderData = {
                customerName: customerInfo.nome,
                customerPhone: customerInfo.telefone,
                customerEmail: customerInfo.email,
                total: cart.reduce((acc, item) => acc + item.preco, 0),
                garageSaleId: selectedGarageSaleId,
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
                throw new Error('Falha ao salvar pedido');
            }

            setShowSuccessMessage(true);
            setTimeout(() => {
                setShowSuccessMessage(false);
                setCart([]);
                setCustomerInfo({ nome: '', telefone: '', email: '' });
                setIsCartOpen(false);
            }, 3000);
        } catch (error) {
            console.error('Erro ao salvar pedido:', error);
            showToast('Erro ao salvar pedido. Tente novamente.', 'error');
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

    const searchProducts = (query: string) => {
        setSearchQuery(query);
        if (query.length >= 3) {
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

    const [cameraError, setCameraError] = useState<string | null>(null);

    const onUserMediaError = useCallback((error: string | DOMException) => {
        console.error("Camera Error:", error);
        setCameraError("Acesso à câmera falhou. Certifique-se de estar em HTTPS ou localhost.");
    }, []);

    return (
        <div className="h-screen w-full bg-black relative overflow-hidden font-sans text-white">
            {cameraError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center z-50 bg-neutral-900">
                    <p className="text-red-500 font-bold mb-4 text-xl">Câmera Indisponível</p>
                    <p className="mb-4">{cameraError}</p>
                    <Link href="/" className="mt-8 bg-neutral-700 px-6 py-2 rounded-full">Voltar ao Início</Link>
                </div>
            ) : (
                <motion.div
                    initial={{ scale: 1 }}
                    animate={{ scale: isScanning ? 0.9 : 1 }}
                    transition={{ duration: 0.4, type: "spring" }}
                    className="absolute inset-0 w-full h-full bg-black"
                >
                    <Webcam
                        ref={webcamRef}
                        audio={false}
                        screenshotFormat="image/jpeg"
                        videoConstraints={{
                            facingMode: "environment",
                            width: { ideal: 1920 },
                            height: { ideal: 1080 }
                        }}
                        className="w-full h-full object-cover"
                        onUserMediaError={onUserMediaError}
                    />
                </motion.div>
            )}

            {/* Toast Notification */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, x: "-50%" }}
                        animate={{ opacity: 1, y: 0, x: "-50%" }}
                        exit={{ opacity: 0, y: -20, x: "-50%" }}
                        className={`absolute top-24 left-1/2 z-50 px-6 py-3 rounded-full shadow-lg font-medium text-sm flex items-center gap-2 pointer-events-none
                            ${toast.type === 'success' ? 'bg-green-500 text-white' :
                                toast.type === 'error' ? 'bg-red-500 text-white' :
                                    'bg-neutral-800 text-white border border-neutral-700'}`}
                    >
                        {toast.type === 'success' && <span>✓</span>}
                        {toast.type === 'error' && <span>✕</span>}
                        {toast.type === 'info' && <span>ℹ️</span>}
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* UI Overlay */}
            <div className="absolute inset-0 z-10 flex flex-col justify-between p-6 pb-24 pointer-events-none">
                <header className="flex justify-between items-start pointer-events-auto">
                    <Link href="/" className="bg-black/40 backdrop-blur-md p-3 rounded-full text-white hover:bg-black/60 transition-colors">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
                    </Link>
                    {garageSales.length > 0 && (
                        <select
                            value={selectedGarageSaleId}
                            onChange={(e) => setSelectedGarageSaleId(e.target.value)}
                            className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full text-white border border-white/20 focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            {garageSales.map(gs => (
                                <option key={gs.id} value={gs.id} className="bg-black">{gs.nome}</option>
                            ))}
                        </select>
                    )}
                    <button onClick={() => setIsCartOpen(!isCartOpen)} className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full text-white text-sm font-bold flex items-center gap-2 hover:bg-blue-600/80 transition-colors">
                        <span>🛒 {cart.length}</span>
                    </button>
                </header>

                {/* Scanner Frame - Improved Visuals */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                    <div className="relative w-[90vw] h-[90vw] max-w-[500px] max-h-[500px]">
                        {/* Corner Markers */}
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white/80 rounded-tl-xl drop-shadow-lg"></div>
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white/80 rounded-tr-xl drop-shadow-lg"></div>
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white/80 rounded-bl-xl drop-shadow-lg"></div>
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white/80 rounded-br-xl drop-shadow-lg"></div>

                        {/* Scanning Animation */}
                        {isScanning && (
                            <>
                                <motion.div
                                    className="absolute inset-0 border-2 border-blue-500/50 rounded-lg"
                                    initial={{ opacity: 0, scale: 1 }}
                                    animate={{ opacity: [0, 1, 0], scale: 1.05 }}
                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                />
                                <motion.div
                                    className="absolute w-full h-1 bg-blue-500/80 shadow-[0_0_15px_rgba(59,130,246,0.8)]"
                                    initial={{ top: "0%" }}
                                    animate={{ top: "100%" }}
                                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                                />
                            </>
                        )}
                    </div>
                    <p className="text-white/90 text-center mt-6 text-base font-medium drop-shadow-lg bg-black/20 backdrop-blur-sm py-1 px-3 rounded-full mx-auto w-fit">
                        {isScanning ? "Analisando produto..." : "Toque no botão para capturar"}
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

            {/* Found Product Modal */}
            <AnimatePresence>
                {foundProduct && (
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 20 }}
                        className="absolute bottom-0 left-0 right-0 z-30 bg-neutral-900 rounded-t-3xl p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] border-t border-neutral-700 pointer-events-auto max-h-[85vh] overflow-y-auto"
                    >
                        <div className="w-12 h-1.5 bg-neutral-700 rounded-full mx-auto mb-6"></div>

                        <button onClick={addToCart} className="w-full bg-green-600 py-5 rounded-xl font-bold text-white hover:bg-green-500 transition-colors text-xl mb-6 shadow-lg">
                            ✓ Adicionar ao Carrinho
                        </button>

                        <div className="flex gap-4">
                            {foundProduct.imagens[0] && (
                                <img src={foundProduct.imagens[0]} alt={foundProduct.nome} className="w-32 h-32 rounded-xl object-cover bg-neutral-800" />
                            )}
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h2 className="text-2xl font-bold text-white mb-2">{foundProduct.nome}</h2>
                                    <button onClick={() => setFoundProduct(null)} className="text-neutral-500 p-1 hover:text-white transition-colors">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    </button>
                                </div>
                                <div className="flex items-center gap-2 mb-3 flex-wrap">
                                    <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-sm rounded-full">
                                        {foundProduct.categoria}
                                    </span>
                                </div>
                                <p className="text-blue-400 font-bold text-2xl mb-2">{formatBRL(foundProduct.preco)}</p>
                            </div>
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
                        className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto"
                    >
                        <div className="bg-green-600 text-white p-8 rounded-2xl shadow-2xl text-center max-w-sm mx-4">
                            <div className="text-6xl mb-4">✓</div>
                            <h3 className="text-2xl font-bold mb-2">Compra Registrada!</h3>
                            <p className="text-lg">Por favor, dirija-se ao caixa para finalizar o pagamento.</p>
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
                        className="absolute inset-y-0 right-0 z-40 w-full max-w-sm bg-neutral-900 border-l border-neutral-800 shadow-2xl p-6 pointer-events-auto flex flex-col"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold">Carrinho ({cart.length})</h2>
                            <button onClick={() => setIsCartOpen(false)} className="text-neutral-400 hover:text-white">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-4 mb-6">
                            {cart.length === 0 ? (
                                <div className="text-center text-neutral-500 mt-10">Carrinho vazio</div>
                            ) : (
                                cart.map((item, idx) => (
                                    <div key={idx} className="flex gap-4 bg-neutral-800 p-3 rounded-xl">
                                        {item.imagens && item.imagens[0] && (
                                            <img src={item.imagens[0]} className="w-16 h-16 rounded-lg object-cover" />
                                        )}
                                        <div className="flex-1">
                                            <div className="font-bold text-sm line-clamp-1">{item.nome}</div>
                                            <div className="text-blue-400 font-bold">{formatBRL(item.preco)}</div>
                                        </div>
                                        <button onClick={() => removeFromCart(idx)} className="text-red-500">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="border-t border-neutral-800 pt-4 space-y-4">
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    placeholder="Nome completo *"
                                    value={customerInfo.nome}
                                    onChange={(e) => setCustomerInfo({ ...customerInfo, nome: e.target.value })}
                                    className="w-full bg-neutral-800 text-white px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <input
                                    type="tel"
                                    placeholder="Telefone *"
                                    value={customerInfo.telefone}
                                    onChange={(e) => setCustomerInfo({ ...customerInfo, telefone: maskPhone(e.target.value) })}
                                    maxLength={15}
                                    className="w-full bg-neutral-800 text-white px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <input
                                    type="email"
                                    placeholder="Email *"
                                    value={customerInfo.email}
                                    onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                                    className="w-full bg-neutral-800 text-white px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="flex justify-between text-xl font-bold pt-4 border-t border-neutral-800">
                                <span>Total</span>
                                <span>{formatBRL(cart.reduce((acc, item) => acc + item.preco, 0))}</span>
                            </div>
                            <button
                                onClick={checkout}
                                disabled={cart.length === 0}
                                className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Realizar Compra
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showSearchModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, }}
                        className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto"
                        onClick={() => setShowSearchModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
                        >
                            <div className="p-6 border-b border-neutral-800">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-2xl font-bold text-white">Buscar Produto</h2>
                                    <button
                                        onClick={() => setShowSearchModal(false)}
                                        className="text-neutral-400 hover:text-white transition-colors"
                                    >
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Digite o nome do produto (mín. 3 caracteres)"
                                    value={searchQuery}
                                    onChange={(e) => searchProducts(e.target.value)}
                                    autoFocus
                                    className="w-full bg-neutral-800 text-white px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                {searchQuery.length < 3 ? (
                                    <div className="text-center text-neutral-400 py-12">
                                        <div className="text-6xl mb-4">🔍</div>
                                        <p>Digite pelo menos 3 caracteres para buscar</p>
                                    </div>
                                ) : searchResults.length === 0 ? (
                                    <div className="text-center text-neutral-400 py-12">
                                        <div className="text-6xl mb-4">😕</div>
                                        <p>Nenhum produto encontrado</p>
                                        <p className="text-sm mt-2">Tente buscar com outro termo</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {searchResults.map((product) => (
                                            <button
                                                key={product.id}
                                                onClick={() => selectProductFromSearch(product)}
                                                className="bg-neutral-800 rounded-xl p-4 hover:bg-neutral-700 transition-colors text-left"
                                            >
                                                {product.imagens[0] && (
                                                    <img
                                                        src={product.imagens[0]}
                                                        alt={product.nome}
                                                        className="w-full h-32 object-cover rounded-lg mb-3"
                                                    />
                                                )}
                                                <h3 className="font-bold text-white mb-1 line-clamp-1">{product.nome}</h3>
                                                <p className="text-sm text-neutral-400 mb-2 line-clamp-1">{product.categoria}</p>
                                                <p className="text-lg font-bold text-blue-400">{formatBRL(product.preco)}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
