"use client";

import { useGarageSales } from "@/contexts/GarageSaleContext";
import Link from "next/link";
import { useState } from "react";

export default function GarageSalesPage() {
    const { garageSales, deleteGarageSale, getProductsByGarageSale } = useGarageSales();
    const [searchTerm, setSearchTerm] = useState("");

    const filteredGarageSales = garageSales.filter(gs =>
        gs.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        gs.responsavel.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDelete = (id: string, nome: string) => {
        if (confirm(`Tem certeza que deseja excluir a Garage Sale "${nome}"? Todos os produtos vinculados também serão excluídos.`)) {
            deleteGarageSale(id);
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Garage Sales</h1>
                    <p className="text-neutral-400">Gerencie todos os eventos de Garage Sale</p>
                </div>
                <Link
                    href="/admin/garage-sales/new"
                    className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl"
                >
                    + Nova Garage Sale
                </Link>
            </header>

            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                <input
                    type="text"
                    placeholder="Buscar por nome ou responsável..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-900 p-3 text-white placeholder-neutral-500 focus:border-blue-500 focus:outline-none"
                />
            </div>

            {filteredGarageSales.length === 0 ? (
                <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-12 text-center">
                    <span className="mb-4 block text-6xl">🏪</span>
                    <h3 className="mb-2 text-xl font-bold text-white">
                        {searchTerm ? "Nenhuma Garage Sale encontrada" : "Nenhuma Garage Sale cadastrada"}
                    </h3>
                    <p className="mb-6 text-neutral-400">
                        {searchTerm ? "Tente buscar com outros termos" : "Comece criando sua primeira Garage Sale"}
                    </p>
                    {!searchTerm && (
                        <Link
                            href="/admin/garage-sales/new"
                            className="inline-block rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 font-bold text-white shadow-lg transition-all hover:scale-[1.02]"
                        >
                            Criar Primeira Garage Sale
                        </Link>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {filteredGarageSales.map((gs) => {
                        const produtos = getProductsByGarageSale(gs.id);
                        return (
                            <div
                                key={gs.id}
                                className="group rounded-xl border border-neutral-800 bg-neutral-950 p-6 shadow-sm transition-all hover:border-neutral-700 hover:shadow-lg"
                            >
                                <div className="mb-4 flex items-start justify-between">
                                    import {formatDate} from "@/utils/formatters";

                                    // ... inside component ...
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-white">{gs.nome}</h3>
                                        <p className="mt-1 text-sm text-neutral-400">
                                            {formatDate(gs.dataInicio)} - {formatDate(gs.dataFim)}
                                        </p>
                                    </div>
                                    <span className="rounded-full bg-blue-500/20 px-3 py-1 text-sm font-medium text-blue-400">
                                        {produtos.length} {produtos.length === 1 ? 'produto' : 'produtos'}
                                    </span>
                                </div>

                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2 text-neutral-300">
                                        <span>📍</span>
                                        <span>{gs.endereco}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-neutral-300">
                                        <span>👤</span>
                                        <span>{gs.responsavel}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-neutral-300">
                                        <span>📧</span>
                                        <span>{gs.email}</span>
                                    </div>
                                </div>

                                {gs.regras && (
                                    <div className="mt-4 rounded-lg border border-neutral-800 bg-neutral-900 p-3">
                                        <p className="text-xs text-neutral-400 line-clamp-2">{gs.regras}</p>
                                    </div>
                                )}

                                <div className="mt-6 flex gap-2">
                                    <Link
                                        href={`/admin/garage-sales/${gs.id}/edit`}
                                        className="flex-1 rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-neutral-700"
                                    >
                                        ✏️ Editar
                                    </Link>
                                    <Link
                                        href={`/admin/products?garageSale=${gs.id}`}
                                        className="flex-1 rounded-lg border border-blue-700 bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-blue-500"
                                    >
                                        📦 Ver Produtos
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(gs.id, gs.nome)}
                                        className="rounded-lg border border-red-700 bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
