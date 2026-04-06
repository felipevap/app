"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useGarageSales } from "@/contexts/GarageSaleContext";
import Webcam from "react-webcam";
import Toast from "@/components/Toast";
import { computeProductEmbeddingMean } from "@/utils/productEmbedding";

const CATEGORIES = ["Eletrônicos", "Roupas", "Móveis", "Livros", "Brinquedos", "Esportes", "Decoração", "CD", "DVD", "LP", "Itens cozinha", "Ferramentas", "Itens piscina", "Cama mesa e banho", "Eletrodomésticos", "Saúde", "Outros"];

export default function EditProductPage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;
    const { garageSales, getProduct, updateProduct } = useGarageSales();
    const webcamRef = useRef<Webcam>(null);

    const [currentTag, setCurrentTag] = useState("");
    const [showCamera, setShowCamera] = useState(false);
    const [formData, setFormData] = useState({
        nome: "",
        descricao: "",
        preco: 0,
        imagens: [] as string[],
        categoria: "Outros",
        condicao: "Usado - Bom",
        tags: [] as string[],
        garageSaleId: "",
        status: "disponível" as "disponível" | "vendido" | "reservado",
    });
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; isVisible: boolean }>({ message: '', type: 'info', isVisible: false });

    const showToast = (message: string, type: 'success' | 'error' | 'info') => {
        setToast({ message, type, isVisible: true });
    };

    useEffect(() => {
        if (id) {
            const product = getProduct(id);
            if (product) {
                setFormData({
                    nome: product.nome,
                    descricao: product.descricao,
                    preco: product.preco,
                    imagens: product.imagens,
                    categoria: product.categoria,
                    condicao: product.condicao,
                    tags: product.tags,
                    garageSaleId: product.garageSaleId,
                    status: product.status,
                });
            }
        }
    }, [id, getProduct]);

    useEffect(() => {
        if (!showCamera) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setShowCamera(false);
        };
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener("keydown", onKey);
        };
    }, [showCamera]);

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
                    const MAX_SIZE = 1920;

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
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                        setFormData(prev => ({ ...prev, imagens: [...prev.imagens, dataUrl] }));
                    }
                };
                img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
        });
    };

    const capturePhoto = () => {
        if (!webcamRef.current) return;
        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) return;

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const MAX_SIZE = 1920;

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
                const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                setFormData(prev => ({ ...prev, imagens: [...prev.imagens, dataUrl] }));
                setShowCamera(false);
            }
        };
        img.src = imageSrc;
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const embedding =
                formData.imagens.length === 0
                    ? null
                    : (await computeProductEmbeddingMean(formData.imagens)) ?? null;
            await updateProduct(id, {
                ...formData,
                embedding,
            });
            showToast('Produto atualizado com sucesso!', 'success');
            setTimeout(() => {
                router.push(`/admin/products?garageSale=${formData.garageSaleId}`);
            }, 1000);
        } catch (error) {
            showToast('Erro ao atualizar produto.', 'error');
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <header className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-stone-900">Editar Produto</h1>
                    <p className="text-stone-600">Atualize as informações do produto</p>
                </div>
                <Link
                    href={`/admin/products${formData.garageSaleId ? `?garageSale=${formData.garageSaleId}` : ''}`}
                    className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
                >
                    Cancelar
                </Link>
            </header>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white border border-stone-200 shadow-sm p-8 rounded-2xl">
                <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                        Evento
                    </label>
                    <select
                        value={formData.garageSaleId}
                        onChange={e => setFormData({ ...formData, garageSaleId: e.target.value })}
                        className="w-full bg-white border border-stone-300 rounded-lg p-3 text-stone-900 focus:border-blue-500 outline-none"
                        required
                    >
                        {garageSales.map((gs) => (
                            <option key={gs.id} value={gs.id}>
                                {gs.nome}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                        Imagens do Produto
                    </label>

                    <div className="flex gap-2 mb-4">
                        <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-stone-300 rounded-xl p-6 hover:border-blue-500 transition-colors cursor-pointer">
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleImageUpload}
                                className="hidden"
                            />
                            <div className="w-10 h-10 mb-2">
                                <svg className="w-full h-full text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                            </div>
                            <p className="text-center text-stone-600 text-sm">Upload</p>
                        </label>

                        <button
                            type="button"
                            onClick={() => setShowCamera(!showCamera)}
                            className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-stone-300 rounded-xl p-6 hover:border-blue-500 transition-colors"
                        >
                            <div className="w-10 h-10 mb-2">
                                <svg className="w-full h-full text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <p className="text-center text-stone-600 text-sm">
                                {showCamera ? 'Fechar Câmera' : 'Usar Câmera'}
                            </p>
                        </button>
                    </div>

                    {showCamera &&
                        createPortal(
                            <div
                                className="fixed inset-0 z-[9999] flex flex-col bg-black"
                                role="dialog"
                                aria-modal="true"
                                aria-label="Captura de foto"
                            >
                                <div
                                    className="shrink-0 flex items-center justify-between gap-2 px-3 py-3 bg-black/70 text-white"
                                    style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}
                                >
                                    <button
                                        type="button"
                                        onClick={() => setShowCamera(false)}
                                        className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20"
                                    >
                                        Fechar
                                    </button>
                                    <p className="pointer-events-none flex-1 text-center text-sm font-semibold">
                                        Posicione o produto na câmera
                                    </p>
                                    <span className="w-[4.5rem] shrink-0" aria-hidden />
                                </div>
                                <div className="relative min-h-0 flex-1">
                                    <Webcam
                                        ref={webcamRef}
                                        audio={false}
                                        screenshotFormat="image/jpeg"
                                        screenshotQuality={1}
                                        videoConstraints={{
                                            facingMode: "environment",
                                            width: { ideal: 1920 },
                                            height: { ideal: 1080 },
                                        }}
                                        className="absolute inset-0 h-full w-full object-cover"
                                    />
                                </div>
                                <div
                                    className="shrink-0 flex justify-center bg-black/70 px-4 py-4"
                                    style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
                                >
                                    <button
                                        type="button"
                                        onClick={capturePhoto}
                                        className="rounded-full bg-blue-600 px-10 py-4 text-lg font-bold text-white shadow-lg hover:bg-blue-500"
                                    >
                                        Capturar foto
                                    </button>
                                </div>
                            </div>,
                            document.body
                        )}

                    {formData.imagens.length > 0 && (
                        <div className="border border-stone-200 rounded-xl p-4 bg-stone-50">
                            <div className="flex gap-2 overflow-x-auto pb-2">
                                {formData.imagens.map((img, index) => (
                                    <div key={index} className="relative flex-shrink-0">
                                        <img src={img} alt={`Preview ${index + 1}`} className="h-32 w-32 object-cover rounded-lg" />
                                        <button
                                            type="button"
                                            onClick={() => removeImage(index)}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <p className="text-center text-stone-600 text-sm mt-2">
                                {formData.imagens.length} imagem(ns) adicionada(s)
                            </p>
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">Nome do Produto</label>
                        <input
                            type="text"
                            required
                            value={formData.nome}
                            onChange={e => setFormData({ ...formData, nome: e.target.value })}
                            className="w-full bg-white border border-stone-300 rounded-lg p-3 text-stone-900 focus:border-blue-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">Preço (R$)</label>
                        <input
                            type="text"
                            required
                            value={`R$ ${formatBRL(formData.preco)}`}
                            onChange={handlePriceChange}
                            className="w-full bg-white border border-stone-300 rounded-lg p-3 text-stone-900 focus:border-blue-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">Descrição</label>
                        <textarea
                            required
                            rows={4}
                            value={formData.descricao}
                            onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                            className="w-full bg-white border border-stone-300 rounded-lg p-3 text-stone-900 focus:border-blue-500 outline-none resize-none"
                        />
                    </div>

                    <label className="block text-sm font-medium text-stone-700 mb-2">Categoria</label>
                    <div className="space-y-2">
                        <select
                            value={CATEGORIES.includes(formData.categoria) ? formData.categoria : "Outros"}
                            onChange={(e) => {
                                if (e.target.value === "custom") {
                                    setFormData({ ...formData, categoria: "" });
                                } else {
                                    setFormData({ ...formData, categoria: e.target.value });
                                }
                            }}
                            className="w-full bg-white border border-stone-300 rounded-lg p-3 text-stone-900 focus:border-blue-500 outline-none"
                        >
                            {CATEGORIES.filter(c => c !== "Outros").map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                            <option value="Outros">Outros</option>
                            <option value="custom">✨ Nova Categoria...</option>
                        </select>

                        {(!CATEGORIES.includes(formData.categoria) && formData.categoria !== "Outros") || formData.categoria === "" ? (
                            <input
                                type="text"
                                value={formData.categoria}
                                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                                placeholder="Digite o nome da categoria"
                                className="w-full bg-white border border-stone-300 rounded-lg p-3 text-stone-900 focus:border-blue-500 outline-none"
                                autoFocus
                            />
                        ) : null}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">Estado/Condição</label>
                        <select
                            value={formData.condicao}
                            onChange={e => setFormData({ ...formData, condicao: e.target.value })}
                            className="w-full bg-white border border-stone-300 rounded-lg p-3 text-stone-900 focus:border-blue-500 outline-none"
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
                        <label className="block text-sm font-medium text-stone-700 mb-2">Status</label>
                        <select
                            value={formData.status}
                            onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                            className="w-full bg-white border border-stone-300 rounded-lg p-3 text-stone-900 focus:border-blue-500 outline-none"
                            required
                        >
                            <option value="disponível">Disponível</option>
                            <option value="reservado">Reservado</option>
                            <option value="vendido">Vendido</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">Tags</label>
                        <div className="flex gap-2 mb-2">
                            <input
                                type="text"
                                value={currentTag}
                                onChange={e => setCurrentTag(e.target.value)}
                                onKeyDown={handleAddTag}
                                placeholder="Digite e pressione Enter"
                                className="flex-1 bg-white border border-stone-300 rounded-lg p-3 text-stone-900 focus:border-blue-500 outline-none"
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
                                        className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                                    >
                                        #{tag}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveTag(tag)}
                                            className="hover:text-blue-900"
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
                    💾 Salvar Alterações
                </button>
            </form>
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
