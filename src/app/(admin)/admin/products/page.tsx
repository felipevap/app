"use client";

import { useGarageSales } from "@/contexts/GarageSaleContext";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Toast from "@/components/Toast";

import { Suspense } from "react";

function ProductsContent() {
    const { garageSales, products, getProductsByGarageSale, deleteProduct } = useGarageSales();
    const searchParams = useSearchParams();
    const [selectedGarageSaleId, setSelectedGarageSaleId] = useState<string>("");
    const [searchTerm, setSearchTerm] = useState("");
    const [filterCategoria, setFilterCategoria] = useState("");
    const [filterCondicao, setFilterCondicao] = useState("");
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; isVisible: boolean }>({ message: '', type: 'info', isVisible: false });

    const showToast = (message: string, type: 'success' | 'error' | 'info') => {
        setToast({ message, type, isVisible: true });
    };

    useEffect(() => {
        const garageSaleParam = searchParams?.get("garageSale");
        if (garageSaleParam) {
            setSelectedGarageSaleId(garageSaleParam);
        } else if (garageSales.length > 0) {
            setSelectedGarageSaleId(garageSales[0].id);
        }
    }, [searchParams, garageSales]);

    const filteredProducts = selectedGarageSaleId
        ? getProductsByGarageSale(selectedGarageSaleId).filter(p => {
            const matchesSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.descricao.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategoria = !filterCategoria || p.categoria === filterCategoria;
            const matchesCondicao = !filterCondicao || p.condicao === filterCondicao;
            return matchesSearch && matchesCategoria && matchesCondicao;
        })
        : [];

    const handleDelete = async (id: string, nome: string) => {
        if (confirm(`Tem certeza que deseja excluir o produto "${nome}"?`)) {
            try {
                await deleteProduct(id);
                showToast("Produto excluído com sucesso!", "success");
            } catch (error) {
                showToast("Erro ao excluir produto. Tente novamente.", "error");
            }
        }
    };

    const categorias = ["Eletrônicos", "Roupas", "Móveis", "Livros", "Brinquedos", "Esportes", "Decoração", "Outros"];
    const condicoes = ["Novo", "Semi-novo", "Usado - Excelente", "Usado - Bom", "Usado - Regular"];

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Produtos</h1>
                    <p className="text-neutral-400">Gerencie os produtos das Garage Sales</p>
                </div>
                {selectedGarageSaleId && (
                    <Link
                        href={`/admin/products/new?garageSale=${selectedGarageSaleId}`}
                        className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl"
                    >
                        + Novo Produto
                    </Link>
                )}
            </header>

            {garageSales.length === 0 ? (
                <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-12 text-center">
                    <span className="mb-4 block text-6xl">🏪</span>
                    <h3 className="mb-2 text-xl font-bold text-white">
                        Nenhuma Garage Sale cadastrada
                    </h3>
                    <p className="mb-6 text-neutral-400">
                        Crie uma Garage Sale primeiro para poder adicionar produtos
                    </p>
                    <Link
                        href="/admin/garage-sales/new"
                        className="inline-block rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 font-bold text-white shadow-lg transition-all hover:scale-[1.02]"
                    >
                        Criar Garage Sale
                    </Link>
                </div>
            ) : (
                <>
                    <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                        <label className="block text-sm font-medium text-neutral-300 mb-2">
                            Selecionar Garage Sale
                        </label>
                        <select
                            value={selectedGarageSaleId}
                            onChange={(e) => setSelectedGarageSaleId(e.target.value)}
                            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 p-3 text-white focus:border-blue-500 focus:outline-none"
                        >
                            {garageSales.map((gs) => (
                                <option key={gs.id} value={gs.id}>
                                    {gs.nome} ({new Date(gs.dataInicio).toLocaleDateString('pt-BR')} - {new Date(gs.dataFim).toLocaleDateString('pt-BR')})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                        <div className="md:col-span-2">
                            <input
                                type="text"
                                placeholder="Buscar produtos..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 p-3 text-white placeholder-neutral-500 focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <select
                                value={filterCategoria}
                                onChange={(e) => setFilterCategoria(e.target.value)}
                                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 p-3 text-white focus:border-blue-500 focus:outline-none"
                            >
                                <option value="">Todas as Categorias</option>
                                {categorias.map((cat) => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <select
                                value={filterCondicao}
                                onChange={(e) => setFilterCondicao(e.target.value)}
                                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 p-3 text-white focus:border-blue-500 focus:outline-none"
                            >
                                <option value="">Todas as Condições</option>
                                {condicoes.map((cond) => (
                                    <option key={cond} value={cond}>{cond}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {filteredProducts.length === 0 ? (
                        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-12 text-center">
                            <span className="mb-4 block text-6xl">📦</span>
                            <h3 className="mb-2 text-xl font-bold text-white">
                                {searchTerm || filterCategoria || filterCondicao ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"}
                            </h3>
                            <p className="mb-6 text-neutral-400">
                                {searchTerm || filterCategoria || filterCondicao
                                    ? "Tente ajustar os filtros de busca"
                                    : "Comece adicionando produtos para esta Garage Sale"}
                            </p>
                            {!searchTerm && !filterCategoria && !filterCondicao && (
                                <Link
                                    href={`/admin/products/new?garageSale=${selectedGarageSaleId}`}
                                    className="inline-block rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 font-bold text-white shadow-lg transition-all hover:scale-[1.02]"
                                >
                                    Adicionar Primeiro Produto
                                </Link>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {filteredProducts.map((product) => (
                                <div
                                    key={product.id}
                                    className="group rounded-xl border border-neutral-800 bg-neutral-950 overflow-hidden shadow-sm transition-all hover:border-neutral-700 hover:shadow-lg"
                                >
                                    <div className="relative h-48 bg-neutral-900">
                                        {product.imagens.length > 0 ? (
                                            <img
                                                src={product.imagens[0]}
                                                alt={product.nome}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full items-center justify-center text-6xl">
                                                📦
                                            </div>
                                        )}
                                        {product.imagens.length > 1 && (
                                            <div className="absolute top-2 right-2 rounded-full bg-black/70 px-2 py-1 text-xs text-white">
                                                +{product.imagens.length - 1}
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4">
                                        <h3 className="font-bold text-white line-clamp-1">{product.nome}</h3>
                                        <p className="mt-1 text-2xl font-bold text-blue-400">
                                            R$ {product.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-xs text-purple-400">
                                                {product.categoria}
                                            </span>
                                            <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
                                                {product.condicao}
                                            </span>
                                        </div>
                                        {product.tags.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-1">
                                                {product.tags.slice(0, 2).map((tag, idx) => (
                                                    <span key={idx} className="text-xs text-neutral-500">
                                                        #{tag}
                                                    </span>
                                                ))}
                                                {product.tags.length > 2 && (
                                                    <span className="text-xs text-neutral-500">
                                                        +{product.tags.length - 2}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        <div className="mt-4 flex gap-2">
                                            <Link
                                                href={`/admin/products/${product.id}/edit`}
                                                className="flex-1 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-neutral-700"
                                            >
                                                ✏️
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(product.id, product.nome)}
                                                className="rounded-lg border border-red-700 bg-red-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
            )}
            {toast.isVisible && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast({ ...toast, isVisible: false })}
                />
        </div>
    );
}

export default function ProductsPage() {
    return (
        <Suspense fallback={<div className="text-white text-center p-8">Carregando...</div>}>
            <ProductsContent />
        </Suspense>
    );
}
