"use client";

import { useGarageSales } from "@/contexts/GarageSaleContext";
import Link from "next/link";
import { useState } from "react";
import { formatDate } from "@/utils/formatters";
import type { ContractPairStatus } from "@/lib/garage-sale-contract-pair-status";

function contractTypeStatusText(pair: ContractPairStatus["service"]) {
    if (!pair.configured) return "Sem modelo";
    if (pair.signed) return "Assinado";
    return "Pendente";
}

function contractTypeStatusClass(pair: ContractPairStatus["service"]) {
    if (!pair.configured) return "text-stone-500";
    if (pair.signed) return "font-semibold text-emerald-700";
    return "font-semibold text-amber-700";
}

export default function GarageSalesPage() {
    const { garageSales, deleteGarageSale, updateGarageSale, getProductsByGarageSale, refreshData, loading } = useGarageSales();
    const [searchTerm, setSearchTerm] = useState("");
    const [showDeleted, setShowDeleted] = useState(false);

    const filteredGarageSales = garageSales.filter(gs => {
        const matchesSearch = gs.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            gs.responsavel.toLowerCase().includes(searchTerm.toLowerCase());

        if (showDeleted) {
            return matchesSearch; // Show all (active + deleted)
        } else {
            return matchesSearch && !gs.deletedAt; // Show only active
        }
    });

    const handleToggleDeleted = () => {
        const newValue = !showDeleted;
        setShowDeleted(newValue);
        refreshData({ includeDeleted: newValue });
    };

    const handleDelete = async (id: string, nome: string) => {
        if (confirm(`Tem certeza que deseja excluir o evento "${nome}"?`)) {
            await deleteGarageSale(id);
            // If showing deleted, we just refresh to update status
            refreshData({ includeDeleted: showDeleted });
        }
    };

    const handleRestore = async (id: string, nome: string) => {
        if (confirm(`Deseja restaurar o evento "${nome}"?`)) {
            await updateGarageSale(id, { deletedAt: null });
            refreshData({ includeDeleted: showDeleted });
        }
    };

    if (loading && garageSales.length === 0) {
        return (
            <div className="flex min-h-[calc(100dvh-8rem)] items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-stone-900">Eventos</h1>
                    <p className="text-stone-600">Gerencie os eventos da sua organização</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleToggleDeleted}
                        className={`rounded-xl px-4 py-2 font-bold transition-all border ${showDeleted ? 'bg-red-100 border-red-400 text-red-800' : 'bg-stone-800 border-stone-700 text-white hover:bg-stone-700'}`}
                    >
                        {showDeleted ? 'Ocultar Excluídos' : 'Mostrar Excluídos'}
                    </button>
                    <Link
                        href="/admin/garage-sales/new"
                        className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl"
                    >
                        + Novo evento
                    </Link>
                </div>
            </header>

            <div className="rounded-xl border border-stone-200 bg-white shadow-sm p-4">
                <input
                    type="text"
                    placeholder="Buscar por nome ou responsável..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-lg border border-stone-300 bg-white p-3 text-stone-900 placeholder-stone-400 focus:border-blue-500 focus:outline-none"
                />
            </div>

            {filteredGarageSales.length === 0 ? (
                <div className="rounded-xl border border-stone-200 bg-white shadow-sm p-12 text-center">
                    <span className="mb-4 block text-6xl">🏪</span>
                    <h3 className="mb-2 text-xl font-bold text-stone-900">
                        {searchTerm ? "Nenhum evento encontrado" : "Nenhum evento cadastrado"}
                    </h3>
                    <p className="mb-6 text-stone-600">
                        {searchTerm ? "Tente buscar com outros termos" : "Comece criando seu primeiro evento"}
                    </p>
                    {!searchTerm && !showDeleted && (
                        <Link
                            href="/admin/garage-sales/new"
                            className="inline-block rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 font-bold text-white shadow-lg transition-all hover:scale-[1.02]"
                        >
                            Criar primeiro evento
                        </Link>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {filteredGarageSales.map((gs) => {
                        const produtos = getProductsByGarageSale(gs.id);
                        const isDeleted = !!gs.deletedAt;

                        return (
                            <div
                                key={gs.id}
                                className={`group rounded-xl border p-6 shadow-sm transition-all ${isDeleted ? 'border-red-200 bg-red-50/80 opacity-90' : 'border-stone-200 bg-white hover:border-stone-300 hover:shadow-lg'}`}
                            >
                                <div className="mb-4 flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-xl font-bold text-stone-900">{gs.nome}</h3>
                                            {isDeleted && <span className="text-xs font-bold bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">EXCLUÍDO</span>}
                                        </div>
                                        <p className="mt-1 text-sm text-stone-600">
                                            {formatDate(gs.dataInicio)} - {formatDate(gs.dataFim)}
                                        </p>
                                    </div>
                                    <span className="rounded-full bg-blue-500/20 px-3 py-1 text-sm font-medium text-blue-400">
                                        {produtos.length} {produtos.length === 1 ? 'produto' : 'produtos'}
                                    </span>
                                </div>

                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2 text-stone-700">
                                        <span>📍</span>
                                        <span>{gs.endereco}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-stone-700">
                                        <span>👤</span>
                                        <span>{gs.responsavel}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-stone-700">
                                        <span>📧</span>
                                        <span>{gs.email}</span>
                                    </div>
                                    {gs.contractPairStatus ? (
                                        <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5">
                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                                                Contratos (proprietário)
                                            </p>
                                            <dl className="mt-2 space-y-1.5 text-sm">
                                                <div className="flex items-center justify-between gap-2">
                                                    <dt className="text-stone-600">Prestação de serviço</dt>
                                                    <dd
                                                        className={`shrink-0 text-right ${contractTypeStatusClass(gs.contractPairStatus.service)}`}
                                                    >
                                                        {contractTypeStatusText(gs.contractPairStatus.service)}
                                                    </dd>
                                                </div>
                                                <div className="flex items-center justify-between gap-2">
                                                    <dt className="text-stone-600">Inventário</dt>
                                                    <dd
                                                        className={`shrink-0 text-right ${contractTypeStatusClass(gs.contractPairStatus.inventory)}`}
                                                    >
                                                        {contractTypeStatusText(gs.contractPairStatus.inventory)}
                                                    </dd>
                                                </div>
                                            </dl>
                                        </div>
                                    ) : null}
                                </div>

                                {gs.regras && (
                                    <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-3">
                                        <p className="text-xs text-stone-600 line-clamp-2">{gs.regras}</p>
                                    </div>
                                )}

                                <div className="mt-6 flex gap-2">
                                    {!isDeleted ? (
                                        <>
                                            <Link
                                                href={`/admin/garage-sales/${gs.id}/edit`}
                                                className="flex-1 rounded-lg border border-stone-300 bg-stone-800 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-stone-700"
                                            >
                                                ✏️ Editar
                                            </Link>
                                            <Link
                                                href={`/admin/products?garageSale=${gs.id}`}
                                                className="flex-1 rounded-lg border border-blue-700 bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-blue-500"
                                            >
                                                📦 Ver Produtos
                                            </Link>
                                            {gs.slug ? (
                                                <a
                                                    href={`/evento/${gs.slug}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="flex-1 rounded-lg border border-emerald-700 bg-emerald-600 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-emerald-500"
                                                >
                                                    🌐 Página Pública
                                                </a>
                                            ) : null}
                                            <button
                                                onClick={() => handleDelete(gs.id, gs.nome)}
                                                className="rounded-lg border border-red-700 bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
                                            >
                                                🗑️
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => handleRestore(gs.id, gs.nome)}
                                            className="w-full rounded-lg border border-green-700 bg-green-600 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-green-500"
                                        >
                                            ♻️ Restaurar evento
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
