"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useGarageSales } from "@/contexts/GarageSaleContext";

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
    garageSaleId?: string;
}

export default function POSPage() {
    const { garageSales, products, getProductsByGarageSale, updateProduct } = useGarageSales();

    const [selectedGarageSaleId, setSelectedGarageSaleId] = useState<string>("");
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
    const [emailError, setEmailError] = useState<string>("");
    const [showProductSuggestions, setShowProductSuggestions] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
    const [discountPercent, setDiscountPercent] = useState<number>(0);

    const [productFilters, setProductFilters] = useState({
        search: "",
        category: "",
        condition: "",
        minPrice: "",
        maxPrice: ""
    });

    const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        if (garageSales.length > 0 && !selectedGarageSaleId) {
            const mostRecent = garageSales.reduce((latest, gs) =>
                gs.criadoEm > latest.criadoEm ? gs : latest
            );
            setSelectedGarageSaleId(mostRecent.id);
        }
    }, [garageSales, selectedGarageSaleId]);

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

    if (!selectedGarageSaleId && garageSales.length > 0) {
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
                </header>

                <main className="flex-grow flex items-center justify-center p-8">
                    <div className="max-w-4xl w-full">
                        <div className="text-center mb-8">
                            <h1 className="text-4xl font-bold text-gray-800 mb-2">Ponto de Venda (PDV)</h1>
                            <p className="text-gray-600">Selecione o evento para iniciar as vendas</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {garageSales.map(gs => {
                                const productCount = getProductsByGarageSale(gs.id).length;
                                const salesCount = salesHistory.filter(s => s.garageSaleId === gs.id).length;

                                return (
                                    <button
                                        key={gs.id}
                                        onClick={() => setSelectedGarageSaleId(gs.id)}
                                        className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-6 text-left border-2 border-transparent hover:border-blue-500"
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex-1">
                                                <h3 className="font-bold text-xl text-gray-800 mb-1">{gs.nome}</h3>
                                                <p className="text-sm text-gray-500">
                                                    {new Date(gs.dataInicio).toLocaleDateString('pt-BR')}
                                                    {gs.dataFim && ` - ${new Date(gs.dataFim).toLocaleDateString('pt-BR')}`}
                                                </p>
                                            </div>
                                            <div className="text-3xl">🏪</div>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-600">Produtos:</span>
                                                <span className="font-bold text-blue-600">{productCount}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-600">Vendas:</span>
                                                <span className="font-bold text-green-600">{salesCount}</span>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-gray-200">
                                            <div className="text-sm text-gray-600 flex items-center gap-2">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                {gs.endereco}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    if (garageSales.length === 0) {
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
                </header>

                <main className="flex-grow flex items-center justify-center p-8">
                    <div className="text-center">
                        <div className="text-6xl mb-4">🏪</div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Nenhum Evento Cadastrado</h2>
                        <p className="text-gray-600 mb-6">Crie um evento no gerenciador para usar o PDV</p>
                        <Link
                            href="/admin/garage-sales/new"
                            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-lg transition-colors"
                        >
                            Criar Evento
                        </Link>
                    </div>
                </main>
            </div>
        );
    }

    const saveSalesToLocal = (sales: Sale[]) => {
        localStorage.setItem('pos_sales_history', JSON.stringify(sales));
    };

    const currentSaleSubtotal = currentSale.items?.reduce((acc, item) => acc + (item.price * item.qty), 0) || 0;
    const currentSaleDiscount = (currentSaleSubtotal * discountPercent) / 100;
    const currentSaleTotal = currentSaleSubtotal - currentSaleDiscount;
    const currentPaymentsTotal = currentSale.payments?.reduce((acc, p) => acc + p.amount, 0) || 0;
    const remainingAmount = currentSaleTotal - currentPaymentsTotal;

    const availableProducts = getProductsByGarageSale(selectedGarageSaleId).filter(p => p.status === 'disponível');
    const filteredSuggestions = availableProducts.filter(p =>
        newItem.desc && p.nome.toLowerCase().includes(newItem.desc.toLowerCase())
    );

    const filteredSalesHistory = salesHistory.filter(sale =>
        !selectedGarageSaleId || sale.garageSaleId === selectedGarageSaleId
    );

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

    const maskPhone = (value: string) => {
        return value
            .replace(/\D/g, '')
            .replace(/(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{5})(\d)/, '$1-$2')
            .replace(/(-\d{4})\d+?$/, '$1');
    };

    const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
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
        filteredSalesHistory.forEach(sale => {
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

        filteredSalesHistory.forEach(sale => {
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
        setSelectedProductId(null);
        setShowProductSuggestions(false);
    };

    const selectProduct = (product: any) => {
        setNewItem({ desc: product.nome, qty: 1, price: product.preco });
        setSelectedProductId(product.id);
        setShowProductSuggestions(false);
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

    const goToCheckout = () => {
        setIsCheckoutMode(true);
        setTempPayment({ method: "pix", amount: currentSaleTotal });
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
            garageSaleId: selectedGarageSaleId,
        };

        const updatedHistory = [...salesHistory, newSale];
        setSalesHistory(updatedHistory);
        saveSalesToLocal(updatedHistory);

        (currentSale.items || []).forEach(item => {
            const matchingProduct = getProductsByGarageSale(selectedGarageSaleId).find(
                p => p.nome === item.desc && p.preco === item.price && p.status === 'disponível'
            );
            if (matchingProduct) {
                updateProduct(matchingProduct.id, { status: 'vendido' });
            }
        });

        setReceiptData(newSale);
        setCurrentSale({ items: [], payments: [], buyerName: "", buyerPhone: "", buyerEmail: "" });
        setIsCheckoutMode(false);
        setSelectedProductId(null);
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
        setEmailError("");
    };

    const saveEditedSale = () => {
        if (!editingSale) return;

        if (editingSale.buyerEmail && !validateEmail(editingSale.buyerEmail)) {
            setEmailError("Email inválido");
            return;
        }

        const updatedHistory = salesHistory.map(s => s.id === editingSale.id ? editingSale : s);
        setSalesHistory(updatedHistory);
        saveSalesToLocal(updatedHistory);
        setEditingSale(null);
        setEmailError("");
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

    const filteredProducts = getProductsByGarageSale(selectedGarageSaleId).filter(product => {
        const matchesSearch = !productFilters.search ||
            product.nome.toLowerCase().includes(productFilters.search.toLowerCase()) ||
            product.descricao.toLowerCase().includes(productFilters.search.toLowerCase());

        const matchesCategory = !productFilters.category || product.categoria === productFilters.category;
        const matchesCondition = !productFilters.condition || product.condicao === productFilters.condition;

        const matchesMinPrice = !productFilters.minPrice || product.preco >= parseFloat(productFilters.minPrice);
        const matchesMaxPrice = !productFilters.maxPrice || product.preco <= parseFloat(productFilters.maxPrice);

        return matchesSearch && matchesCategory && matchesCondition && matchesMinPrice && matchesMaxPrice;
    });

    const uniqueCategories = Array.from(new Set(products.map(p => p.categoria)));
    const uniqueConditions = Array.from(new Set(products.map(p => p.condicao)));

    return (
        <div className="flex h-screen flex-col bg-gray-100 text-slate-800 font-sans">
            <header className="flex h-16 items-center justify-between border-b bg-white px-4 shadow-sm">
                <div className="flex items-center gap-4">
                    <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600 text-sm font-bold text-white">
                            GS
                        </div>
                        <span className="hidden font-bold sm:block">Garage Sale</span>
                    </Link>

                    {garageSales.length > 0 && (
                        <select
                            value={selectedGarageSaleId}
                            onChange={(e) => setSelectedGarageSaleId(e.target.value)}
                            className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            {garageSales.map(gs => (
                                <option key={gs.id} value={gs.id}>{gs.nome}</option>
                            ))}
                        </select>
                    )}
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
                                        onChange={e => setCurrentSale({ ...currentSale, buyerPhone: maskPhone(e.target.value) })}
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
                                            <div className="mb-4 flex gap-2 relative">
                                                <div className="flex-grow relative">
                                                    <input
                                                        type="text"
                                                        value={newItem.desc}
                                                        onChange={e => {
                                                            setNewItem({ ...newItem, desc: e.target.value });
                                                            setShowProductSuggestions(e.target.value.length > 0);
                                                        }}
                                                        onFocus={() => newItem.desc && setShowProductSuggestions(true)}
                                                        className="w-full rounded border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                                                        placeholder="Descrição do item (digite para buscar produtos)"
                                                    />
                                                    {showProductSuggestions && filteredSuggestions.length > 0 && (
                                                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                                            {filteredSuggestions.map(product => (
                                                                <button
                                                                    key={product.id}
                                                                    type="button"
                                                                    onClick={() => selectProduct(product)}
                                                                    className="w-full text-left p-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
                                                                >
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex-1">
                                                                            <div className="font-semibold text-gray-800">{product.nome}</div>
                                                                            <div className="text-sm text-gray-500">{product.categoria}</div>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <div className="font-bold text-blue-600">{formatCurrency(product.preco)}</div>
                                                                            <div className="text-xs text-green-600">✓ Disponível</div>
                                                                        </div>
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
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
                                            <div className="space-y-2 border-t border-gray-200 pt-3">
                                                <div className="flex items-center justify-between text-sm text-gray-600">
                                                    <span>Subtotal:</span>
                                                    <span className="font-semibold">{formatCurrency(currentSaleSubtotal)}</span>
                                                </div>
                                                <div className="flex items-center justify-between gap-2">
                                                    <label className="text-sm text-gray-600">Desconto (%):</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={discountPercent || ''}
                                                        onChange={e => setDiscountPercent(parseFloat(e.target.value) || 0)}
                                                        className="w-20 rounded border border-gray-300 p-1 text-center text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                        placeholder="0"
                                                    />
                                                </div>
                                                {discountPercent > 0 && (
                                                    <div className="flex items-center justify-between text-sm text-red-600">
                                                        <span>Desconto ({discountPercent}%):</span>
                                                        <span className="font-semibold">-{formatCurrency(currentSaleDiscount)}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center justify-between pt-2 border-t border-gray-300">
                                                    <div className="text-xl font-bold text-gray-700">Total:</div>
                                                    <div className="text-xl font-bold text-gray-700">{formatCurrency(currentSaleTotal)}</div>
                                                </div>
                                            </div>
                                            <div className="flex justify-end pt-2">
                                                <button
                                                    onClick={goToCheckout}
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
                            {filteredSalesHistory.length === 0 ? (
                                <div className="text-center text-sm text-gray-400 py-10">Nenhuma venda registrada ainda.</div>
                            ) : (
                                filteredSalesHistory.map(sale => (
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
                                            <button onClick={() => deleteSale(sale.id)} className="bg-red-500 text-white text-xs py-1 px-2 rounded hover:bg-red-600" title="Excluir">❌</button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {currentView === 'products' && (
                    <div className="w-full h-full p-8 overflow-y-auto">
                        <div className="max-w-6xl mx-auto">
                            <h1 className="text-3xl font-bold mb-6">Produtos Cadastrados</h1>

                            <div className="bg-white rounded-xl shadow p-4 mb-6">
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                    <input
                                        type="text"
                                        placeholder="Buscar por nome ou descrição..."
                                        value={productFilters.search}
                                        onChange={e => setProductFilters({ ...productFilters, search: e.target.value })}
                                        className="md:col-span-2 rounded border p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                    <select
                                        value={productFilters.category}
                                        onChange={e => setProductFilters({ ...productFilters, category: e.target.value })}
                                        className="rounded border p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="">Todas Categorias</option>
                                        {uniqueCategories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={productFilters.condition}
                                        onChange={e => setProductFilters({ ...productFilters, condition: e.target.value })}
                                        className="rounded border p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="">Todas Condições</option>
                                        {uniqueConditions.map(cond => (
                                            <option key={cond} value={cond}>{cond}</option>
                                        ))}
                                    </select>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            placeholder="Preço mín"
                                            value={productFilters.minPrice}
                                            onChange={e => setProductFilters({ ...productFilters, minPrice: e.target.value })}
                                            className="w-1/2 rounded border p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                        <input
                                            type="number"
                                            placeholder="Preço máx"
                                            value={productFilters.maxPrice}
                                            onChange={e => setProductFilters({ ...productFilters, maxPrice: e.target.value })}
                                            className="w-1/2 rounded border p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {filteredProducts.length === 0 ? (
                                <div className="text-center text-gray-500 py-10">
                                    <p className="text-lg">Nenhum produto encontrado</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredProducts.map(product => (
                                        <div key={product.id} className="bg-white rounded-xl shadow hover:shadow-lg transition-shadow overflow-hidden">
                                            {product.imagens && product.imagens.length > 0 && (
                                                <img src={product.imagens[0]} alt={product.nome} className="w-full h-48 object-cover" />
                                            )}
                                            <div className="p-4">
                                                <h3 className="font-bold text-lg mb-2">{product.nome}</h3>
                                                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{product.descricao}</p>
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{product.categoria}</span>
                                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">{product.condicao}</span>
                                                </div>
                                                <div className="text-xl font-bold text-green-600">{formatCurrency(product.preco)}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
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
                            <label className="block text-sm font-bold mb-2">Telefone</label>
                            <input
                                value={editingSale.buyerPhone || ''}
                                onChange={e => setEditingSale({ ...editingSale, buyerPhone: maskPhone(e.target.value) })}
                                className="w-full rounded border p-2"
                                placeholder="(00) 00000-0000"
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-bold mb-2">Email</label>
                            <input
                                type="email"
                                value={editingSale.buyerEmail || ''}
                                onChange={e => {
                                    setEditingSale({ ...editingSale, buyerEmail: e.target.value });
                                    setEmailError("");
                                }}
                                className={`w-full rounded border p-2 ${emailError ? 'border-red-500' : ''}`}
                                placeholder="email@exemplo.com"
                            />
                            {emailError && <p className="text-red-500 text-sm mt-1">{emailError}</p>}
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
