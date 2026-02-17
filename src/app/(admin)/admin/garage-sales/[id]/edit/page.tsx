"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useGarageSales } from "@/contexts/GarageSaleContext";
import Toast from "@/components/Toast";

export default function EditGarageSalePage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;
    const { getGarageSale, updateGarageSale } = useGarageSales();

    const [formData, setFormData] = useState({
        nome: "",
        dataInicio: "",
        dataFim: "",
        endereco: "",
        responsavel: "",
        email: "",
        regras: "",
        banner: "",
    });
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; isVisible: boolean }>({ message: '', type: 'info', isVisible: false });

    const showToast = (message: string, type: 'success' | 'error' | 'info') => {
        setToast({ message, type, isVisible: true });
    };

    useEffect(() => {
        if (id) {
            const garageSale = getGarageSale(id);
            if (garageSale) {
                setFormData({
                    nome: garageSale.nome,
                    dataInicio: garageSale.dataInicio ? new Date(garageSale.dataInicio).toISOString().split('T')[0] : "",
                    dataFim: garageSale.dataFim ? new Date(garageSale.dataFim).toISOString().split('T')[0] : "",
                    endereco: garageSale.endereco,
                    responsavel: garageSale.responsavel || "",
                    email: garageSale.email || "",
                    regras: garageSale.regras || "",
                    banner: garageSale.banner || "",
                });
            }
        }
    }, [id, getGarageSale]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_WIDTH = 1200;

                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                    setFormData(prev => ({ ...prev, banner: dataUrl }));
                }
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await updateGarageSale(id, formData);
            showToast("Garage Sale atualizada com sucesso!", "success");
            setTimeout(() => {
                router.push("/admin/garage-sales");
            }, 1000);
        } catch (error) {
            showToast("Erro ao atualizar Garage Sale.", "error");
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Editar Garage Sale</h1>
                    <p className="text-neutral-400">Atualize as informações do evento.</p>
                </div>
                <Link
                    href="/admin/garage-sales"
                    className="rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-700"
                >
                    Cancelar
                </Link>
            </header>

            <form onSubmit={handleSubmit} className="space-y-8 rounded-2xl border border-neutral-800 bg-neutral-950 p-8 shadow-xl">
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-blue-400">Detalhes do Evento</h2>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-neutral-300">
                                Nome da Garage Sale
                            </label>
                            <input
                                type="text"
                                name="nome"
                                value={formData.nome}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-300">
                                Data de Início
                            </label>
                            <input
                                type="date"
                                name="dataInicio"
                                value={formData.dataInicio}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-300">
                                Data de Término
                            </label>
                            <input
                                type="date"
                                name="dataFim"
                                value={formData.dataFim}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-neutral-300">
                                Endereço
                            </label>
                            <input
                                type="text"
                                name="endereco"
                                value={formData.endereco}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                required
                            />
                        </div>
                    </div>
                </div>

                <hr className="border-neutral-800" />

                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-purple-400">Responsável</h2>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-neutral-300">
                                Nome do Responsável
                            </label>
                            <input
                                type="text"
                                name="responsavel"
                                value={formData.responsavel}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-300">
                                Email do Responsável
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                                required
                            />
                        </div>
                    </div>
                </div>

                <hr className="border-neutral-800" />

                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-green-400">Regras e Configuração</h2>
                    <div>
                        <label className="block text-sm font-medium text-neutral-300">
                            Regras e Termos
                        </label>
                        <textarea
                            name="regras"
                            value={formData.regras}
                            onChange={handleChange}
                            rows={4}
                            className="mt-1 block w-full rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-white focus:border-green-500 focus:ring-1 focus:ring-green-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">
                            Imagem de Banner
                        </label>
                        {formData.banner ? (
                            <div className="relative">
                                <img
                                    src={formData.banner}
                                    alt="Banner preview"
                                    className="w-full h-48 object-cover rounded-lg"
                                />
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, banner: "" }))}
                                    className="absolute top-2 right-2 rounded-full bg-red-500 p-2 text-white hover:bg-red-600"
                                >
                                    ✕
                                </button>
                            </div>
                        ) : (
                            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-neutral-800 border-dashed rounded-lg hover:border-neutral-600 cursor-pointer bg-neutral-900/50">
                                <div className="space-y-1 text-center">
                                    <svg
                                        className="mx-auto h-12 w-12 text-neutral-400"
                                        stroke="currentColor"
                                        fill="none"
                                        viewBox="0 0 48 48"
                                        aria-hidden="true"
                                    >
                                        <path
                                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                            strokeWidth={2}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                    <div className="flex text-sm text-neutral-400">
                                        <label htmlFor="banner-upload" className="relative cursor-pointer rounded-md font-medium text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 hover:text-blue-400">
                                            <span>Enviar arquivo</span>
                                            <input
                                                id="banner-upload"
                                                type="file"
                                                accept="image/*"
                                                onChange={handleBannerUpload}
                                                className="sr-only"
                                            />
                                        </label>
                                        <p className="pl-1">ou arraste e solte</p>
                                    </div>
                                    <p className="text-xs text-neutral-500">PNG, JPG, GIF até 10MB</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-4 font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-neutral-900"
                    >
                        Salvar Alterações
                    </button>
                </div>

            </form>
            {
                toast.isVisible && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast({ ...toast, isVisible: false })}
                    />
                )
            }
        </div >
    );
}
