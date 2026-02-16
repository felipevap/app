"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

// Types
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
    // State
    const [currentView, setCurrentView] = useState<'sales' | 'products' | 'report'>('sales');
    const [isCheckoutMode, setIsCheckoutMode] = useState(false);
    const [currentSale, setCurrentSale] = useState<Partial<Sale>>({
        items: [],
        payments: [],
        buyerName: "",
        buyerPhone: "",
        buyerEmail: "",
    });

    // New Item Input State
    const [newItem, setNewItem] = useState<Item>({ desc: "", qty: 1, price: 0 });
    const [tempPayment, setTempPayment] = useState<Payment>({ method: "pix", amount: 0 });

    // Mock Database (would be loaded from backend/localstorage)
    const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
    const [itemDatabase, setItemDatabase] = useState<Item[]>([
        { desc: 'Camiseta', price: 20, qty: 0 }, { desc: 'Calca Jeans', price: 50, qty: 0 },
        { desc: 'Vestido', price: 60, qty: 0 }, { desc: 'Sapato', price: 40, qty: 0 }
    ]);

    // Check for pending cart import on load
    useEffect(() => {
        const pendingCart = localStorage.getItem('pending_cart');
        if (pendingCart) {
            try {
                const items = JSON.parse(pendingCart);
                if (Array.isArray(items) && items.length > 0) {
                    setCurrentSale(prev => ({
                        ...prev,
                        items: [...(prev.items || []), ...items]
                    }));
                    // Clear it so it doesn't re-import on refresh
                    localStorage.removeItem('pending_cart');
                    // alert("Items imported from Capture App!");
                }
            } catch (e) {
                console.error("Failed to parse pending items", e);
            }
        }
    }, []);

    // Derived State
    const currentSaleTotal = currentSale.items?.reduce((acc, item) => acc + (item.price * item.qty), 0) || 0;
    const currentPaymentsTotal = currentSale.payments?.reduce((acc, p) => acc + p.amount, 0) || 0;
    const remainingAmount = currentSaleTotal - currentPaymentsTotal;

    // Handlers
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
        if (remainingAmount > 0.01) {
            alert("Pagamento incompleto!");
            return;
        }

        const newSale: Sale = {
            id: salesHistory.length + 1,
            items: currentSale.items!,
            payments: currentSale.payments!,
            totalValue: currentSaleTotal,
            date: new Date().toLocaleDateString(),
            timestamp: new Date().toLocaleTimeString(),
            buyerName: currentSale.buyerName,
            buyerPhone: currentSale.buyerPhone,
            buyerEmail: currentSale.buyerEmail,
        };

        setSalesHistory([newSale, ...salesHistory]);

        // Reset
        setCurrentSale({ items: [], payments: [], buyerName: "", buyerPhone: "", buyerEmail: "" });
        setIsCheckoutMode(false);
        alert("Venda Finalizada com Sucesso!");
    };

    const importCartFromCapture = () => {
        // Simulation of importing from Capture module
        // In a real app, this might read from a shared context, URL param, or database
        const capturedItem = { desc: "Imported Item (Capture)", qty: 1, price: 150.00 };
        const updatedItems = [...(currentSale.items || []), capturedItem];
        setCurrentSale({ ...currentSale, items: updatedItems });
        alert("Cart imported successfully from Capture module!");
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    return (
        <div className="flex h-screen flex-col bg-gray-100 text-slate-800 font-sans">
            {/* Header */}
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

                <div className="w-8">
                    {/* Placeholder for backup icon / extra options */}
                </div>
            </header>

            {/* Main Content */}
            <main className="flex flex-grow overflow-hidden relative">

                {/* Sales View */}
                {currentView === 'sales' && (
                    <div className="flex h-full w-full gap-4 p-4">

                        {/* Left Column: Current Sale */}
                        <div className="flex w-full flex-col gap-4 overflow-y-auto lg:w-2/3">
                            <div className="flex flex-grow flex-col rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                                <div className="flex items-center justify-between border-b bg-gray-50 p-4 rounded-t-xl">
                                    <h2 className="font-bold text-gray-700">{isCheckoutMode ? 'Pagamento' : 'Novo Pedido'}</h2>
                                    <div className="flex gap-2">
                                        <button onClick={importCartFromCapture} className="text-xs font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-full border border-purple-100 hover:bg-purple-100 transition-colors">
                                            Import from Capture
                                        </button>
                                        <button onClick={() => setCurrentSale({ items: [], payments: [] })} className="text-xs text-red-500 bg-red-50 px-3 py-1 rounded-full hover:bg-red-100 transition-colors">
                                            Limpar
                                        </button>
                                    </div>
                                </div>

                                {/* Customer Info */}
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

                                {/* Items List */}
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

                                {/* Footer Controls */}
                                <div className="rounded-b-xl border-t bg-gray-50 p-4">
                                    {!isCheckoutMode ? (
                                        <>
                                            {/* Add Item Form */}
                                            <div className="mb-4 flex gap-2">
                                                <input
                                                    value={newItem.desc}
                                                    onChange={e => setNewItem({ ...newItem, desc: e.target.value })}
                                                    className="flex-grow rounded border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                                                    placeholder="Item description"
                                                    list="common-items"
                                                />
                                                <datalist id="common-items">
                                                    {itemDatabase.map((item, i) => (
                                                        <option key={i} value={item.desc} />
                                                    ))}
                                                </datalist>
                                                <input
                                                    type="number"
                                                    value={newItem.qty}
                                                    onChange={e => setNewItem({ ...newItem, qty: parseInt(e.target.value) || 1 })}
                                                    className="w-20 rounded border border-gray-300 p-2 text-center focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                                                    placeholder="Qty"
                                                />
                                                <input
                                                    type="number"
                                                    value={newItem.price}
                                                    onChange={e => setNewItem({ ...newItem, price: parseFloat(e.target.value) || 0 })}
                                                    className="w-24 rounded border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                                                    placeholder="R$"
                                                />
                                                <button onClick={addItem} className="rounded bg-gray-800 px-4 text-white hover:bg-black transition-colors">
                                                    <span className="text-xl font-bold">+</span>
                                                </button>
                                            </div>

                                            <div className="flex items-center justify-between pt-2">
                                                <div className="text-3xl font-bold text-gray-800">{formatCurrency(currentSaleTotal)}</div>
                                                <button
                                                    onClick={() => setIsCheckoutMode(true)}
                                                    disabled={currentSale.items!.length === 0}
                                                    className="rounded bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-md hover:shadow-lg disabled:shadow-none"
                                                >
                                                    Checkout &rarr;
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        /* Checkout Mode */
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Payments</label>
                                                <div className="mb-2 flex gap-2 mt-1">
                                                    <select
                                                        value={tempPayment.method}
                                                        onChange={e => setTempPayment({ ...tempPayment, method: e.target.value })}
                                                        className="w-1/3 rounded border p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                    >
                                                        <option value="pix">PIX</option>
                                                        <option value="money">Cash</option>
                                                        <option value="card_client">Card (Cli)</option>
                                                        <option value="card_garage">Card (Shop)</option>
                                                    </select>
                                                    <input
                                                        type="number"
                                                        value={tempPayment.amount}
                                                        onChange={e => setTempPayment({ ...tempPayment, amount: parseFloat(e.target.value) || 0 })}
                                                        className="w-1/3 rounded border p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                        placeholder="Val"
                                                    />
                                                    <button onClick={addPayment} className="w-1/3 rounded bg-blue-100 p-2 text-sm text-blue-700 font-bold hover:bg-blue-200 transition-colors">Add</button>
                                                </div>
                                                <ul className="space-y-1 text-sm">
                                                    {currentSale.payments!.map((p, i) => (
                                                        <li key={i} className="flex justify-between rounded border bg-white p-2">
                                                            <span>{p.method.toUpperCase()}</span>
                                                            <span className="flex items-center gap-2">
                                                                {formatCurrency(p.amount)}
                                                                <button onClick={() => removePayment(i)} className="text-red-500 font-bold">×</button>
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div className="flex flex-col justify-between">
                                                <div className="mb-2 text-right">
                                                    <div className="text-xs text-gray-500">Total: {formatCurrency(currentSaleTotal)}</div>
                                                    <div className={`text-xl font-bold ${remainingAmount > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                                                        {remainingAmount > 0.01 ? 'Remaining: ' : 'Change: '} {formatCurrency(Math.abs(remainingAmount))}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => setIsCheckoutMode(false)} className="flex-1 rounded bg-gray-200 py-3 font-bold text-gray-700 hover:bg-gray-300 transition-colors">Back</button>
                                                    <button onClick={finalizeSale} disabled={remainingAmount > 0.01} className="flex-[2] rounded bg-green-600 py-3 font-bold text-white hover:bg-green-700 disabled:opacity-50 transition-colors shadow-md hover:shadow-lg disabled:shadow-none">Finalize</button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column: History */}
                        <div className="hidden h-full flex-col gap-4 overflow-y-auto rounded-xl border bg-white p-4 lg:flex lg:w-1/3 shadow-sm">
                            <h3 className="border-b pb-2 font-bold text-brand-900 text-lg">Sales History</h3>
                            {salesHistory.length === 0 ? (
                                <div className="text-center text-sm text-gray-400 py-10">No sales recorded yet.</div>
                            ) : (
                                salesHistory.map(sale => (
                                    <div key={sale.id} className="rounded border-b p-3 hover:bg-gray-50 transition-colors">
                                        <div className="flex justify-between mb-1">
                                            <span className="text-sm font-bold text-gray-800">{sale.buyerName || 'Counter Client'}</span>
                                            <span className="text-xs text-gray-400">#{sale.id}</span>
                                        </div>
                                        <div className="text-xs text-gray-500">{sale.timestamp}</div>
                                        <div className="mt-2 text-right text-sm font-bold text-green-700">
                                            {formatCurrency(sale.totalValue)}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Placeholder for Products View */}
                {currentView === 'products' && (
                    <div className="w-full h-full p-8 flex items-center justify-center text-gray-500">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold mb-2">Products Database</h2>
                            <p>Product management interface similar to GS.html would go here.</p>
                        </div>
                    </div>
                )}

                {/* Placeholder for Reports View */}
                {currentView === 'report' && (
                    <div className="w-full h-full p-8 flex items-center justify-center text-gray-500">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold mb-2">Closing Report</h2>
                            <p>Financial summary and signature pad interface.</p>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}
