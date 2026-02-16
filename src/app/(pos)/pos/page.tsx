"use client";

import Link from "next/link"; // Added import

export default function POSPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col">
            <header className="p-4 border-b border-slate-800 flex justify-between items-center"> // Added flex
                <h1 className="text-xl font-bold text-blue-400">GS POS</h1>
                <Link href="/" className="text-sm text-gray-400 hover:text-white">Home</Link> // Added Home link
            </header>

            <main className="flex-1 flex flex-col p-4">
                {/* Scanner Area */}
                <div className="flex-1 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden relative">
                    <div className="absolute inset-0 bg-[linear-gradient(transparent_0%,rgba(59,130,246,0.1)_50%,transparent_100%)] animate-scan" style={{ backgroundSize: '100% 200%' }}></div>
                    <div className="text-center z-10">
                        <span className="text-6xl mb-4 block">🔍</span>
                        <p className="text-slate-400">Scan QR Code or Barcode</p>
                    </div>
                </div>

                {/* Manual Entry */}
                <div className="mt-4">
                    <input
                        type="text"
                        placeholder="Or type product code..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </main>

            {/* Cart Summary (Fixed Bottom) */}
            <footer className="bg-slate-900 border-t border-slate-800 p-4 pb-8">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-slate-400">Total Items: 0</span>
                    <span className="text-2xl font-bold">R$ 0.00</span>
                </div>
                <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/20 active:scale-95 transition-all">
                    Process Payment
                </button>
            </footer>
        </div>
    );
}
