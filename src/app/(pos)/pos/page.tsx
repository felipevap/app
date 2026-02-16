"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface Item {
    desc: string;
    qty: number;
    price: number;
}

interface Payment {
    method: string;
    amount: number;
}

interface Sale {
    id: number;
    items: Item[];
    payments: Payment[];
    totalValue: number;
    date: string;
    timestamp: string;
    buyerName?: string;
    buyerPhone?: string;
    buyerEmail?: string;
}

export default function POSPage() {
    const [currentView, setCurrentView] = useState<'sales' | 'products' | 'report'>('sales');
    const [isCheckoutMode, setIsCheckoutMode] = useState(false);
    const [currentSale, setCurrentSale] = useState<Partial<Sale>>({
        items: [],
        payments: [],
        buyerName: "",
        buyerPhone: "",
        buyerEmail: "",
    });

    const [newItem, setNewItem] = useState<Item>({ desc: "", qty: 1, price: 0 });
    const [tempPayment, setTempPayment] = useState<Payment>({ method: "pix", amount: 0 });
    const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
    const [receiptData, setReceiptData] = useState<Sale | null>(null);
    const [editingSale, setEditingSale] = useState<Sale | null>(null);
    const [showSignaturePad, setShowSignaturePad] = useState(false);
    const [signature, setSignature] = useState<string | null>(null);

    const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        const savedSales = localStorage.getItem('pos_sales_history');
        if (savedSales) {
            try {
                setSalesHistory(JSON.parse(savedSales));
            } catch (e) {
                console.error("Failed to load sales history", e);
            }
        }

        const savedSignature = localStorage.getItem('pos_signature');
        if (savedSignature) {
            setSignature(savedSignature);
        }

        const pendingCart = localStorage.getItem('pending_cart');
        if (pendingCart) {
            try {
                const items = JSON.parse(pendingCart);
                if (Array.isArray(items) && items.length > 0) {
                    setCurrentSale(prev => ({
                        ...prev,
                        items: [...(prev.items || []), ...items]
                    }));
                    localStorage.removeItem('pending_cart');
                }
            } catch (e) {
                console.error("Failed to parse pending items", e);
            }
        }
    }, []);

    const saveSalesToLocal = (sales: Sale[]) => {
        localStorage.setItem('pos_sales_history', JSON.stringify(sales));
    };

    const currentSaleTotal = currentSale.items?.reduce((acc, item) => acc + (item.price * item.qty), 0) || 0;
    const currentPaymentsTotal = currentSale.payments?.reduce((acc, p) => acc + p.amount, 0) || 0;
    const remainingAmount = currentSaleTotal - currentPaymentsTotal;

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    const getPaymentLabel = (method: string) => {
        const labels: Record<string, string> = {
            'pix': 'PIX',
            'money': 'Dinheiro',
            'card_client': 'Cartão (Cli)',
            'card_garage': 'Cartão (Loja)'
        };
        return labels[method] || method;
    };

    const generateReceiptText = (sale: Sale) => {
        let text = `GARAGE SALE PREMIUM\n`;
        text += `Recibo #${String(sale.id).padStart(4, '0')}\n`;
        text += `Data: ${new Date(sale.date).toLocaleDateString('pt-BR')}\n\n`;
        text += `ITENS:\n`;
        sale.items.forEach(item => {
            text += `${item.qty}x ${item.desc} - ${formatCurrency(item.price * item.qty)}\n`;
        });
        text += `\nTOTAL: ${formatCurrency(sale.totalValue)}\n`;
        text += `\nPAGAMENTO:\n`;
        sale.payments.forEach(p => {
            text += `${getPaymentLabel(p.method)}: ${formatCurrency(p.amount)}\n`;
        });
        if (sale.buyerName) {
            text += `\nCliente: ${sale.buyerName}\n`;
        }
        return text;
    };

    const sendReceiptToWhatsApp = (sale: Sale) => {
        if (!sale) return;
        const text = generateReceiptText(sale);
        const encodedText = encodeURIComponent(text);
        let phone = sale.buyerPhone ? sale.buyerPhone.replace(/\D/g, '') : '';
        let url = phone ? `https://wa.me/55${phone}?text=${encodedText}` : `https://wa.me/?text=${encodedText}`;
        window.open(url, '_blank');
    };

    const generateReportHTML = () => {
        const summary = calculateSummary();
        let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Relatório de Vendas</title>`;
        html += `<style>body{font-family:sans-serif;padding:20px;max-width:800px;margin:0 auto;}`;
        html += `table{width:100%;border-collapse:collapse;margin:20px 0;}`;
        html += `th,td{border:1px solid #ddd;padding:8px;text-align:left;}`;
        html += `th{background:#4CAF50;color:white;}</style></head><body>`;
        html += `<h1 style="text-align:center;">RELATÓRIO DE FECHAMENTO</h1>`;
        html += `<p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>`;
        html += `<h2>Resumo Financeiro</h2>`;
        html += `<table><tr><th>Método</th><th>Total</th><th>Comissão (20%)</th><th>Líquido</th></tr>`;
        html += `<tr><td>PIX</td><td>${formatCurrency(summary.pix.total)}</td><td>${formatCurrency(summary.pix.commission)}</td><td>${formatCurrency(summary.pix.net)}</td></tr>`;
        html += `<tr><td>Dinheiro</td><td>${formatCurrency(summary.money.total)}</td><td>${formatCurrency(summary.money.commission)}</td><td>${formatCurrency(summary.money.net)}</td></tr>`;
        html += `<tr><td>Cartão (Cli)</td><td>${formatCurrency(summary.cardClient.total)}</td><td>${formatCurrency(summary.cardClient.commission)}</td><td>${formatCurrency(summary.cardClient.net)}</td></tr>`;
        html += `<tr><td>Cartão (Loja)</td><td>${formatCurrency(summary.cardGarage.total)}</td><td>${formatCurrency(summary.cardGarage.commission)}</td><td>${formatCurrency(summary.cardGarage.net)}</td></tr>`;
        html += `<tr style="font-weight:bold;"><td>TOTAL</td><td>${formatCurrency(summary.grandTotal)}</td><td>${formatCurrency(summary.totalCommission)}</td><td>${formatCurrency(summary.grandTotal - summary.totalCommission)}</td></tr>`;
        html += `</table>`;
        html += `<h2>Lista de Vendas</h2>`;
        salesHistory.forEach(sale => {
            html += `<div style="border:1px solid #ddd;padding:10px;margin:10px 0;">`;
            html += `<strong>Venda #${sale.id}</strong> - ${new Date(sale.timestamp).toLocaleString('pt-BR')}<br>`;
            html += `Cliente: ${sale.buyerName || 'Balcão'}<br>`;
            html += `Itens: ${sale.items.map(i => `${i.qty}x ${i.desc}`).join(', ')}<br>`;
            html += `Total: ${formatCurrency(sale.totalValue)}`;
            html += `</div>`;
        });
        if (signature) {
            html += `<div style="margin-top:30px;"><h3>Assinatura:</h3><img src="${signature}" style="border:1px solid #000;max-width:400px;"></div>`;
        }
        html += `</body></html>`;
        return html;
    };

    const downloadHTMLReport = () => {
        const html = generateReportHTML();
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio-${new Date().toISOString().split('T')[0]}.html`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const sendReportToWhatsApp = () => {
        const summary = calculateSummary();
        let text = `RELATÓRIO DE FECHAMENTO\n\n`;
        text += `RESUMO FINANCEIRO:\n`;
        text += `PIX: ${formatCurrency(summary.pix.total)} (Líq: ${formatCurrency(summary.pix.net)})\n`;
        text += `Dinheiro: ${formatCurrency(summary.money.total)} (Líq: ${formatCurrency(summary.money.net)})\n`;
        text += `Cartão Cli: ${formatCurrency(summary.cardClient.total)} (Líq: ${formatCurrency(summary.cardClient.net)})\n`;
        text += `Cartão Loja: ${formatCurrency(summary.cardGarage.total)} (Líq: ${formatCurrency(summary.cardGarage.net)})\n\n`;
        text += `TOTAL BRUTO: ${formatCurrency(summary.grandTotal)}\n`;
        text += `COMISSÕES: -${formatCurrency(summary.totalCommission)}\n`;
        text += `LÍQUIDO: ${formatCurrency(summary.grandTotal - summary.totalCommission)}\n`;
        const encodedText = encodeURIComponent(text);
        window.open(`https://wa.me/?text=${encodedText}`, '_blank');
    };

    const calculateSummary = () => {
        const summary = {
            pix: { total: 0, commission: 0, net: 0 },
            money: { total: 0, commission: 0, net: 0 },
            cardClient: { total: 0, commission: 0, net: 0 },
            cardGarage: { total: 0, commission: 0, net: 0 },
            grandTotal: 0,
            totalCommission: 0,
        };

        salesHistory.forEach(sale => {
            sale.payments.forEach(p => {
                const commission = p.amount * 0.20;
                const net = p.amount - commission;
                summary.grandTotal += p.amount;
                summary.totalCommission += commission;

                if (p.method === 'pix') {
                    summary.pix.total += p.amount;
                    summary.pix.commission += commission;
                    summary.pix.net += net;
                } else if (p.method === 'money') {
                    summary.money.total += p.amount;
                    summary.money.commission += commission;
                    summary.money.net += net;
                } else if (p.method === 'card_client') {
                    summary.cardClient.total += p.amount;
                    summary.cardClient.commission += commission;
                    summary.cardClient.net += net;
                } else if (p.method === 'card_garage') {
                    summary.cardGarage.total += p.amount;
                    summary.cardGarage.commission += commission;
                    summary.cardGarage.net += net;
                }
            });
        });

        return summary;
    };

    const addItem = () => {
        if (!newItem.desc || newItem.price <= 0) return;
        const updatedItems = [...(currentSale.items || []), { ...newItem }];
        setCurrentSale({ ...currentSale, items: updatedItems });
        setNewItem({ desc: "", qty: 1, price: 0 });
    };

    const removeItem = (idx: number) => {
        const updatedItems = currentSale.items?.filter((_, i) => i !== idx);
        setCurrentSale({ ...currentSale, items: updatedItems });
    };

    const addPayment = () => {
        if (tempPayment.amount <= 0) return;
        const updatedPayments = [...(currentSale.payments || []), { ...tempPayment }];
        setCurrentSale({ ...currentSale, payments: updatedPayments });
        setTempPayment({ method: "pix", amount: 0 });
    };

    const removePayment = (idx: number) => {
        const updatedPayments = currentSale.payments?.filter((_, i) => i !== idx);
        setCurrentSale({ ...currentSale, payments: updatedPayments });
    };

    const finalizeSale = () => {
        const newSale: Sale = {
            id: salesHistory.length > 0 ? Math.max(...salesHistory.map(s => s.id)) + 1 : 1,
            items: currentSale.items || [],
            payments: currentSale.payments || [],
            totalValue: currentSaleTotal,
            date: new Date().toISOString().split('T')[0],
            timestamp: new Date().toISOString(),
            buyerName: currentSale.buyerName,
            buyerPhone: currentSale.buyerPhone,
            buyerEmail: currentSale.buyerEmail,
        };

        const updatedHistory = [...salesHistory, newSale];
        setSalesHistory(updatedHistory);
        saveSalesToLocal(updatedHistory);
        setReceiptData(newSale);
        setCurrentSale({ items: [], payments: [], buyerName: "", buyerPhone: "", buyerEmail: "" });
        setIsCheckoutMode(false);
        alert("Venda Finalizada com Sucesso!");
    };

    const deleteSale = (id: number) => {
        if (confirm("Excluir esta venda?")) {
            const updatedHistory = salesHistory.filter(s => s.id !== id);
            setSalesHistory(updatedHistory);
            saveSalesToLocal(updatedHistory);
        }
    };

    const startEditSale = (sale: Sale) => {
        setEditingSale({ ...sale });
    };

    const saveEditedSale = () => {
        if (!editingSale) return;
        const updatedHistory = salesHistory.map(s => s.id === editingSale.id ? editingSale : s);
        setSalesHistory(updatedHistory);
        saveSalesToLocal(updatedHistory);
        setEditingSale(null);
        alert("Venda atualizada!");
    };

    const initSignaturePad = () => {
        const canvas = signatureCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        setIsDrawing(true);
        const canvas = signatureCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const rect = canvas.getBoundingClientRect();
        const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
        const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const canvas = signatureCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const rect = canvas.getBoundingClientRect();
        const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
        const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const saveSignature = () => {
        const canvas = signatureCanvasRef.current;
        if (!canvas) return;
        const dataURL = canvas.toDataURL();
        setSignature(dataURL);
        localStorage.setItem('pos_signature', dataURL);
        setShowSignaturePad(false);
        alert("Assinatura salva!");
    };

    const clearSignature = () => {
        const canvas = signatureCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    useEffect(() => {
        if (showSignaturePad) {
            initSignaturePad();
        }
    }, [showSignaturePad]);

    return (
        <div className="flex h-screen flex-col bg-gray-100 text-slate-800 font-sans">
            <header className="flex h-16 items-center justify-between border-b bg-white px-4 shadow-sm">
                <div className="flex items-center gap-2">
                    <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600 text-sm font-bold text-white">
                            GS
                        </div>
                        <span className="hidden font-bold sm:block">Garage Sale</span>
                    </Link>
                </div>

                <div className="flex rounded-lg bg-gray-100 p-1">
                    <button
                        onClick={() => setCurrentView('sales')}
                        className={`rounded px-4 py-1.5 text-sm font-medium transition-all ${currentView === 'sales' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:bg-gray-200'}`}
                    >
                        Vendas
                    </button>
                    <button
                        onClick={() => setCurrentView('products')}
                        className={`rounded px-4 py-1.5 text-sm font-medium transition-all ${currentView === 'products' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:bg-gray-200'}`}
                    >
                        Produtos
                    </button>
                    <button
                        onClick={() => setCurrentView('report')}
                        className={`rounded px-4 py-1.5 text-sm font-medium transition-all ${currentView === 'report' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:bg-gray-200'}`}
                    >
                        Relatório
                    </button>
                </div>

                <div className="w-8"></div>
            </header>

            <main className="flex flex-grow overflow-hidden relative">
                {currentView === 'sales' && (
                    <div className="flex h-full w-full gap-4 p-4">
                        <div className="flex w-full flex-col gap-4 overflow-y-auto lg:w-2/3">
                            <div className="flex flex-grow flex-col rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                                <div className="flex items-center justify-between border-b bg-gray-50 p-4 rounded-t-xl">
                                    <h2 className="font-bold text-gray-700">{isCheckoutMode ? 'Pagamento' : 'Novo Pedido'}</h2>
                                    <div className="flex gap-2">
                                        <button onClick={() => setCurrentSale({ items: [], payments: [] })} className="text-xs text-red-500 bg-red-50 px-3 py-1 rounded-full hover:bg-red-100 transition-colors">
                                            Limpar
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-2 border-b bg-blue-50 p-4 text-sm md:grid-cols-4">
                                    <input
                                        value={currentSale.buyerName}
                                        onChange={e => setCurrentSale({ ...currentSale, buyerName: e.target.value })}
                                        className="col-span-2 rounded border p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Cliente"
                                    />
                                    <input
                                        value={currentSale.buyerPhone}
                                        onChange={e => setCurrentSale({ ...currentSale, buyerPhone: e.target.value })}
                                        className="rounded border p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Telefone"
                                    />
                                    <input
                                        value={currentSale.buyerEmail}
                                        onChange={e => setCurrentSale({ ...currentSale, buyerEmail: e.target.value })}
                                        className="rounded border p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="E-mail"
                                    />
                                </div>

                                <div className="min-h-[200px] flex-grow overflow-y-auto bg-white p-4">
                                    {currentSale.items!.length === 0 ? (
                                        <div className="mt-8 text-center text-gray-400">Cesta vazia</div>
                                    ) : (
                                        <ul className="space-y-2">
                                            {currentSale.items!.map((item, idx) => (
                                                <li key={idx} className="flex items-center justify-between rounded border bg-gray-50 p-3 hover:bg-gray-100 transition-colors">
                                                    <div className="flex items-center">
                                                        <span className="mr-3 font-bold text-blue-600">{item.qty}x</span>
                                                        <span>{item.desc}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-semibold text-gray-700">{formatCurrency(item.price * item.qty)}</span>
                                                        {!isCheckoutMode && (
                                                            <button onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700 px-1 font-bold">✕</button>
                                                        )}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                <div className="border-t bg-gray-50 p-4">
                                    {!isCheckoutMode ? (
                                        <>
                                            <div className="mb-4 flex gap-2">
                                                <input
                                                    type="text"
                                                    value={newItem.desc}
                                                    onChange={e => setNewItem({ ...newItem, desc: e.target.value })}
                                                    className="flex-grow rounded border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                                                    placeholder="Descrição do item"
                                                />
                                                <input
                                                    type="number"
                                                    value={newItem.qty}
                                                    onChange={e => setNewItem({ ...newItem, qty: parseInt(e.target.value) || 1 })}
                                                    className="w-20 rounded border border-gray-300 p-2 text-center focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                                                    placeholder="Qtd"
                                                />
                                                <input
                                                    type="number"
                                                    value={newItem.price || ''}
                                                    onChange={e => setNewItem({ ...newItem, price: parseFloat(e.target.value) || 0 })}
                                                    className="w-28 rounded border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                                                    placeholder="Preço"
                                                />
                                                <button onClick={addItem} className="rounded bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-700 transition-colors">
                                                    +
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="text-xl font-bold text-gray-700">Total: {formatCurrency(currentSaleTotal)}</div>
                                                <button
                                                    onClick={() => setIsCheckoutMode(true)}
                                                    disabled={currentSale.items!.length === 0}
                                                    className="rounded bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-md hover:shadow-lg disabled:shadow-none"
                                                >
                                                    Finalizar
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Pagamentos</label>
                                                <div className="mb-2 flex gap-2 mt-1">
                                                    <select
                                                        value={tempPayment.method}
                                                        onChange={e => setTempPayment({ ...tempPayment, method: e.target.value })}
                                                        className="w-1/3 rounded border p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                    >
                                                        <option value="pix">PIX</option>
                                                        <option value="money">Cash</option>
                                                        <option value="card_client">Cartão (Cli)</option>
                                                        <option value="card_garage">Cartão (Loja)</option>
                                                    </select>
                                                    <input
                                                        type="number"
                                                        value={tempPayment.amount || ''}
                                                        onChange={e => setTempPayment({ ...tempPayment, amount: parseFloat(e.target.value) || 0 })}
                                                        className="w-1/3 rounded border p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                        placeholder="Valor"
                                                    />
                                                    <button onClick={addPayment} className="w-1/3 rounded bg-blue-100 p-2 text-sm text-blue-700 font-bold hover:bg-blue-200 transition-colors">Adicionar</button>
                                                </div>
                                                <ul className="space-y-1 text-sm">
                                                    {currentSale.payments!.map((p, i) => (
                                                        <li key={i} className="flex items-center justify-between rounded bg-gray-100 p-2">
                                                            <span>{getPaymentLabel(p.method)}: {formatCurrency(p.amount)}</span>
                                                            <button onClick={() => removePayment(i)} className="text-red-500 hover:text-red-700 font-bold">✕</button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div>
                                                <div className="mb-2 text-right">
                                                    <div className="text-xs text-gray-500">Total: {formatCurrency(currentSaleTotal)}</div>
                                                    <div className={`text-xl font-bold ${remainingAmount > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                                                        {remainingAmount > 0.01 ? 'Restante: ' : 'Troco: '} {formatCurrency(Math.abs(remainingAmount))}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => setIsCheckoutMode(false)} className="flex-1 rounded bg-gray-200 py-3 font-bold text-gray-700 hover:bg-gray-300 transition-colors">Voltar</button>
                                                    <button onClick={finalizeSale} disabled={remainingAmount > 0.01} className="flex-[2] rounded bg-green-600 py-3 font-bold text-white hover:bg-green-700 disabled:opacity-50 transition-colors shadow-md hover:shadow-lg disabled:shadow-none">Finalizar</button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="hidden h-full flex-col gap-4 overflow-y-auto rounded-xl border bg-white p-4 lg:flex lg:w-1/3 shadow-sm">
                            <h3 className="border-b pb-2 font-bold text-brand-900 text-lg">Histórico de Vendas</h3>
                            {salesHistory.length === 0 ? (
                                <div className="text-center text-sm text-gray-400 py-10">Nenhuma venda registrada ainda.</div>
                            ) : (
                                salesHistory.map(sale => (
                                    <div key={sale.id} className="rounded border-b p-3 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-bold text-gray-800">{sale.buyerName || 'Cliente Balcão'}</span>
                                            <span className="text-xs text-gray-400">#{sale.id}</span>
                                        </div>
                                        <div className="text-xs text-gray-500">{new Date(sale.timestamp).toLocaleString('pt-BR')}</div>
                                        <div className="text-sm font-bold text-green-600 mt-1">{formatCurrency(sale.totalValue)}</div>
                                        <div className="flex gap-1 mt-2">
                                            <button onClick={() => sendReceiptToWhatsApp(sale)} className="flex-1 bg-green-500 text-white text-xs py-1 rounded hover:bg-green-600">📱 WhatsApp</button>
                                            <button onClick={() => startEditSale(sale)} className="flex-1 bg-blue-500 text-white text-xs py-1 rounded hover:bg-blue-600">✏️ Editar</button>
                                            <button onClick={() => deleteSale(sale.id)} className="bg-red-500 text-white text-xs py-1 px-2 rounded hover:bg-red-600">🗑️</button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {currentView === 'products' && (
                    <div className="w-full h-full p-8 flex items-center justify-center text-gray-500">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold mb-2">Base de Produtos</h2>
                            <p>Interface de gerenciamento de produtos similar ao GS.html ficaria aqui.</p>
                        </div>
                    </div>
                )}

                {currentView === 'report' && (
                    <div className="w-full h-full p-8 overflow-y-auto">
                        <div className="max-w-4xl mx-auto">
                            <h1 className="text-3xl font-bold mb-6">Relatório de Fechamento</h1>

                            <div className="bg-white rounded-xl shadow p-6 mb-6">
                                <h2 className="text-xl font-bold mb-4">Resumo Financeiro</h2>
                                {(() => {
                                    const summary = calculateSummary();
                                    return (
                                        <div className="space-y-3">
                                            <div className="flex justify-between border-b pb-2">
                                                <span>PIX:</span>
                                                <span className="font-bold">{formatCurrency(summary.pix.total)} (Líq: {formatCurrency(summary.pix.net)})</span>
                                            </div>
                                            <div className="flex justify-between border-b pb-2">
                                                <span>Dinheiro:</span>
                                                <span className="font-bold">{formatCurrency(summary.money.total)} (Líq: {formatCurrency(summary.money.net)})</span>
                                            </div>
                                            <div className="flex justify-between border-b pb-2">
                                                <span>Cartão (Cliente):</span>
                                                <span className="font-bold">{formatCurrency(summary.cardClient.total)} (Líq: {formatCurrency(summary.cardClient.net)})</span>
                                            </div>
                                            <div className="flex justify-between border-b pb-2">
                                                <span>Cartão (Loja):</span>
                                                <span className="font-bold">{formatCurrency(summary.cardGarage.total)} (Líq: {formatCurrency(summary.cardGarage.net)})</span>
                                            </div>
                                            <div className="flex justify-between font-bold text-lg pt-2 border-t-2">
                                                <span>TOTAL BRUTO:</span>
                                                <span className="text-green-600">{formatCurrency(summary.grandTotal)}</span>
                                            </div>
                                            <div className="flex justify-between text-red-600">
                                                <span>Comissões (20%):</span>
                                                <span>-{formatCurrency(summary.totalCommission)}</span>
                                            </div>
                                            <div className="flex justify-between font-bold text-xl pt-2 border-t-2">
                                                <span>LÍQUIDO:</span>
                                                <span className="text-blue-600">{formatCurrency(summary.grandTotal - summary.totalCommission)}</span>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            <div className="bg-white rounded-xl shadow p-6 mb-6">
                                <h2 className="text-xl font-bold mb-4">Ações</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <button onClick={downloadHTMLReport} className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700 transition">
                                        📄 Baixar Relatório HTML
                                    </button>
                                    <button onClick={sendReportToWhatsApp} className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-emerald-700 transition">
                                        📱 Enviar Resumo WhatsApp
                                    </button>
                                    <button onClick={() => setShowSignaturePad(true)} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition">
                                        ✍️ {signature ? 'Alterar' : 'Adicionar'} Assinatura
                                    </button>
                                </div>
                            </div>

                            {signature && (
                                <div className="bg-white rounded-xl shadow p-6">
                                    <h2 className="text-xl font-bold mb-4">Assinatura Digital</h2>
                                    <img src={signature} alt="Assinatura" className="border border-gray-300 max-w-md" />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {receiptData && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setReceiptData(null)}>
                    <div className="bg-white p-6 rounded shadow-xl max-w-sm w-full" onClick={e => e.stopPropagation()}>
                        <h3 className="font-bold text-center text-xl mb-4">Venda Registrada!</h3>
                        <div className="border my-4 p-4 text-center font-mono text-sm bg-yellow-50">
                            <p>RECIBO #{receiptData.id}</p>
                            <p className="font-bold text-xl my-2">{formatCurrency(receiptData.totalValue)}</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => sendReceiptToWhatsApp(receiptData)} className="flex-1 bg-green-500 text-white py-2 rounded">
                                📱 WhatsApp
                            </button>
                            <button onClick={() => setReceiptData(null)} className="flex-1 bg-gray-200 py-2 rounded">Fechar</button>
                        </div>
                    </div>
                </div>
            )}

            {editingSale && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditingSale(null)}>
                    <div className="bg-white p-6 rounded shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <h3 className="font-bold text-xl mb-4">Editar Venda #{editingSale.id}</h3>

                        <div className="mb-4">
                            <label className="block text-sm font-bold mb-2">Cliente</label>
                            <input
                                value={editingSale.buyerName || ''}
                                onChange={e => setEditingSale({ ...editingSale, buyerName: e.target.value })}
                                className="w-full rounded border p-2"
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-bold mb-2">Itens</label>
                            {editingSale.items.map((item, idx) => (
                                <div key={idx} className="flex gap-2 mb-2">
                                    <input
                                        value={item.desc}
                                        onChange={e => {
                                            const newItems = [...editingSale.items];
                                            newItems[idx].desc = e.target.value;
                                            setEditingSale({ ...editingSale, items: newItems });
                                        }}
                                        className="flex-1 rounded border p-2"
                                    />
                                    <input
                                        type="number"
                                        value={item.qty}
                                        onChange={e => {
                                            const newItems = [...editingSale.items];
                                            newItems[idx].qty = parseInt(e.target.value) || 1;
                                            setEditingSale({ ...editingSale, items: newItems });
                                        }}
                                        className="w-20 rounded border p-2"
                                    />
                                    <input
                                        type="number"
                                        value={item.price}
                                        onChange={e => {
                                            const newItems = [...editingSale.items];
                                            newItems[idx].price = parseFloat(e.target.value) || 0;
                                            setEditingSale({ ...editingSale, items: newItems });
                                        }}
                                        className="w-28 rounded border p-2"
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <button onClick={() => setEditingSale(null)} className="flex-1 bg-gray-200 py-2 rounded">Cancelar</button>
                            <button onClick={saveEditedSale} className="flex-1 bg-blue-600 text-white py-2 rounded">Salvar</button>
                        </div>
                    </div>
                </div>
            )}

            {showSignaturePad && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowSignaturePad(false)}>
                    <div className="bg-white p-6 rounded shadow-xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
                        <h3 className="font-bold text-xl mb-4">Assinatura Digital</h3>
                        <canvas
                            ref={signatureCanvasRef}
                            width={500}
                            height={200}
                            className="border border-gray-300 w-full cursor-crosshair"
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                        />
                        <div className="flex gap-2 mt-4">
                            <button onClick={clearSignature} className="flex-1 bg-gray-200 py-2 rounded">Limpar</button>
                            <button onClick={() => setShowSignaturePad(false)} className="flex-1 bg-gray-300 py-2 rounded">Cancelar</button>
                            <button onClick={saveSignature} className="flex-1 bg-blue-600 text-white py-2 rounded">Salvar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
