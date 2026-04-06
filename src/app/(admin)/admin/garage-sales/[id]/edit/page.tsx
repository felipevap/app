"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useGarageSales } from "@/contexts/GarageSaleContext";
import Toast from "@/components/Toast";
import ContractSegmentsBuilder from "@/components/ContractSegmentsBuilder";
import type { ContractSegment } from "@/lib/contract";
import { normalizeSegments } from "@/lib/contract";

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
        cep: "",
        cpf: "",
        pix: "",
        commissionPercent: "20",
    });
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; isVisible: boolean }>({ message: '', type: 'info', isVisible: false });
    const [preEventSegments, setPreEventSegments] = useState<ContractSegment[]>([]);
    const [preEventFileName, setPreEventFileName] = useState<string | null>(null);
    const [itemsComplete, setItemsComplete] = useState(false);
    const [itemsCompleteAt, setItemsCompleteAt] = useState<string | null>(null);
    type AccRow = {
        id: string;
        phase: string;
        acceptedAt: string;
        renderedBody: string;
        signaturePng: string;
        signer: { email: string; name: string | null };
    };
    const [acceptances, setAcceptances] = useState<AccRow[]>([]);
    const [contractsLoading, setContractsLoading] = useState(true);

    const showToast = (message: string, type: 'success' | 'error' | 'info') => {
        setToast({ message, type, isVisible: true });
    };

    const loadContracts = useCallback(async () => {
        if (!id) return;
        setContractsLoading(true);
        try {
            const res = await fetch(`/api/garage-sales/${id}/contracts`, { cache: "no-store" });
            if (!res.ok) return;
            const j = (await res.json()) as {
                itemsRegistrationComplete?: boolean;
                itemsRegistrationCompletedAt?: string | null;
                templates?: { phase: string; sourceFileName: string | null; segments: unknown }[];
                acceptances?: AccRow[];
            };
            setItemsComplete(!!j.itemsRegistrationComplete);
            setItemsCompleteAt(j.itemsRegistrationCompletedAt ?? null);
            setAcceptances(Array.isArray(j.acceptances) ? j.acceptances : []);
            const pre = j.templates?.find((t) => t.phase === "pre_event");
            const segs = pre?.segments ? normalizeSegments(pre.segments) : null;
            setPreEventSegments(segs ?? []);
            setPreEventFileName(pre?.sourceFileName ?? null);
        } finally {
            setContractsLoading(false);
        }
    }, [id]);

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
                    cep: garageSale.cep || "",
                    cpf: garageSale.cpf || "",
                    pix: garageSale.pix || "",
                    commissionPercent: String(
                        typeof garageSale.commissionPercent === "number"
                            ? garageSale.commissionPercent
                            : 20
                    ),
                });
                if (typeof garageSale.itemsRegistrationComplete === "boolean") {
                    setItemsComplete(garageSale.itemsRegistrationComplete);
                }
            }
        }
    }, [id, getGarageSale]);

    useEffect(() => {
        void loadContracts();
    }, [loadContracts]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { commissionPercent: commissionStr, ...rest } = formData;
            const parsed = parseFloat(commissionStr.replace(",", "."));
            await updateGarageSale(id, {
                ...rest,
                commissionPercent: Number.isFinite(parsed) ? parsed : 20,
            });
            showToast("Evento atualizado com sucesso!", "success");
            setTimeout(() => {
                router.push("/admin/garage-sales");
            }, 1000);
        } catch {
            showToast("Erro ao atualizar evento.", "error");
        }
    };

    async function savePreEventTemplate() {
        if (!id || preEventSegments.length === 0) {
            showToast("Carregue e monte o contrato pré-evento antes de salvar.", "error");
            return;
        }
        const res = await fetch(`/api/garage-sales/${id}/contract-template`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                phase: "pre_event",
                sourceFileName: preEventFileName,
                segments: preEventSegments,
            }),
        });
        if (!res.ok) {
            showToast("Falha ao salvar modelo do contrato pré-evento.", "error");
            return;
        }
        showToast("Contrato pré-evento salvo.", "success");
        void loadContracts();
    }

    async function toggleItemsComplete() {
        if (!id) return;
        const next = !itemsComplete;
        const res = await fetch(`/api/garage-sales/${id}/items-registration-complete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ complete: next }),
        });
        if (!res.ok) {
            showToast("Falha ao atualizar status dos itens.", "error");
            return;
        }
        const j = (await res.json()) as { itemsRegistrationComplete?: boolean; itemsRegistrationCompletedAt?: string | null };
        setItemsComplete(!!j.itemsRegistrationComplete);
        setItemsCompleteAt(j.itemsRegistrationCompletedAt ?? null);
        showToast(
            j.itemsRegistrationComplete ? "Marcado: todos os itens cadastrados." : "Status de itens reaberto.",
            "success"
        );
        void loadContracts();
    }

    function phaseLabel(phase: string) {
        if (phase === "onboarding") return "Adesão (primeiro acesso)";
        if (phase === "pre_event") return "Pré-evento";
        return phase;
    }

    return (
        <div className="max-w-4xl mx-auto">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-stone-900">Editar evento</h1>
                    <p className="text-stone-600">Atualize as informações do evento.</p>
                </div>
                <Link
                    href="/admin/garage-sales"
                    className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
                >
                    Cancelar
                </Link>
            </header>

            <form onSubmit={handleSubmit} className="space-y-8 rounded-2xl border border-stone-200 bg-white shadow-sm p-8 shadow-xl">
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
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-lg border border-stone-200 bg-white p-3 text-stone-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                required
                            />
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
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-stone-700">
                                Email do Responsável
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-lg border border-stone-200 bg-white p-3 text-stone-900 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                                required
                            />
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
                                Usada nos fechamentos do PDV e no portal do proprietário para este evento.
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
                        />
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-4 font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-white"
                    >
                        Salvar Alterações
                    </button>
                </div>

            </form>

            <section className="mt-10 space-y-6 rounded-2xl border border-amber-200 bg-amber-50/30 p-8 shadow-sm">
                <h2 className="text-xl font-semibold text-amber-950">Cadastro de itens e contrato pré-evento</h2>
                <p className="text-sm text-amber-950/85">
                    Quando todos os produtos estiverem cadastrados, confirme abaixo. Em seguida configure o segundo contrato
                    (arquivo .txt com parâmetros). O proprietário só poderá aceitá-lo após essa confirmação; o aceite
                    libera o fluxo do evento conforme combinado com a operação.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={() => void toggleItemsComplete()}
                        className={`rounded-xl px-5 py-3 text-sm font-semibold text-white shadow ${
                            itemsComplete ? "bg-stone-600 hover:bg-stone-700" : "bg-amber-600 hover:bg-amber-700"
                        }`}
                    >
                        {itemsComplete
                            ? "Reabrir cadastro de itens (desmarcar conclusão)"
                            : "Confirmar: todos os itens foram cadastrados"}
                    </button>
                    {itemsComplete && itemsCompleteAt ? (
                        <span className="text-sm text-stone-700">
                            Concluído em {new Date(itemsCompleteAt).toLocaleString("pt-BR")}
                        </span>
                    ) : null}
                </div>

                {contractsLoading ? (
                    <p className="text-sm text-stone-600">Carregando contratos…</p>
                ) : (
                    <ContractSegmentsBuilder
                        title="Contrato parametrizável pré-evento"
                        description="Mesmo fluxo do primeiro contrato: envie .txt por parágrafos e marque trechos parametrizáveis. O proprietário verá este texto para assinar depois que você marcar o cadastro de itens como concluído."
                        segments={preEventSegments}
                        onChange={setPreEventSegments}
                        sourceFileName={preEventFileName}
                        onSourceFileName={setPreEventFileName}
                    />
                )}
                <button
                    type="button"
                    onClick={() => void savePreEventTemplate()}
                    className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-700"
                >
                    Salvar modelo do contrato pré-evento
                </button>
            </section>

            <section className="mt-10 space-y-4 rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
                <h2 className="text-xl font-semibold text-stone-900">Assinaturas do proprietário</h2>
                <p className="text-sm text-stone-600">
                    O mesmo registro fica disponível no portal do proprietário (aba Contratos).
                </p>
                {acceptances.length === 0 ? (
                    <p className="text-sm text-stone-500">Nenhuma assinatura registrada ainda.</p>
                ) : (
                    <ul className="space-y-6">
                        {acceptances.map((a) => (
                            <li key={a.id} className="rounded-xl border border-stone-100 bg-stone-50 p-4">
                                <div className="flex flex-wrap justify-between gap-2">
                                    <span className="font-semibold text-stone-900">{phaseLabel(a.phase)}</span>
                                    <span className="text-xs text-stone-500">
                                        {new Date(a.acceptedAt).toLocaleString("pt-BR")} · {a.signer.email}
                                    </span>
                                </div>
                                <p className="mt-2 whitespace-pre-wrap text-sm text-stone-800">{a.renderedBody}</p>
                                <p className="mt-2 text-xs font-medium text-stone-500">Assinatura</p>
                                <img
                                    src={a.signaturePng}
                                    alt=""
                                    className="mt-1 max-h-36 max-w-full rounded border border-stone-200 bg-white"
                                />
                            </li>
                        ))}
                    </ul>
                )}
            </section>

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
