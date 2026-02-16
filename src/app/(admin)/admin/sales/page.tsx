"use client";

import { useState, useEffect } from "react";
import { useGarageSales } from "@/contexts/GarageSaleContext";
import Link from "next/link";

interface Sale {
    id: number;
    items: { desc: string; qty: number; price: number }[];
    payments: { method: string; amount: number }[];
    totalValue: number;
    date: string;
    timestamp: string;
    buyerName?: string;
    buyerPhone?: string;
    buyerEmail?: string;
    garageSaleId?: string;
}

export default function AdminSalesPage() {
    const { garageSales } = useGarageSales();
    const [selectedGarageSaleId, setSelectedGarageSaleId] = useState<string>("all");
    const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
    const [expandedSaleId, setExpandedSaleId] = useState<number | null>(null);

    useEffect(() => {
        const fetchSales = async () => {
            try {
                const res = await fetch('/api/sales');
                if (res.ok) {
                    const data = await res.json();
                    setSalesHistory(data);
                }
            } catch (e) {
                console.error("Failed to load sales history", e);
            }
        };
        fetchSales();
    }, []);

    const filteredSales = selectedGarageSaleId === "all"
        ? salesHistory
        : salesHistory.filter(s => s.garageSaleId === selectedGarageSaleId);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const formatDate = (timestamp: string) => {
        return new Date(timestamp).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getPaymentMethodLabel = (method: string) => {
        const labels: Record<string, string> = {
            pix: 'PIX',
            money: 'Dinheiro',
            card_client: 'Cartão (Cliente)',
            card_garage: 'Cartão (Garage Sale)'
        };
        return labels[method] || method;
    };

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Histórico de Vendas</h1>
                    <p className="text-neutral-400">Todas as vendas realizadas no PDV</p>
                </div>
            </header>

            <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Filtrar por Evento
                </label>
                <select
                    value={selectedGarageSaleId}
                    onChange={e => setSelectedGarageSaleId(e.target.value)}
                    className="w-full md:w-96 bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                >
                    <option value="all">Todos os Eventos</option>
                    {garageSales.map(gs => (
                        <option key={gs.id} value={gs.id}>{gs.nome}</option>
                    ))}
                </select>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-6">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">
                        {filteredSales.length} Venda{filteredSales.length !== 1 ? 's' : ''}
                    </h2>
                    <div className="text-2xl font-bold text-green-400">
                        Total: {formatCurrency(filteredSales.reduce((sum, s) => sum + s.totalValue, 0))}
                    </div>
                </div>

                {filteredSales.length === 0 ? (
                    <div className="text-center py-12 text-neutral-400">
                        <div className="text-6xl mb-4">📊</div>
                        <p className="text-lg">Nenhuma venda registrada</p>
                        <p className="text-sm mt-2">As vendas feitas no PDV aparecerão aqui</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredSales.slice().reverse().map((sale) => (
                            <div
                                key={sale.id}
                                className="border border-neutral-800 rounded-lg overflow-hidden hover:border-neutral-700 transition-colors"
                            >
                                <button
                                    onClick={() => setExpandedSaleId(expandedSaleId === sale.id ? null : sale.id)}
                                    className="w-full p-4 flex items-center justify-between bg-neutral-900 hover:bg-neutral-800 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                                            #{sale.id}
                                        </div>
                                        <div className="text-left">
                                            <p className="font-bold text-white">
                                                {sale.buyerName || 'Cliente'}
                                                {sale.buyerPhone && <span className="text-neutral-400 font-normal ml-2">({sale.buyerPhone})</span>}
                                            </p>
                                            <p className="text-sm text-neutral-400">
                                                {formatDate(sale.timestamp)}
                                                {sale.garageSaleId && garageSales.find(gs => gs.id === sale.garageSaleId) && (
                                                    <span className="ml-2">
                                                        • {garageSales.find(gs => gs.id === sale.garageSaleId)?.nome}
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-green-400">
                                                {formatCurrency(sale.totalValue)}
                                            </div>
                                            <div className="text-sm text-neutral-400">
                                                {sale.items.length} item{sale.items.length !== 1 ? 's' : ''}
                                            </div>
                                        </div>
                                        <svg
                                            className={`w-6 h-6 text-neutral-400 transition-transform ${expandedSaleId === sale.id ? 'rotate-180' : ''}`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </button>

                                {expandedSaleId === sale.id && (
                                    <div className="p-4 bg-neutral-950 border-t border-neutral-800">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <h3 className="font-bold text-white mb-3">Itens Vendidos</h3>
                                                <div className="space-y-2">
                                                    {sale.items.map((item, idx) => (
                                                        <div key={idx} className="flex items-center justify-between p-2 bg-neutral-900 rounded">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-blue-400">{item.qty}x</span>
                                                                <span className="text-white">{item.desc}</span>
                                                            </div>
                                                            <span className="font-semibold text-neutral-300">
                                                                {formatCurrency(item.price * item.qty)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <h3 className="font-bold text-white mb-3">Pagamentos</h3>
                                                <div className="space-y-2">
                                                    {sale.payments.map((payment, idx) => (
                                                        <div key={idx} className="flex items-center justify-between p-2 bg-neutral-900 rounded">
                                                            <span className="text-white">{getPaymentMethodLabel(payment.method)}</span>
                                                            <span className="font-semibold text-green-400">
                                                                {formatCurrency(payment.amount)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>

                                                {sale.buyerEmail && (
                                                    <div className="mt-4 p-2 bg-neutral-900 rounded">
                                                        <p className="text-sm text-neutral-400">Email</p>
                                                        <p className="text-white">{sale.buyerEmail}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
