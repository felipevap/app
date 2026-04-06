"use client";

import { useState, useEffect } from "react";
import { useGarageSales } from "@/contexts/GarageSaleContext";
import Link from "next/link";

interface Sale {
    id: number;
    items: { desc: string; qty: number; price: number }[];
    payments: { method: string; amount: number }[];
    totalValue: number;
    createdAt: string;
    buyerName?: string;
    buyerPhone?: string;
    buyerEmail?: string;
    garageSaleId?: string;
}

export default function AdminDashboard() {
    const { garageSales, products } = useGarageSales();
    const [selectedGarageSaleId, setSelectedGarageSaleId] = useState<string>("all");
    const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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
            } finally {
                setIsLoading(false);
            }
        };
        fetchSales();
    }, []);

    // Set default selected garage sale to the latest one when garageSales are loaded
    useEffect(() => {
        if (garageSales.length > 0 && selectedGarageSaleId === "all") {
            // Check if we haven't manually selected "all" (this logic might be tricky if user actually WANTS "all")
            // A better approach is initializing state with null or a specific value if possible, 
            // but since garageSales comes from context, we might not have it on initial render.
            // Let's just set it once when garageSales becomes available.
            // Actually, the requirement is "numbers on dashboard are wrong... filter to only show products...".
            // The user implies that the default view should be the active/latest sale.
            setSelectedGarageSaleId(garageSales[0].id);
        }
    }, [garageSales]);
    // Note: This will force selection to first GS on load. If user switches to "all", this effect won't run again 
    // unless garageSales changes, which is fine. 
    // BUT we need to be careful not to override user selection if they switch BACK to "all" and then garageSales updates (unlikely).
    // To make it robust: only set if we are in the initial "all" state and we haven't touched it? 
    // Simpler: Just set it on mount if we have them, or when they load.
    // The previous state was initialized to "all".


    const filteredSales = selectedGarageSaleId === "all"
        ? salesHistory
        : salesHistory.filter(s => s.garageSaleId === selectedGarageSaleId);

    const filteredProducts = selectedGarageSaleId === "all"
        ? products
        : products.filter(p => p.garageSaleId === selectedGarageSaleId);

    const totalSalesValue = filteredSales.reduce((sum, sale) => sum + sale.totalValue, 0);
    const activeProducts = filteredProducts.filter(p => p.status === 'disponível' && !p.deletedAt).length;
    const recentSales = filteredSales.slice(-5).reverse();

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const formatRelativeTime = (dateString: string) => {
        if (!dateString) return 'Data desconhecida';
        const now = new Date();
        const saleDate = new Date(dateString);

        if (isNaN(saleDate.getTime())) return 'Data inválida';

        const diffMs = now.getTime() - saleDate.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'agora mesmo';
        if (diffMins < 60) return `há ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
        if (diffHours < 24) return `há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
        return `há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
    };

    if (isLoading) {
        return (
            <div className="flex min-h-[calc(100dvh-8rem)] items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-stone-900">Painel</h1>
                <p className="text-stone-600">Bem-vindo ao centro de comando.</p>
            </header>

            <div className="mb-6">
                <label className="block text-sm font-medium text-stone-700 mb-2">
                    Filtrar por Evento
                </label>
                <select
                    value={selectedGarageSaleId}
                    onChange={e => setSelectedGarageSaleId(e.target.value)}
                    className="w-full md:w-96 bg-white border border-stone-300 rounded-lg p-3 text-stone-900 focus:border-blue-500 outline-none"
                >
                    <option value="all">Todos os Eventos</option>
                    {garageSales.map(gs => (
                        <option key={gs.id} value={gs.id}>{gs.nome}</option>
                    ))}
                </select>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-stone-200 bg-white shadow-sm p-6 shadow-sm">
                    <h3 className="text-sm font-medium text-stone-600">
                        Vendas Totais
                    </h3>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-stone-900">
                            {formatCurrency(totalSalesValue)}
                        </span>
                        <span className="text-sm text-blue-700">
                            {filteredSales.length} venda{filteredSales.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>

                <div className="rounded-xl border border-stone-200 bg-white shadow-sm p-6 shadow-sm">
                    <h3 className="text-sm font-medium text-stone-600">
                        Produtos Ativos
                    </h3>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-stone-900">
                            {activeProducts}
                        </span>
                        <span className="text-sm text-emerald-700">
                            Disponíveis
                        </span>
                    </div>
                </div>
            </div>

            {/* Sales by Garage Sale Chart */}
            <div className="rounded-xl border border-stone-200 bg-white shadow-sm p-6">
                <h2 className="text-xl font-bold text-stone-900 mb-6">Vendas por Evento</h2>
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
                                    <span className="text-stone-900 font-medium">{gs.nome}</span>
                                    <span className="text-stone-600">{formatCurrency(totalForGs)}</span>
                                </div>
                                <div className="h-3 w-full bg-stone-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-600 to-purple-600 rounded-full transition-all duration-1000 ease-out"
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                    {garageSales.length === 0 && (
                        <p className="text-center text-stone-500 py-4">Nenhum evento cadastrado</p>
                    )}
                </div>
            </div>

            <div className="rounded-xl border border-stone-200 bg-white shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-stone-900">Atividade Recente (PDV)</h2>
                    <Link
                        href="/admin/sales"
                        className="text-sm text-blue-700 hover:text-blue-800 transition-colors"
                    >
                        Ver todas →
                    </Link>
                </div>
                <div className="space-y-4">
                    {recentSales.length === 0 ? (
                        <div className="text-center py-8 text-stone-600">
                            Nenhuma venda registrada ainda
                        </div>
                    ) : (
                        recentSales.map((sale) => (
                            <div
                                key={sale.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-200 pb-4 last:border-0 last:pb-0 gap-4 sm:gap-0"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                        {sale.id}
                                    </div>
                                    <div>
                                        <p className="font-medium text-stone-900">
                                            {sale.buyerName || 'Cliente'} <span className="text-stone-500 text-sm">• {sale.items.length} item{sale.items.length !== 1 ? 's' : ''}</span>
                                        </p>
                                        <p className="text-xs sm:text-sm text-stone-600 flex flex-wrap gap-1">
                                            {formatRelativeTime(sale.createdAt)}
                                            {sale.garageSaleId && garageSales.find(gs => gs.id === sale.garageSaleId) && (
                                                <span className="hidden sm:inline">• {garageSales.find(gs => gs.id === sale.garageSaleId)?.nome}</span>
                                            )}
                                        </p>
                                        {/* Mobile only garage sale name */}
                                        {sale.garageSaleId && garageSales.find(gs => gs.id === sale.garageSaleId) && (
                                            <p className="sm:hidden text-xs text-blue-700 mt-1">
                                                {garageSales.find(gs => gs.id === sale.garageSaleId)?.nome}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <span className="text-lg font-bold text-emerald-700 sm:text-sm sm:font-medium text-right">
                                    {formatCurrency(sale.totalValue)}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div >
    );
}
