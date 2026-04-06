"use client";

import { useGarageSales, Product } from "@/contexts/GarageSaleContext";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Toast from "@/components/Toast";

import { Suspense } from "react";

function ProductsContent() {
    const { garageSales, deleteProduct, restoreProduct, loading: contextLoading } = useGarageSales();
    const searchParams = useSearchParams();
    const [selectedGarageSaleId, setSelectedGarageSaleId] = useState<string>("");
    const [searchTerm, setSearchTerm] = useState("");
    const [filterCategoria, setFilterCategoria] = useState("");
    const [filterCondicao, setFilterCondicao] = useState("");
    const [showDeleted, setShowDeleted] = useState(false);

    // Pagination State
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const limit = 10;

    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; isVisible: boolean }>({ message: '', type: 'info', isVisible: false });

    const showToast = (message: string, type: 'success' | 'error' | 'info') => {
        setToast({ message, type, isVisible: true });
    };

    // Initialize Garage Sale Selection
    useEffect(() => {
        const garageSaleParam = searchParams?.get("garageSale");
        if (garageSaleParam) {
            setSelectedGarageSaleId(garageSaleParam);
        } else if (garageSales.length > 0 && !selectedGarageSaleId) {
            setSelectedGarageSaleId(garageSales[0].id);
        }
    }, [searchParams, garageSales, selectedGarageSaleId]);

    // Fetch Products with Pagination
    const fetchProducts = useCallback(async () => {
        if (!selectedGarageSaleId) return;

        setLoading(true);
        try {
            const params = new URLSearchParams({
                garageSaleId: selectedGarageSaleId,
                page: page.toString(),
                limit: limit.toString(),
                includeDeleted: showDeleted ? 'true' : 'false',
                search: searchTerm,
                category: filterCategoria,
                condition: filterCondicao
            });

            const res = await fetch(`/api/products?${params.toString()}`);
            const data = await res.json();

            if (data.data) {
                setProducts(data.data);
                setTotalPages(data.meta.totalPages);
                setTotalItems(data.meta.total);
            } else {
                setProducts([]);
            }
        } catch (error) {
            console.error("Failed to fetch products", error);
            showToast("Erro ao carregar produtos", "error");
        } finally {
            setLoading(false);
        }
    }, [selectedGarageSaleId, page, showDeleted, searchTerm, filterCategoria, filterCondicao]);

    // Trigger fetch on dependencies change
    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    // Verify debounce for search if needed? For now, let's keep it simple. 
    // If user types fast, it might trigger many requests.
    // Ideally use debounce for search term.

    // Filters reset page
    useEffect(() => {
        setPage(1);
    }, [selectedGarageSaleId, searchTerm, filterCategoria, filterCondicao, showDeleted]);


    const handleDelete = async (id: string, nome: string) => {
        if (confirm(`Tem certeza que deseja excluir o produto "${nome}"?`)) {
            try {
                await deleteProduct(id);
                showToast("Produto excluído com sucesso!", "success");
                fetchProducts(); // Refresh list
            } catch (error) {
                showToast("Erro ao excluir produto. Tente novamente.", "error");
            }
        }
    };

    const handleRestore = async (id: string, nome: string) => {
        if (confirm(`Tem certeza que deseja restaurar o produto "${nome}"?`)) {
            try {
                await restoreProduct(id);
                showToast("Produto restaurado com sucesso!", "success");
                fetchProducts(); // Refresh list
            } catch (error) {
                showToast("Erro ao restaurar produto. Tente novamente.", "error");
            }
        }
    };

    const handlePermanentDelete = async (id: string, nome: string) => {
        if (confirm(`ATENÇÃO: Tem certeza que deseja excluir PERMANENTEMENTE o produto "${nome}"? Esta ação não pode ser desfeita.`)) {
            try {
                await deleteProduct(id, true);
                showToast("Produto excluído permanentemente!", "success");
                fetchProducts(); // Refresh list
            } catch (error) {
                showToast("Erro ao excluir produto permanentemente. Tente novamente.", "error");
            }
        }
    };

    // Static categories for filter (since we don't have all products to derive from, we use defaults + maybe distinct query? 
    // For simplicity, we use the default list + maybe distinct request later. 
    // Current implementation relied on `products` from context to get existing categories.
    // If we want dynamic categories we'd need an API endpoint for that.
    // Falling back to hardcoded list for now to satisfy pagination requirement.)
    const defaultCategories = ["Eletrônicos", "Roupas", "Móveis", "Livros", "Brinquedos", "Esportes", "Decoração", "CD", "DVD", "LP", "Itens cozinha", "Ferramentas", "Itens piscina", "Cama mesa e banho", "Eletrodomésticos", "Saúde", "Outros"];
    const categorias = defaultCategories.sort();
    const condicoes = ["Novo", "Semi-novo", "Usado - Excelente", "Usado - Bom", "Usado - Regular"];

    if (contextLoading && garageSales.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-stone-900">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-stone-600 font-medium">Carregando...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-stone-900">Produtos</h1>
                    <p className="text-stone-600 text-sm sm:text-base">Gerencie os produtos dos seus eventos</p>
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
                <div className="rounded-xl border border-stone-200 bg-white shadow-sm p-12 text-center">
                    <span className="mb-4 block text-6xl">🏪</span>
                    <h3 className="mb-2 text-xl font-bold text-stone-900">
                        Nenhum evento cadastrado
                    </h3>
                    <p className="mb-6 text-stone-600">
                        Crie um evento primeiro para poder adicionar produtos
                    </p>
                    <Link
                        href="/admin/garage-sales/new"
                        className="inline-block rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 font-bold text-white shadow-lg transition-all hover:scale-[1.02]"
                    >
                        Criar evento
                    </Link>
                </div>
            ) : (
                <>
                    <div className="space-y-4 rounded-xl border border-stone-200 bg-white shadow-sm p-4">
                        <div>
                            <label className="block text-sm font-medium text-stone-700 mb-2">
                                Selecionar evento
                            </label>
                            <select
                                value={selectedGarageSaleId}
                                onChange={(e) => setSelectedGarageSaleId(e.target.value)}
                                className="w-full rounded-lg border border-stone-300 bg-white p-3 text-stone-900 focus:border-blue-500 focus:outline-none text-base"
                            >
                                {garageSales.map((gs) => (
                                    <option key={gs.id} value={gs.id}>
                                        {gs.nome} ({new Date(gs.dataInicio).toLocaleDateString('pt-BR')} - {new Date(gs.dataFim).toLocaleDateString('pt-BR')})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="showDeleted"
                                checked={showDeleted}
                                onChange={(e) => setShowDeleted(e.target.checked)}
                                className="h-4 w-4 rounded border-stone-300 bg-white text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor="showDeleted" className="text-sm font-medium text-stone-700 select-none cursor-pointer">
                                Exibir produtos deletados
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                        <div className="md:col-span-2">
                            <input
                                type="text"
                                placeholder="Buscar produtos..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-lg border border-stone-300 bg-white p-3 text-stone-900 placeholder-stone-400 focus:border-blue-500 focus:outline-none text-base"
                            />
                        </div>
                        <div>
                            <select
                                value={filterCategoria}
                                onChange={(e) => setFilterCategoria(e.target.value)}
                                className="w-full rounded-lg border border-stone-300 bg-white p-3 text-stone-900 focus:border-blue-500 focus:outline-none text-base"
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
                                className="w-full rounded-lg border border-stone-300 bg-white p-3 text-stone-900 focus:border-blue-500 focus:outline-none text-base"
                            >
                                <option value="">Todas as Condições</option>
                                {condicoes.map((cond) => (
                                    <option key={cond} value={cond}>{cond}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-stone-900">
                            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-stone-600 font-medium">Carregando produtos...</p>
                        </div>
                    ) : products.length === 0 ? (
                        <div className="rounded-xl border border-stone-200 bg-white shadow-sm p-12 text-center">
                            <span className="mb-4 block text-6xl">📦</span>
                            <h3 className="mb-2 text-xl font-bold text-stone-900">
                                {searchTerm || filterCategoria || filterCondicao ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"}
                            </h3>
                            <p className="mb-6 text-stone-600">
                                {searchTerm || filterCategoria || filterCondicao
                                    ? "Tente ajustar os filtros de busca"
                                    : "Comece adicionando produtos para este evento"}
                            </p>
                            {!searchTerm && !filterCategoria && !filterCondicao && !showDeleted && (
                                <Link
                                    href={`/admin/products/new?garageSale=${selectedGarageSaleId}`}
                                    className="inline-block rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 font-bold text-white shadow-lg transition-all hover:scale-[1.02]"
                                >
                                    Adicionar Primeiro Produto
                                </Link>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {products.map((product) => (
                                    <div
                                        key={product.id}
                                        className={`group rounded-xl border bg-white shadow-sm overflow-hidden shadow-sm transition-all hover:shadow-lg ${product.deletedAt ? 'border-red-900 opacity-75' : 'border-stone-200 hover:border-stone-300'}`}
                                    >
                                        <div className="relative h-48 bg-stone-100">
                                            {product.imagens.length > 0 ? (
                                                <img
                                                    src={product.imagens[0]}
                                                    alt={product.nome}
                                                    className={`h-full w-full object-cover ${product.deletedAt ? 'grayscale' : ''}`}
                                                />
                                            ) : (
                                                <div className="flex h-full items-center justify-center text-6xl">
                                                    📦
                                                </div>
                                            )}
                                            {product.deletedAt && (
                                                <div className="absolute top-2 left-2 rounded-full bg-red-600 px-2 py-1 text-xs font-bold text-white">
                                                    DELETADO
                                                </div>
                                            )}
                                            {product.imagens.length > 1 && (
                                                <div className="absolute top-2 right-2 rounded-full bg-stone-900/75 px-2 py-1 text-xs text-white">
                                                    +{product.imagens.length - 1}
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-4">
                                            <h3 className="font-bold text-stone-900 line-clamp-1">{product.nome}</h3>
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
                                                <span className={`rounded-full px-2 py-0.5 text-xs ${product.status === 'vendido' ? 'bg-red-500/20 text-red-400' :
                                                    product.status === 'reservado' ? 'bg-yellow-500/20 text-yellow-400' :
                                                        'bg-blue-500/20 text-blue-400'
                                                    }`}>
                                                    {product.status ? (product.status.charAt(0).toUpperCase() + product.status.slice(1)) : 'Disponível'}
                                                </span>
                                            </div>
                                            {product.tags.length > 0 && (
                                                <div className="mt-2 flex flex-wrap gap-1">
                                                    {product.tags.slice(0, 2).map((tag, idx) => (
                                                        <span key={idx} className="text-xs text-stone-500">
                                                            #{tag}
                                                        </span>
                                                    ))}
                                                    {product.tags.length > 2 && (
                                                        <span className="text-xs text-stone-500">
                                                            +{product.tags.length - 2}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            <div className="mt-4 flex gap-2">
                                                {product.deletedAt ? (
                                                    <div className="flex w-full gap-2">
                                                        <button
                                                            onClick={() => handleRestore(product.id, product.nome)}
                                                            className="flex-1 rounded-lg border border-green-700 bg-green-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-green-500"
                                                        >
                                                            ♻️ Restaurar
                                                        </button>
                                                        <button
                                                            onClick={() => handlePermanentDelete(product.id, product.nome)}
                                                            className="rounded-lg border border-red-900 bg-red-800 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                                                            title="Excluir Permanentemente"
                                                        >
                                                            💥
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <Link
                                                            href={`/admin/products/${product.id}/edit`}
                                                            className="flex-1 rounded-lg border border-stone-300 bg-stone-800 px-3 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-stone-700"
                                                        >
                                                            ✏️
                                                        </Link>
                                                        <button
                                                            onClick={() => handleDelete(product.id, product.nome)}
                                                            className="rounded-lg border border-red-700 bg-red-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex justify-center items-center gap-4 mt-8 pt-6 border-t border-stone-200">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="px-4 py-2 rounded-lg bg-white border border-stone-300 text-stone-800 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-stone-50 transition-colors"
                                    >
                                        Anterior
                                    </button>
                                    <span className="text-stone-600">
                                        Página <span className="text-stone-900 font-bold">{page}</span> de <span className="text-stone-900 font-bold">{totalPages}</span>
                                    </span>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="px-4 py-2 rounded-lg bg-white border border-stone-300 text-stone-800 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-stone-50 transition-colors"
                                    >
                                        Próxima
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </>
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

export default function ProductsPage() {
    return (
        <Suspense fallback={<div className="text-stone-700 text-center p-8">Carregando...</div>}>
            <ProductsContent />
        </Suspense>
    );
}
