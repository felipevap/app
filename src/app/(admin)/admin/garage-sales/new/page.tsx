"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGarageSales } from "@/contexts/GarageSaleContext";
import Toast from "@/components/Toast";
import type { ContractParameter } from "@/lib/contract";
import { normalizeEventSlug } from "@/lib/slug";

type TenantOption = { id: string; name: string; slug: string };

type ContractTemplate = {
    id: string;
    name: string;
    type: "service" | "inventory";
    parameters: ContractParameter[];
};

export default function NewGarageSalePage() {
    const router = useRouter();
    const { addGarageSale } = useGarageSales();
    const [tenantOptions, setTenantOptions] = useState<TenantOption[]>([]);
    const [tenantId, setTenantId] = useState("");
    const [contractTemplates, setContractTemplates] = useState<ContractTemplate[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState("");
    const [filledParams, setFilledParams] = useState<Record<string, string>>({});
    const [formData, setFormData] = useState({
        nome: "",
        slug: "",
        dataInicio: "",
        dataFim: "",
        horarioInicio: "",
        horarioFim: "",
        endereco: "",
        responsavel: "",
        email: "",
        regras: "",

        cep: "",
        cpf: "",
        pix: "",
        commissionPercent: "20",
    });
    const [isSlugAvailable, setIsSlugAvailable] = useState<boolean | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; isVisible: boolean }>({ message: '', type: 'info', isVisible: false });

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const [tenantRes, templateRes] = await Promise.all([
                fetch("/api/tenants", { cache: "no-store" }),
                fetch("/api/admin/contract-templates", { cache: "no-store" }),
            ]);
            if (!cancelled && tenantRes.ok) {
                const data = (await tenantRes.json()) as TenantOption[];
                if (Array.isArray(data)) {
                    setTenantOptions(data);
                }
            }
            if (!cancelled && templateRes.ok) {
                const templates = await templateRes.json();
                setContractTemplates(templates);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        const slug = normalizeEventSlug(formData.slug);
        if (!slug) return;
        let cancelled = false;
        const timer = setTimeout(async () => {
            const res = await fetch(`/api/garage-sales/slug-availability?slug=${encodeURIComponent(slug)}`, { cache: "no-store" });
            if (!res.ok || cancelled) return;
            const payload = (await res.json()) as { available?: boolean; normalized?: string };
            if (!cancelled) {
                if (payload.normalized && payload.normalized !== formData.slug) {
                    setFormData((prev) => ({ ...prev, slug: payload.normalized || prev.slug }));
                }
                setIsSlugAvailable(!!payload.available);
            }
        }, 300);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [formData.slug]);

    async function loadTenantDefaultCommission(tid: string | null) {
        const q = tid ? `?tenantId=${encodeURIComponent(tid)}` : "";
        const res = await fetch(`/api/tenant/defaults${q}`, { cache: "no-store" });
        if (!res.ok) return;
        const j = (await res.json()) as { defaultCommissionPercent?: number };
        if (typeof j.defaultCommissionPercent === "number") {
            setFormData((prev) => ({
                ...prev,
                commissionPercent: String(j.defaultCommissionPercent),
            }));
        }
    }

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (tenantOptions.length > 0) {
                if (!tenantId) return;
                if (cancelled) return;
                await loadTenantDefaultCommission(tenantId);
            } else {
                if (cancelled) return;
                await loadTenantDefaultCommission(null);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [tenantId, tenantOptions.length]);

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

        if (tenantOptions.length > 0 && !tenantId) {
            showToast("Selecione a organização (tenant) do evento.", "error");
            return;
        }
        if (!normalizeEventSlug(formData.slug)) {
            showToast("Informe um slug válido para o link do evento.", "error");
            return;
        }
        if (isSlugAvailable === false) {
            showToast("Esse slug já está em uso. Escolha outro.", "error");
            return;
        }

        if (!selectedTemplateId) {
            showToast("Selecione um modelo de contrato.", "error");
            return;
        }

        // Validate required params
        const selectedTemplate = contractTemplates.find(t => t.id === selectedTemplateId);
        if (selectedTemplate) {
            for (const param of selectedTemplate.parameters) {
                if (param.required && !filledParams[param.name]?.trim()) {
                    showToast(`Parâmetro obrigatório: ${param.name}`, "error");
                    return;
                }
            }
        }

        try {
            const { commissionPercent: commissionStr, ...restForm } = formData;
            const parsed = parseFloat(commissionStr.replace(",", "."));
            await addGarageSale({
                ...restForm,
                commissionPercent: Number.isFinite(parsed) ? parsed : 20,
                ...(tenantOptions.length > 0 && tenantId ? { tenantId } : {}),
                contractTemplateId: selectedTemplateId,
                filledParams,
            });
            showToast("Evento criado com sucesso!", "success");
            setTimeout(() => {
                router.push("/admin/garage-sales");
            }, 1000);
        } catch (error) {
            const msg = error instanceof Error ? error.message : "Erro ao criar evento.";
            showToast(msg, "error");
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-stone-900">Novo evento</h1>
                    <p className="text-stone-600">Crie um novo evento e atribua um responsável.</p>
                </div>
                <Link
                    href="/admin/garage-sales"
                    className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
                >
                    Cancelar
                </Link>
            </header>

            <form onSubmit={handleSubmit} className="space-y-8 rounded-2xl border border-stone-200 bg-white shadow-sm p-8 shadow-xl">
                {tenantOptions.length > 0 && (
                    <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                        <h2 className="text-xl font-semibold text-amber-900">Organização</h2>
                        <p className="text-sm text-amber-900/80">
                            Super admin: escolha em qual tenant o evento será criado.
                        </p>
                        <label className="block text-sm font-medium text-stone-700">Organização (tenant)</label>
                        <select
                            value={tenantId}
                            onChange={(e) => setTenantId(e.target.value)}
                            className="mt-1 block w-full max-w-md rounded-lg border border-stone-200 bg-white p-3 text-stone-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                            required={tenantOptions.length > 0}
                        >
                            <option value="">Selecione…</option>
                            {tenantOptions.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.name} ({t.slug})
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-blue-400">Detalhes do Evento</h2>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-stone-700">
                                Nome do evento
                            </label>
                            <input
                                type="text"
                                name="nome"
                                value={formData.nome}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setFormData((prev) => ({
                                        ...prev,
                                        nome: value,
                                        slug: prev.slug || normalizeEventSlug(value),
                                    }));
                                }}
                                className="mt-1 block w-full rounded-lg border border-stone-200 bg-white p-3 text-stone-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                placeholder="Garage Sale Verão 2026"
                                required
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-stone-700">Slug do portal</label>
                            <input
                                type="text"
                                name="slug"
                                value={formData.slug}
                                onChange={(e) => {
                                    const value = normalizeEventSlug(e.target.value);
                                    setFormData((prev) => ({ ...prev, slug: value }));
                                    if (!value) setIsSlugAvailable(null);
                                }}
                                className="mt-1 block w-full rounded-lg border border-stone-200 bg-white p-3 text-stone-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                placeholder="garage-sale-verao-2026"
                                required
                            />
                            <p className={`mt-1 text-xs ${isSlugAvailable === false ? "text-red-500" : "text-stone-500"}`}>
                                Link do evento: /evento/{formData.slug || "seu-slug"}
                                {isSlugAvailable === true ? " (disponível)" : ""}
                                {isSlugAvailable === false ? " (indisponível)" : ""}
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-stone-700">
                                Data de Início
                            </label>
                            <input
                                type="date"
                                name="dataInicio"
                                value={formData.dataInicio}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-lg border border-stone-200 bg-white p-3 text-stone-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-stone-700">Horário de Início</label>
                            <input
                                type="time"
                                name="horarioInicio"
                                value={formData.horarioInicio}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-lg border border-stone-200 bg-white p-3 text-stone-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-stone-700">Horário de Término</label>
                            <input
                                type="time"
                                name="horarioFim"
                                value={formData.horarioFim}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-lg border border-stone-200 bg-white p-3 text-stone-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-stone-700">
                                Data de Término
                            </label>
                            <input
                                type="date"
                                name="dataFim"
                                value={formData.dataFim}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-lg border border-stone-200 bg-white p-3 text-stone-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-stone-700">
                                Endereço
                            </label>
                            <input
                                type="text"
                                name="endereco"
                                value={formData.endereco}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-lg border border-stone-200 bg-white p-3 text-stone-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                placeholder="Rua Exemplo, 123, Cidade, Estado"
                                required
                            />
                        </div>
                    </div>
                </div>

                <hr className="border-stone-200" />

                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-purple-400">Responsável</h2>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-stone-700">
                                Nome do Responsável
                            </label>
                            <input
                                type="text"
                                name="responsavel"
                                value={formData.responsavel}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-lg border border-stone-200 bg-white p-3 text-stone-900 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                                placeholder="João Silva"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-stone-700">
                                E-mail do proprietário (portal)
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-lg border border-stone-200 bg-white p-3 text-stone-900 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                                placeholder="joao@exemplo.com"
                                required
                            />
                            <p className="mt-1 text-xs text-stone-500">
                                Será criado acesso ao portal do proprietário com senha inicial 12345 (não use o e-mail de um membro da equipe).
                            </p>
                        </div>
                    </div>
                </div>

                <hr className="border-stone-200" />

                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-green-400">Regras e Configuração</h2>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        <div>
                            <label className="block text-sm font-medium text-stone-700">
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
                                className="mt-1 block w-full rounded-lg border border-stone-200 bg-white p-3 text-stone-900 focus:border-green-500 focus:ring-1 focus:ring-green-500"
                                placeholder="00000-000"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-stone-700">
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
                                className="mt-1 block w-full rounded-lg border border-stone-200 bg-white p-3 text-stone-900 focus:border-green-500 focus:ring-1 focus:ring-green-500"
                                placeholder="000.000.000-00"
                            />
                        </div>
                    <div>
                        <label className="block text-sm font-medium text-stone-700">
                            Chave PIX
                            </label>
                            <input
                                type="text"
                                name="pix"
                                value={formData.pix}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-lg border border-stone-200 bg-white p-3 text-stone-900 focus:border-green-500 focus:ring-1 focus:ring-green-500"
                                placeholder="Email, CPF, Telefone ou Aleatória"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-stone-700">
                                Comissão neste evento (%)
                            </label>
                            <input
                                type="number"
                                min={0}
                                max={100}
                                step={0.5}
                                name="commissionPercent"
                                value={formData.commissionPercent}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-lg border border-stone-200 bg-white p-3 text-stone-900 focus:border-green-500 focus:ring-1 focus:ring-green-500"
                                required
                            />
                            <p className="mt-1 text-xs text-stone-500">
                                Preenchido com o padrão das configurações; altere só se este evento tiver outra comissão.
                            </p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-stone-700">
                            Regras e Termos
                        </label>
                        <textarea
                            name="regras"
                            value={formData.regras}
                            onChange={handleChange}
                            rows={4}
                            className="mt-1 block w-full rounded-lg border border-stone-200 bg-white p-3 text-stone-900 focus:border-green-500 focus:ring-1 focus:ring-green-500"
                            placeholder="Digite as regras específicas para este evento..."
                        />
                    </div>
                </div>

                <hr className="border-stone-200" />

                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-red-400">Contrato</h2>
                    <div>
                        <label className="block text-sm font-medium text-stone-700">Modelo de Contrato</label>
                        <select
                            value={selectedTemplateId}
                            onChange={(e) => {
                                setSelectedTemplateId(e.target.value);
                                setFilledParams({});
                            }}
                            className="mt-1 block w-full rounded-lg border border-stone-200 bg-white p-3 text-stone-900 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                            required
                        >
                            <option value="">Selecione um modelo...</option>
                            {contractTemplates.map((template) => (
                                <option key={template.id} value={template.id}>
                                    {template.name} ({template.type === "service" ? "Serviço" : "Inventário"})
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedTemplateId && (() => {
                        const template = contractTemplates.find(t => t.id === selectedTemplateId);
                        return template ? (
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium">Parâmetros do Contrato</h3>
                                {template.parameters.map((param) => (
                                    <div key={param.name}>
                                        <label className="block text-sm font-medium text-stone-700">
                                            {param.name} {param.required && <span className="text-red-500">*</span>}
                                        </label>
                                        <input
                                            type={param.type === 'date' ? 'date' : param.type === 'number' ? 'number' : 'text'}
                                            value={filledParams[param.name] || ''}
                                            onChange={(e) => setFilledParams(prev => ({ ...prev, [param.name]: e.target.value }))}
                                            className="mt-1 block w-full rounded-lg border border-stone-200 bg-white p-3 text-stone-900 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                                            required={param.required}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : null;
                    })()}
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-4 font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-white"
                    >
                        Criar evento
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
