"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface OrderItem {
    id: string;
    description: string;
    quantity: number;
    price: number;
    productId?: string;
}

interface Order {
    id: string;
    total: number;
    status: string;
    createdAt: string;
    isPaid: boolean;
    items: OrderItem[];
}

interface MyOrdersModalProps {
    isOpen: boolean;
    onClose: () => void;
    customerEmail: string;
    customerPhone: string;
}

export default function MyOrdersModal({ isOpen, onClose, customerEmail, customerPhone }: MyOrdersModalProps) {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && (customerEmail || customerPhone)) {
            fetchOrders();
        }
    }, [isOpen, customerEmail, customerPhone]);

    const fetchOrders = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (customerEmail) params.append('customerEmail', customerEmail);
            if (customerPhone) params.append('customerPhone', customerPhone);

            const res = await fetch(`/api/pending-orders?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setOrders(data);
            }
        } catch (error) {
            console.error("Error fetching orders:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatCurrency = (value: number) => {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-neutral-900 w-full max-w-lg rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]"
                    >
                        <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-900">
                            <h2 className="text-xl font-bold text-white">Meus Pedidos</h2>
                            <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-neutral-900">
                            {isLoading ? (
                                <div className="text-center py-8">
                                    <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                                    <p className="text-neutral-400">Carregando pedidos...</p>
                                </div>
                            ) : orders.length === 0 ? (
                                <div className="text-center py-8 text-neutral-400">
                                    <p className="text-4xl mb-2">📦</p>
                                    <p>Nenhum pedido encontrado.</p>
                                    <p className="text-sm mt-1">Verifique se seus dados estão corretos.</p>
                                </div>
                            ) : (
                                orders.map((order) => (
                                    <div key={order.id} className="bg-neutral-800 rounded-xl p-4 border border-neutral-700">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${order.isPaid ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                                    {order.isPaid ? 'PAGO' : 'PAGAMENTO PENDENTE'}
                                                </span>
                                                <p className="text-neutral-400 text-xs mt-1">{formatDate(order.createdAt)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-white text-lg">{formatCurrency(order.total)}</p>
                                            </div>
                                        </div>

                                        <div className="bg-neutral-900/50 rounded-lg p-2 space-y-2">
                                            {order.items.map((item, idx) => (
                                                <div key={idx} className="flex justify-between text-sm">
                                                    <span className="text-neutral-300">{item.quantity}x {item.description}</span>
                                                    <span className="text-neutral-400">{formatCurrency(item.price * item.quantity)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-4 border-t border-neutral-800 bg-neutral-900">
                            <button
                                onClick={onClose}
                                className="w-full bg-neutral-800 text-white font-bold py-3 rounded-xl hover:bg-neutral-700 transition-colors"
                            >
                                Fechar
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
