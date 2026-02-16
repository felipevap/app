"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useGarageSales } from "@/contexts/GarageSaleContext";
import { formatDate, formatCurrency } from "@/utils/formatters";

interface Item {
    productId?: string;
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
    const { garageSales, products, getProductsByGarageSale, createSale } = useGarageSales();

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
    const [pendingOrders, setPendingOrders] = useState<any[]>([]);

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
        if (selectedGarageSaleId) {
            fetch(`/api/sales?garageSaleId=${selectedGarageSaleId}`)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setSalesHistory(data);
                    }
                })
                .catch(err => console.error("Failed to fetch sales history", err));
        } else {
            setSalesHistory([]);
        }
    }, [selectedGarageSaleId]);

    useEffect(() => {
        const savedSignature = localStorage.getItem('pos_signature');
        if (savedSignature) {
            setSignature(savedSignature);
        }
    }, []);

    useEffect(() => {
        const loadPendingOrders = async () => {
            try {
                const response = await fetch(`/api/pending-orders?garageSaleId=${selectedGarageSaleId}`);
                if (response.ok) {
                    const orders = await response.json();
                    console.log('PDV - Pedidos carregados da API:', orders.length);
                    console.log('PDV - Garage Sale ID selecionado:', selectedGarageSaleId);
                    console.log('PDV - Pedidos:', orders);
                    setPendingOrders(orders);
                } else {
                    console.error('Erro ao carregar pedidos pendentes');
                    setPendingOrders([]);
                }
            } catch (error) {
                console.error('Erro ao carregar pedidos pendentes:', error);
                setPendingOrders([]);
            }
        };

        if (selectedGarageSaleId) {
            loadPendingOrders();
            const interval = setInterval(loadPendingOrders, 5000);
            return () => clearInterval(interval);
        }
    }, [selectedGarageSaleId]);

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

    const loadPendingOrder = async (order: any) => {
        setCurrentSale({
            items: order.items.map((item: any) => ({
                productId: item.productId,
                desc: item.description,
                qty: item.quantity,
                price: item.price
            })),
            payments: [],
            buyerName: order.customerName,
            buyerPhone: order.customerPhone,
            buyerEmail: order.customerEmail,
        });
        setIsCheckoutMode(true);

        try {
            await fetch(`/api/pending-orders?id=${order.id}`, {
                method: 'DELETE',
            });

            setPendingOrders(pendingOrders.filter((o: any) => o.id !== order.id));
        } catch (error) {
            console.error('Erro ao remover pedido pendente:', error);
        }
    };

    const generateReceiptText = (sale: Sale) => {
        let text = `GARAGE SALE PREMIUM\n`;
        text += `Recibo #${String(sale.id).padStart(4, '0')}\n`;
        text += `Data: ${formatDate(sale.date)}\n\n`;
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
        html += `<p><strong>Data:</strong> ${formatDate(new Date())}</p>`;
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
        const updatedItems = [...(currentSale.items || []), { ...newItem, productId: selectedProductId || undefined }];
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

    const finalizeSale = async () => {
        if (!selectedGarageSaleId) return;

        try {
            const saleData = {
                items: currentSale.items || [],
                payments: currentSale.payments || [],
                totalValue: currentSaleTotal,
                buyerName: currentSale.buyerName,
                buyerPhone: currentSale.buyerPhone,
                buyerEmail: currentSale.buyerEmail,
                garageSaleId: selectedGarageSaleId,
            };

            const newSale = await createSale(saleData);

            // Refresh sales history
            const res = await fetch(`/api/sales?garageSaleId=${selectedGarageSaleId}`);
            if (res.ok) {
                const data = await res.json();
                setSalesHistory(data);
            }

            setReceiptData(newSale);
            setCurrentSale({ items: [], payments: [], buyerName: "", buyerPhone: "", buyerEmail: "" });
            setIsCheckoutMode(false);
            setSelectedProductId(null);
            alert("Venda Finalizada com Sucesso!");
        } catch (error) {
            console.error("Erro ao finalizar venda:", error);
            alert("Erro ao finalizar venda. Tente novamente.");
        }
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
                                // Need to count sales from API loaded history
                                // For now, we can just show sales count if available in history or skip it for performance
                                const salesCount = salesHistory.filter(s => s.garageSaleId === gs.id).length;
                                // Warning: if salesHistory is current GS only, this count might be wrong for others.
                                // But since we select a GS, we only fetch history for one.
                                // So "salesCount" here in the selection screen creates a paradox: we haven't fetched sales for all GS yet.
                                // We can either fetch all sales or just show "-" for now.
                                // Let's show "-" to avoid complexity of fetching all.

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
                                                    {formatDate(gs.dataInicio)}
                                                    {gs.dataFim && ` - ${formatDate(gs.dataFim)}`}
                                                </p>
                                            </div>
                                            <div className="text-3xl">🏪</div>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-600">Produtos:</span>
                                                <span className="font-bold text-blue-600">{productCount}</span>
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
                            <div className="rounded-xl border border-orange-200 bg-orange-50 shadow-sm p-4">
                                <h3 className="font-bold text-orange-800 mb-3 flex items-center gap-2">
                                    <span className="text-xl">📱</span> Pedidos do App ({pendingOrders.length})
                                </h3>
                                {pendingOrders.length === 0 ? (
                                    <div className="text-center text-orange-600 py-4 text-sm">
                                        Nenhum pedido pendente. Os pedidos feitos pelo app de captura aparecerão aqui.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {pendingOrders.map((order: any) => (
                                            <div key={order.id} className="bg-white rounded-lg p-3 border border-orange-200">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <div className="font-bold text-gray-800">{order.customerName}</div>
                                                        <div className="text-sm text-gray-600">{order.customerPhone}</div>
                                                        <div className="text-xs text-gray-500">{order.customerEmail}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-bold text-orange-600">{formatCurrency(order.total)}</div>
                                                        <div className="text-xs text-gray-500">{order.items.length} {order.items.length === 1 ? 'item' : 'itens'}</div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => loadPendingOrder(order)}
                                                    className="w-full bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 transition-colors font-medium text-sm"
                                                >
                                                    Processar Pagamento
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
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
                                                        Restante: {formatCurrency(remainingAmount)}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={finalizeSale}
                                                    disabled={remainingAmount > 0.01}
                                                    className="w-full rounded bg-green-600 px-6 py-4 font-bold text-white hover:bg-green-700 disabled:opacity-50 transition-colors shadow-md hover:shadow-lg disabled:shadow-none"
                                                >
                                                    Confirmar Pagamento
                                                </button>
                                                <button
                                                    onClick={() => setIsCheckoutMode(false)}
                                                    className="mt-2 w-full rounded border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                                                >
                                                    Voltar
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="hidden flex-col gap-4 lg:flex lg:w-1/3">
                            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm h-full overflow-hidden flex flex-col">
                                <h3 className="mb-4 font-bold text-gray-700">Histórico de Vendas</h3>
                                <div className="flex-grow overflow-y-auto space-y-3 pr-2">
                                    {filteredSalesHistory.length === 0 ? (
                                        <p className="text-center text-sm text-gray-500 py-4">Nenhuma venda registrada hoje</p>
                                    ) : (
                                        filteredSalesHistory.slice().reverse().map(sale => (
                                            <div key={sale.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm hover:shadow-md transition-shadow">
                                                <div className="flex justify-between font-bold text-gray-700">
                                                    <span>#{String(sale.id).padStart(4, '0')}</span>
                                                    <span>{formatCurrency(sale.totalValue)}</span>
                                                </div>
                                                <div className="mb-2 text-xs text-gray-500">
                                                    {new Date(sale.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                    {sale.buyerName && ` - ${sale.buyerName}`}
                                                </div>
                                                <div className="flex flex-wrap gap-1 mb-2">
                                                    {sale.payments.map((p, i) => (
                                                        <span key={i} className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                                                            {getPaymentLabel(p.method)}
                                                        </span>
                                                    ))}
                                                </div>
                                                <div className="flex gap-2 mt-2 pt-2 border-t border-gray-200">
                                                    <button
                                                        onClick={() => setReceiptData(sale)}
                                                        className="flex-1 rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100 transition-colors"
                                                    >
                                                        Recibo
                                                    </button>
                                                    <button
                                                        onClick={() => sendReceiptToWhatsApp(sale)}
                                                        className="flex-1 rounded border border-green-200 bg-green-50 px-2 py-1 text-xs text-green-700 hover:bg-green-100 transition-colors"
                                                    >
                                                        WhatsApp
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {currentView === 'products' && (
                    <div className="h-full w-full overflow-y-auto p-4">
                        <div className="mx-auto max-w-6xl">
                            <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                                <h2 className="mb-4 text-lg font-bold text-gray-700">Filtros</h2>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
                                    <input
                                        placeholder="Buscar..."
                                        value={productFilters.search}
                                        onChange={e => setProductFilters({ ...productFilters, search: e.target.value })}
                                        className="rounded border p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                    <select
                                        value={productFilters.category}
                                        onChange={e => setProductFilters({ ...productFilters, category: e.target.value })}
                                        className="rounded border p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="">Todas Categorias</option>
                                        {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <select
                                        value={productFilters.condition}
                                        onChange={e => setProductFilters({ ...productFilters, condition: e.target.value })}
                                        className="rounded border p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="">Todas Condições</option>
                                        {uniqueConditions.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <div className="flex gap-2">
                                        <input
                                            placeholder="Min R$"
                                            type="number"
                                            value={productFilters.minPrice}
                                            onChange={e => setProductFilters({ ...productFilters, minPrice: e.target.value })}
                                            className="w-1/2 rounded border p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                        <input
                                            placeholder="Max R$"
                                            type="number"
                                            value={productFilters.maxPrice}
                                            onChange={e => setProductFilters({ ...productFilters, maxPrice: e.target.value })}
                                            className="w-1/2 rounded border p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    <button
                                        onClick={() => setProductFilters({ search: "", category: "", condition: "", minPrice: "", maxPrice: "" })}
                                        className="rounded bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors"
                                    >
                                        Limpar
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                                {filteredProducts.map(product => (
                                    <div key={product.id} className="group relative flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md">
                                        <div className="relative aspect-square bg-gray-100">
                                            {product.imagens[0] ? (
                                                <img src={product.imagens[0]} alt={product.nome} className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="flex h-full items-center justify-center text-gray-300 text-4xl">📷</div>
                                            )}
                                            <div className="absolute top-2 right-2 rounded-full bg-white/90 px-2 py-1 text-xs font-bold text-gray-700 shadow-sm">
                                                {formatCurrency(product.preco)}
                                            </div>
                                            {product.status === 'vendido' && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 font-bold text-white">VENDIDO</div>
                                            )}
                                        </div>
                                        <div className="flex flex-grow flex-col p-3">
                                            <h3 className="line-clamp-2 text-sm font-medium text-gray-800">{product.nome}</h3>
                                            <div className="mt-auto pt-2 text-xs text-gray-500">{product.categoria}</div>
                                            <button
                                                onClick={() => {
                                                    selectProduct(product);
                                                    setCurrentView('sales');
                                                }}
                                                disabled={product.status !== 'disponível'}
                                                className="mt-2 w-full rounded bg-blue-50 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                Adicionar
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {currentView === 'report' && (
                    <div className="h-full w-full overflow-y-auto p-4">
                        <div className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                            <h2 className="mb-6 text-center text-2xl font-bold text-gray-800">Relatório de Fechamento</h2>

                            <div className="mb-6 space-y-4">
                                <div className="rounded-lg bg-gray-50 p-4">
                                    <h3 className="mb-2 font-bold text-gray-700">Resumo por Método</h3>
                                    {Object.entries(calculateSummary()).slice(0, 4).map(([key, val]: [string, any]) => (
                                        <div key={key} className="flex justify-between border-b border-gray-200 py-2 last:border-0">
                                            <span className="capitalize text-gray-600">{getPaymentLabel(key)}</span>
                                            <div className="text-right">
                                                <div className="font-semibold">{formatCurrency(val.total)}</div>
                                                <div className="text-xs text-gray-400">Líq: {formatCurrency(val.net)}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="rounded-lg bg-blue-50 p-4">
                                    <div className="flex justify-between text-lg font-bold text-blue-800">
                                        <span>Total Bruto</span>
                                        <span>{formatCurrency(calculateSummary().grandTotal)}</span>
                                    </div>
                                    <div className="mt-1 flex justify-between text-sm text-red-600">
                                        <span>Comissões (20%)</span>
                                        <span>-{formatCurrency(calculateSummary().totalCommission)}</span>
                                    </div>
                                    <div className="mt-2 flex justify-between border-t border-blue-200 pt-2 text-xl font-bold text-green-700">
                                        <span>Líquido</span>
                                        <span>{formatCurrency(calculateSummary().grandTotal - calculateSummary().totalCommission)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-6">
                                <h3 className="mb-2 font-bold text-gray-700">Assinatura do Responsável</h3>
                                {signature ? (
                                    <div className="relative rounded border border-gray-300 bg-gray-50 p-4">
                                        <img src={signature} alt="Assinatura" className="mx-auto h-32 object-contain" />
                                        <button
                                            onClick={() => {
                                                setSignature(null);
                                                localStorage.removeItem('pos_signature');
                                            }}
                                            className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowSignaturePad(true)}
                                        className="w-full rounded border-2 border-dashed border-gray-300 py-8 text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors"
                                    >
                                        Toque para assinar
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={downloadHTMLReport}
                                    className="rounded bg-gray-800 px-4 py-3 font-bold text-white hover:bg-gray-900 transition-colors"
                                >
                                    Salvar HTML
                                </button>
                                <button
                                    onClick={sendReportToWhatsApp}
                                    className="rounded bg-green-600 px-4 py-3 font-bold text-white hover:bg-green-700 transition-colors"
                                >
                                    Enviar WhatsApp
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {receiptData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="mb-4 text-center">
                            <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl text-green-600">
                                ✓
                            </div>
                            <h2 className="text-xl font-bold text-gray-800">Venda Concluída!</h2>
                        </div>
                        <div className="mb-6 rounded-lg bg-gray-50 p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                            {generateReceiptText(receiptData)}
                        </div>
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => sendReceiptToWhatsApp(receiptData)}
                                className="w-full rounded bg-green-600 px-4 py-3 font-bold text-white hover:bg-green-700 transition-colors"
                            >
                                Enviar no WhatsApp
                            </button>
                            <button
                                onClick={() => setReceiptData(null)}
                                className="w-full rounded border border-gray-300 px-4 py-3 font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showSignaturePad && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-white rounded-xl overflow-hidden shadow-2xl">
                        <div className="flex justify-between items-center bg-gray-100 px-4 py-3 border-b">
                            <h3 className="font-bold text-gray-700">Assinatura</h3>
                            <button onClick={clearSignature} className="text-sm text-blue-600 font-bold px-2 py-1 rounded hover:bg-blue-50">Limpar</button>
                        </div>
                        <div className="p-4 bg-white">
                            <canvas
                                ref={signatureCanvasRef}
                                width={400}
                                height={200}
                                className="w-full h-48 border border-gray-300 rounded touch-none bg-white cursor-crosshair"
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={stopDrawing}
                                onMouseLeave={stopDrawing}
                                onTouchStart={startDrawing}
                                onTouchMove={draw}
                                onTouchEnd={stopDrawing}
                            />
                        </div>
                        <div className="flex gap-2 p-4 border-t bg-gray-50">
                            <button onClick={() => setShowSignaturePad(false)} className="flex-1 rounded border border-gray-300 py-2 font-bold text-gray-600 hover:bg-gray-100">Cancelar</button>
                            <button onClick={saveSignature} className="flex-1 rounded bg-blue-600 py-2 font-bold text-white hover:bg-blue-700">Salvar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

