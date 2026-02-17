"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGarageSales } from "@/contexts/GarageSaleContext";
import Toast from "@/components/Toast";

export default function NewGarageSalePage() {
    const router = useRouter();
    const { addGarageSale } = useGarageSales();
    const [formData, setFormData] = useState({
        nome: "",
        dataInicio: "",
        dataFim: "",
        endereco: "",
        responsavel: "",
        email: "",
        regras: "",

        cep: "",
        cpf: "",
        pix: "",
    });
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; isVisible: boolean }>({ message: '', type: 'info', isVisible: false });

    const showToast = (message: string, type: 'success' | 'error' | 'info') => {
        setToast({ message, type, isVisible: true });
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const isValidCPF = (cpf: string) => {
        cpf = cpf.replace(/[^\d]+/g, '');
        if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
        let soma = 0;
        let resto;
        for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
        resto = (soma * 10) % 11;
        if ((resto === 10) || (resto === 11)) resto = 0;
        if (resto !== parseInt(cpf.substring(9, 10))) return false;
        soma = 0;
        for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
        resto = (soma * 10) % 11;
        if ((resto === 10) || (resto === 11)) resto = 0;
        if (resto !== parseInt(cpf.substring(10, 11))) return false;
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate CPF if provided
        if (formData.cpf && !isValidCPF(formData.cpf)) {
            showToast("CPF inválido. Verifique os dados inseridos.", "error");
            return;
        }

        try {
            await addGarageSale(formData);
            showToast("Garage Sale criada com sucesso!", "success");
            setTimeout(() => {
                router.push("/admin/garage-sales");
            }, 1000);
        } catch (error) {
            showToast("Erro ao criar Garage Sale.", "error");
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Nova Garage Sale</h1>
                    <p className="text-neutral-400">Crie um novo evento e atribua um responsável.</p>
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
                                placeholder="Bazar de Verão 2026"
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
                                placeholder="Rua Exemplo, 123, Cidade, Estado"
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
                                placeholder="João Silva"
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
                                placeholder="joao@exemplo.com"
                                required
                            />
                        </div>
                    </div>
                </div>

                <hr className="border-neutral-800" />

                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-green-400">Regras e Configuração</h2>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        <div>
                            <label className="block text-sm font-medium text-neutral-300">
                                CEP
                            </label>
                            <input
                                type="text"
                                name="cep"
                                value={formData.cep}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').substring(0, 9);
                                    setFormData(prev => ({ ...prev, cep: val }));
                                }}
                                className="mt-1 block w-full rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-white focus:border-green-500 focus:ring-1 focus:ring-green-500"
                                placeholder="00000-000"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-300">
                                CPF (Responsável)
                            </label>
                            <input
                                type="text"
                                name="cpf"
                                value={formData.cpf}
                                onChange={(e) => {
                                    let val = e.target.value.replace(/\D/g, '');
                                    if (val.length > 11) val = val.substring(0, 11);
                                    val = val.replace(/(\d{3})(\d)/, '$1.$2');
                                    val = val.replace(/(\d{3})(\d)/, '$1.$2');
                                    val = val.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                                    setFormData(prev => ({ ...prev, cpf: val }));
                                }}
                                className="mt-1 block w-full rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-white focus:border-green-500 focus:ring-1 focus:ring-green-500"
                                placeholder="000.000.000-00"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-300">
                                Chave PIX
                            </label>
                            <input
                                type="text"
                                name="pix"
                                value={formData.pix}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-white focus:border-green-500 focus:ring-1 focus:ring-green-500"
                                placeholder="Email, CPF, Telefone ou Aleatória"
                            />
                        </div>
                    </div>

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
                            placeholder="Digite as regras específicas para esta Garage Sale..."
                        />
                    </div>

                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-4 font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-neutral-900"
                    >
                        Criar Garage Sale
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
