"use client";

import { useState, useEffect } from "react";
import { useGarageSales } from "@/contexts/GarageSaleContext";
import Toast from "@/components/Toast";

interface SaleItem {
    id: number;
    description: string;
    quantity: number;
    price: number;
    productId?: string;
    originalPrice?: number;
    discountPercent?: number;
}

interface Sale {
    id: number;
    items: SaleItem[];
    payments: { method: string; amount: number }[];
    totalValue: number;
    createdAt: string;
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
    const [editingSale, setEditingSale] = useState<Sale | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; isVisible: boolean }>({ message: '', type: 'info', isVisible: false });

    const showToast = (message: string, type: 'success' | 'error' | 'info') => {
        setToast({ message, type, isVisible: true });
    };

    useEffect(() => {
        fetchSales();
    }, []);

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

    const handleDelete = async (e: React.MouseEvent, saleId: number) => {
        e.stopPropagation();
        if (!confirm("Tem certeza que deseja excluir esta venda? Os produtos voltarão a ficar disponíveis no estoque.")) return;

        try {
            const res = await fetch(`/api/sales/${saleId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                showToast("Venda excluída com sucesso!", "success");
                fetchSales();
            } else {
                showToast("Erro ao excluir venda.", "error");
            }
        } catch (error) {
            console.error(error);
            showToast("Erro ao excluir venda.", "error");
        }
    };

    const handleEditClick = (e: React.MouseEvent, sale: Sale) => {
        e.stopPropagation();
        setEditingSale(sale);
    };

    const filteredSales = selectedGarageSaleId === "all"
        ? salesHistory
        : salesHistory.filter(s => s.garageSaleId === selectedGarageSaleId);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'Data desconhecida';
        return new Date(dateString).toLocaleString('pt-BR', {
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
            card_garage: 'Cartão (evento)'
        };
        return labels[method] || method;
    };

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-stone-900">Histórico de Vendas</h1>
                    <p className="text-stone-600">Todas as vendas realizadas no PDV</p>
                </div>
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

            <div className="rounded-xl border border-stone-200 bg-white p-6">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-stone-900">
                        {filteredSales.length} Venda{filteredSales.length !== 1 ? 's' : ''}
                    </h2>
                    <div className="text-2xl font-bold text-emerald-700">
                        Total: {formatCurrency(filteredSales.reduce((sum, s) => sum + s.totalValue, 0))}
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex h-64 items-center justify-center">
                        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
                    </div>
                ) : filteredSales.length === 0 ? (
                    <div className="text-center py-12 text-stone-600">
                        <div className="text-6xl mb-4">📊</div>
                        <p className="text-lg">Nenhuma venda registrada</p>
                        <p className="text-sm mt-2">As vendas feitas no PDV aparecerão aqui</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredSales.slice().reverse().map((sale) => (
                            <div
                                key={sale.id}
                                className="border border-stone-200 rounded-lg overflow-hidden hover:border-stone-300 transition-colors"
                            >
                                <button
                                    onClick={() => setExpandedSaleId(expandedSaleId === sale.id ? null : sale.id)}
                                    className="w-full p-4 flex items-center justify-between bg-stone-50 hover:bg-stone-100 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                                            #{sale.id}
                                        </div>
                                        <div className="text-left">
                                            <p className="font-bold text-stone-900">
                                                {sale.buyerName || 'Cliente'}
                                                {sale.buyerPhone && <span className="text-stone-600 font-normal ml-2">({sale.buyerPhone})</span>}
                                            </p>
                                            <p className="text-sm text-stone-600">
                                                {formatDate(sale.createdAt)}
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
                                            <div className="text-2xl font-bold text-emerald-700">
                                                {formatCurrency(sale.totalValue)}
                                            </div>
                                            <div className="text-sm text-stone-600">
                                                {sale.items.length} item{sale.items.length !== 1 ? 's' : ''}
                                            </div>
                                        </div>
                                        <svg
                                            className={`w-6 h-6 text-stone-600 transition-transform ${expandedSaleId === sale.id ? 'rotate-180' : ''}`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </button>

                                {expandedSaleId === sale.id && (
                                    <div className="p-4 bg-white border-t border-stone-200">
                                        <div className="flex justify-end gap-3 mb-4">
                                            <button
                                                onClick={(e) => handleEditClick(e, sale)}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                                Editar
                                            </button>
                                            <button
                                                onClick={(e) => handleDelete(e, sale.id)}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                                Excluir
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <h3 className="font-bold text-stone-900 mb-3">Itens Vendidos</h3>
                                                <div className="space-y-2">
                                                    {sale.items.map((item, idx) => (
                                                        <div key={idx} className="flex items-center justify-between p-2 bg-stone-50 rounded">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-blue-700">{item.quantity}x</span>
                                                                <span className="text-stone-900">{item.description}</span>
                                                            </div>
                                                            <span className="font-semibold text-stone-700">
                                                                {formatCurrency(item.price * item.quantity)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <h3 className="font-bold text-stone-900 mb-3">Pagamentos</h3>
                                                <div className="space-y-2">
                                                    {sale.payments.map((payment, idx) => (
                                                        <div key={idx} className="flex items-center justify-between p-2 bg-stone-50 rounded">
                                                            <span className="text-stone-900">{getPaymentMethodLabel(payment.method)}</span>
                                                            <span className="font-semibold text-emerald-700">
                                                                {formatCurrency(payment.amount)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>

                                                {sale.buyerEmail && (
                                                    <div className="mt-4 p-2 bg-stone-50 rounded">
                                                        <p className="text-sm text-stone-600">Email</p>
                                                        <p className="text-stone-900">{sale.buyerEmail}</p>
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

            {editingSale && (
                <EditSaleModal
                    sale={editingSale}
                    onClose={() => setEditingSale(null)}
                    onSave={() => {
                        setEditingSale(null);
                        fetchSales();
                    }}
                    showToast={showToast}
                />
            )}

            {toast.isVisible && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast({ ...toast, isVisible: false })}
                />
            )}
        </div>
    );
}

function EditSaleModal({
    sale,
    onClose,
    onSave,
    showToast
}: {
    sale: Sale,
    onClose: () => void,
    onSave: () => void,
    showToast: (message: string, type: 'success' | 'error' | 'info') => void
}) {
    const [buyerName, setBuyerName] = useState(sale.buyerName || "");
    const [buyerPhone, setBuyerPhone] = useState(sale.buyerPhone || "");
    const [buyerEmail, setBuyerEmail] = useState(sale.buyerEmail || "");
    const [items, setItems] = useState(sale.items);
    const [isSaving, setIsSaving] = useState(false);

    const totalValue = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const handleRemoveItem = (indexToRemove: number) => {
        if (!confirm("Remover este item da venda? Ele voltará para o estoque.")) return;
        setItems(items.filter((_, idx) => idx !== indexToRemove));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(`/api/sales/${sale.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    buyerName,
                    buyerPhone,
                    buyerEmail,
                    items, // Send remaining items
                    totalValue
                })
            });

            if (res.ok) {
                showToast("Venda atualizada com sucesso!", "success");
                onSave();
            } else {
                showToast("Erro ao atualizar venda.", "error");
            }
        } catch (error) {
            console.error("Error updating sale", error);
            showToast("Erro ao atualizar venda.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40">
            <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-stone-200 shadow-xl flex flex-col">
                <div className="p-6 border-b border-stone-200 flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold text-stone-900">Editar Venda #{sale.id}</h2>
                    <button onClick={onClose} className="text-stone-500 hover:text-stone-800">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                    {/* Buyer Info */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-stone-700 border-b border-stone-200 pb-2">Informações do Cliente</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-stone-600 mb-1">Nome</label>
                                <input
                                    type="text"
                                    value={buyerName}
                                    onChange={e => setBuyerName(e.target.value)}
                                    className="w-full bg-white border border-stone-300 rounded p-2 text-stone-900"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-stone-600 mb-1">Telefone</label>
                                <input
                                    type="text"
                                    value={buyerPhone}
                                    onChange={e => setBuyerPhone(e.target.value)}
                                    className="w-full bg-white border border-stone-300 rounded p-2 text-stone-900"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm text-stone-600 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={buyerEmail}
                                    onChange={e => setBuyerEmail(e.target.value)}
                                    className="w-full bg-white border border-stone-300 rounded p-2 text-stone-900"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Items */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-stone-200 pb-2">
                            <h3 className="font-bold text-stone-700">Itens ({items.length})</h3>
                            <span className="text-emerald-700 font-bold">{formatCurrency(totalValue)}</span>
                        </div>

                        {items.length === 0 && (
                            <p className="text-red-400 text-sm">Atenção: remover todos os itens excluirá efetivamente os produtos da venda.</p>
                        )}

                        <div className="space-y-2">
                            {items.map((item, idx) => (
                                <div key={item.id || idx} className="flex items-center justify-between p-3 bg-white border border-stone-200 rounded-lg group hover:border-stone-300">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-blue-700">{item.quantity}x</span>
                                            <span className="text-stone-900">{item.description}</span>
                                        </div>
                                        <div className="text-sm text-stone-600 mt-1">
                                            Original: {formatCurrency(item.price)}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="font-bold text-stone-900">{formatCurrency(item.price * item.quantity)}</span>
                                        <button
                                            onClick={() => handleRemoveItem(idx)}
                                            className="p-2 text-red-500 hover:bg-stone-100 rounded-full transition-colors"
                                            title="Remover item"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-stone-200 flex justify-end gap-3 bg-stone-50 sticky bottom-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-stone-700 hover:bg-stone-200 rounded-lg transition-colors"
                        disabled={isSaving}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isSaving ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                </svg>
                                Salvando...
                            </>
                        ) : (
                            "Salvar Alterações"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
