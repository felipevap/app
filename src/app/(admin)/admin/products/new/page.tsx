"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useGarageSales } from "@/contexts/GarageSaleContext";

export default function NewProductPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { garageSales, addProduct } = useGarageSales();

    const [currentTag, setCurrentTag] = useState("");
    const [formData, setFormData] = useState({
        nome: "",
        descricao: "",
        preco: 0,
        imagens: [] as string[],
        categoria: "Outros",
        condicao: "Usado - Bom",
        tags: [] as string[],
        garageSaleId: "",
    });

    useEffect(() => {
        const garageSaleParam = searchParams?.get("garageSale");
        if (garageSaleParam) {
            setFormData(prev => ({ ...prev, garageSaleId: garageSaleParam }));
        } else if (garageSales.length > 0) {
            setFormData(prev => ({ ...prev, garageSaleId: garageSales[0].id }));
        }
    }, [searchParams, garageSales]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const MAX_SIZE = 512;

                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0, width, height);
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                        setFormData(prev => ({ ...prev, imagens: [...prev.imagens, dataUrl] }));
                    }
                };
                img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
        });
    };

    const removeImage = (index: number) => {
        setFormData(prev => ({
            ...prev,
            imagens: prev.imagens.filter((_, i) => i !== index)
        }));
    };

    const formatBRL = (value: number): string => {
        return value.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/[^\d]/g, '');
        const numValue = parseFloat(value) / 100;
        setFormData({ ...formData, preco: numValue });
    };

    const handleAddTag = (e?: React.KeyboardEvent<HTMLInputElement>) => {
        if (e && e.key !== 'Enter') return;
        e?.preventDefault();

        if (currentTag.trim() && !formData.tags.includes(currentTag.trim().toLowerCase())) {
            setFormData({
                ...formData,
                tags: [...formData.tags, currentTag.trim().toLowerCase()]
            });
            setCurrentTag('');
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setFormData({
            ...formData,
            tags: formData.tags.filter(tag => tag !== tagToRemove)
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.garageSaleId) {
            alert('Por favor, selecione uma Garage Sale.');
            return;
        }

        addProduct(formData);
        alert('Produto cadastrado com sucesso!');
        router.push(`/admin/products?garageSale=${formData.garageSaleId}`);
    };

    if (garageSales.length === 0) {
        return (
            <div className="max-w-2xl mx-auto">
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
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            <header className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Novo Produto</h1>
                    <p className="text-neutral-400">Adicione um produto à Garage Sale</p>
                </div>
                <Link
                    href={`/admin/products${formData.garageSaleId ? `?garageSale=${formData.garageSaleId}` : ''}`}
                    className="rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-700"
                >
                    Cancelar
                </Link>
            </header>

            <form onSubmit={handleSubmit} className="space-y-6 bg-neutral-950 border border-neutral-800 p-8 rounded-2xl">
                <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                        Garage Sale
                    </label>
                    <select
                        value={formData.garageSaleId}
                        onChange={e => setFormData({ ...formData, garageSaleId: e.target.value })}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                        required
                    >
                        {garageSales.map((gs) => (
                            <option key={gs.id} value={gs.id}>
                                {gs.nome}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col items-center justify-center border-2 border-dashed border-neutral-600 rounded-xl p-8 hover:border-blue-500 transition-colors cursor-pointer relative">
                    <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    {formData.imagens.length > 0 ? (
                        <div className="w-full">
                            <div className="flex gap-2 overflow-x-auto pb-2">
                                {formData.imagens.map((img, index) => (
                                    <div key={index} className="relative flex-shrink-0">
                                        <img src={img} alt={`Preview ${index + 1}`} className="h-32 w-32 object-cover rounded-lg" />
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeImage(index);
                                            }}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <p className="text-center text-neutral-400 text-sm mt-4">Clique para adicionar mais imagens</p>
                        </div>
                    ) : (
                        <div className="text-center text-neutral-400">
                            <div className="w-12 h-12 mx-auto mb-2">
                                <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                            </div>
                            <p>Clique para enviar imagens do produto (múltiplas)</p>
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">Nome do Produto</label>
                        <input
                            type="text"
                            required
                            value={formData.nome}
                            onChange={e => setFormData({ ...formData, nome: e.target.value })}
                            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                            placeholder="Ex: Notebook Dell Inspiron"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">Preço (R$)</label>
                        <input
                            type="text"
                            required
                            value={`R$ ${formatBRL(formData.preco)}`}
                            onChange={handlePriceChange}
                            placeholder="R$ 0,00"
                            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">Descrição</label>
                        <textarea
                            required
                            rows={4}
                            value={formData.descricao}
                            onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none resize-none"
                            placeholder="Descreva o produto..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">Categoria</label>
                        <select
                            value={formData.categoria}
                            onChange={e => setFormData({ ...formData, categoria: e.target.value })}
                            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                            required
                        >
                            <option value="Eletrônicos">Eletrônicos</option>
                            <option value="Roupas">Roupas</option>
                            <option value="Móveis">Móveis</option>
                            <option value="Livros">Livros</option>
                            <option value="Brinquedos">Brinquedos</option>
                            <option value="Esportes">Esportes</option>
                            <option value="Decoração">Decoração</option>
                            <option value="Outros">Outros</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">Estado/Condição</label>
                        <select
                            value={formData.condicao}
                            onChange={e => setFormData({ ...formData, condicao: e.target.value })}
                            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                            required
                        >
                            <option value="Novo">Novo</option>
                            <option value="Semi-novo">Semi-novo</option>
                            <option value="Usado - Excelente">Usado - Excelente</option>
                            <option value="Usado - Bom">Usado - Bom</option>
                            <option value="Usado - Regular">Usado - Regular</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">Tags</label>
                        <div className="flex gap-2 mb-2">
                            <input
                                type="text"
                                value={currentTag}
                                onChange={e => setCurrentTag(e.target.value)}
                                onKeyDown={handleAddTag}
                                placeholder="Digite e pressione Enter"
                                className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                            />
                            <button
                                type="button"
                                onClick={() => handleAddTag()}
                                className="px-6 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors font-bold text-white"
                            >
                                +
                            </button>
                        </div>
                        {formData.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {formData.tags.map((tag, index) => (
                                    <span
                                        key={index}
                                        className="flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm"
                                    >
                                        #{tag}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveTag(tag)}
                                            className="hover:text-blue-200"
                                        >
                                            ✕
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl"
                >
                    💾 Salvar Produto
                </button>
            </form>
        </div>
    );
}
