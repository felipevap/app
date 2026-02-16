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

export default function AdminDashboard() {
    const { garageSales, products } = useGarageSales();
    const [selectedGarageSaleId, setSelectedGarageSaleId] = useState<string>("all");
    const [salesHistory, setSalesHistory] = useState<Sale[]>([]);

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

    const filteredProducts = selectedGarageSaleId === "all"
        ? products
        : products.filter(p => p.garageSaleId === selectedGarageSaleId);

    const totalSalesValue = filteredSales.reduce((sum, sale) => sum + sale.totalValue, 0);
    const activeProducts = filteredProducts.filter(p => p.status === 'disponível').length;
    const recentSales = filteredSales.slice(-5).reverse();

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const formatRelativeTime = (timestamp: string) => {
        const now = new Date();
        const saleDate = new Date(timestamp);
        const diffMs = now.getTime() - saleDate.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'agora mesmo';
        if (diffMins < 60) return `há ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
        if (diffHours < 24) return `há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
        return `há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
    };

    return (
        <div className="space-y-6">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-white">Painel</h1>
                <p className="text-neutral-400">Bem-vindo ao centro de comando.</p>
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

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-6 shadow-sm">
                    <h3 className="text-sm font-medium text-neutral-400">
                        Vendas Totais
                    </h3>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-white">
                            {formatCurrency(totalSalesValue)}
                        </span>
                        <span className="text-sm text-blue-400">
                            {filteredSales.length} venda{filteredSales.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>

                <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-6 shadow-sm">
                    <h3 className="text-sm font-medium text-neutral-400">
                        Produtos Ativos
                    </h3>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-white">
                            {activeProducts}
                        </span>
                        <span className="text-sm text-green-400">
                            Disponíveis
                        </span>
                    </div>
                </div>
            </div>

            {/* Sales by Garage Sale Chart */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-6">
                <h2 className="text-xl font-bold text-white mb-6">Vendas por Evento</h2>
                <div className="space-y-4">
                    {garageSales.map(gs => {
                        const salesForGs = salesHistory.filter(s => s.garageSaleId === gs.id);
                        const totalForGs = salesForGs.reduce((sum, s) => sum + s.totalValue, 0);
                        const maxSales = Math.max(...garageSales.map(g =>
                            salesHistory.filter(s => s.garageSaleId === g.id).reduce((sum, s) => sum + s.totalValue, 0)
                        ), 1); // Avoid division by zero
                        const percentage = (totalForGs / maxSales) * 100;

                        return (
                            <div key={gs.id} className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-white font-medium">{gs.nome}</span>
                                    <span className="text-neutral-400">{formatCurrency(totalForGs)}</span>
                                </div>
                                <div className="h-3 w-full bg-neutral-900 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-600 to-purple-600 rounded-full transition-all duration-1000 ease-out"
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                    {garageSales.length === 0 && (
                        <p className="text-center text-neutral-500 py-4">Nenhum evento cadastrado</p>
                    )}
                </div>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white">Atividade Recente (PDV)</h2>
                    <Link
                        href="/admin/sales"
                        className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                        Ver todas →
                    </Link>
                </div>
                <div className="space-y-4">
                    {recentSales.length === 0 ? (
                        <div className="text-center py-8 text-neutral-400">
                            Nenhuma venda registrada ainda
                        </div>
                    ) : (
                        recentSales.map((sale) => (
                            <div
                                key={sale.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-800 pb-4 last:border-0 last:pb-0 gap-4 sm:gap-0"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                        {sale.id}
                                    </div>
                                    <div>
                                        <p className="font-medium text-white">
                                            {sale.buyerName || 'Cliente'} <span className="text-neutral-500 text-sm">• {sale.items.length} item{sale.items.length !== 1 ? 's' : ''}</span>
                                        </p>
                                        <p className="text-xs sm:text-sm text-neutral-400 flex flex-wrap gap-1">
                                            {formatRelativeTime(sale.timestamp)}
                                            {sale.garageSaleId && garageSales.find(gs => gs.id === sale.garageSaleId) && (
                                                <span className="hidden sm:inline">• {garageSales.find(gs => gs.id === sale.garageSaleId)?.nome}</span>
                                            )}
                                        </p>
                                        {/* Mobile only garage sale name */}
                                        {sale.garageSaleId && garageSales.find(gs => gs.id === sale.garageSaleId) && (
                                            <p className="sm:hidden text-xs text-blue-400 mt-1">
                                                {garageSales.find(gs => gs.id === sale.garageSaleId)?.nome}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <span className="text-lg font-bold text-green-400 sm:text-sm sm:font-medium text-right">
                                    {formatCurrency(sale.totalValue)}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
