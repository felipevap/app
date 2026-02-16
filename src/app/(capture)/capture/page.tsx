"use client";

import { useState } from "react";
import Link from "next/link";

export default function CapturePage() {
    const [productName, setProductName] = useState("");
    const [price, setPrice] = useState("");
    const [category, setCategory] = useState("clothing");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        alert(`Product Captured: ${productName} - R$ ${price}`);
        // Reset form
        setProductName("");
        setPrice("");
    };

    return (
        <div className="min-h-screen bg-black text-white p-6">
            <header className="mb-8 flex items-center justify-between">
                <h1 className="bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-2xl font-bold text-transparent">
                    RA GS Capture
                </h1>
                <Link href="/" className="text-sm text-neutral-400 hover:text-white">
                    Home
                </Link>
            </header>

            <div className="mx-auto max-w-lg">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Image Placeholder */}
                    <div className="flex aspect-square w-full cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-neutral-700 bg-neutral-900 transition-colors hover:border-green-500">
                        <div className="text-center">
                            <span className="text-4xl">📷</span>
                            <p className="mt-2 text-sm text-neutral-400">Tap to take photo</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-neutral-300">
                                Product Name
                            </label>
                            <input
                                type="text"
                                value={productName}
                                onChange={(e) => setProductName(e.target.value)}
                                className="mt-1 block w-full rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-white focus:ring-2 focus:ring-green-500 outline-none"
                                placeholder="Vintage Lamp"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-300">
                                    Price (R$)
                                </label>
                                <input
                                    type="number"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    className="mt-1 block w-full rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-white focus:ring-2 focus:ring-green-500 outline-none"
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-300">
                                    Category
                                </label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="mt-1 block w-full rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-white focus:ring-2 focus:ring-green-500 outline-none"
                                >
                                    <option value="clothing">Clothing</option>
                                    <option value="furniture">Furniture</option>
                                    <option value="electronics">Electronics</option>
                                    <option value="books">Books</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full rounded-xl bg-green-600 py-4 font-bold text-white shadow-lg shadow-green-900/20 transition-all hover:bg-green-500 active:scale-95"
                    >
                        Save Product
                    </button>
                </form>
            </div>
        </div>
    );
}
