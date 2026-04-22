"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useGarageSales } from "@/contexts/GarageSaleContext";
import Toast from "@/components/Toast";
import EventContractSelector from "@/components/EventContractSelector";
import { sanitizeContractHtml } from "@/lib/sanitize-html";
import { normalizeEventSlug } from "@/lib/slug";

export default function EditGarageSalePage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;
    const { getGarageSale, updateGarageSale } = useGarageSales();

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
        arScoreThreshold: "0.72",
        reservationTTLMinutes: "30",
    });
    const [isSlugAvailable, setIsSlugAvailable] = useState<boolean | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; isVisible: boolean }>({ message: '', type: 'info', isVisible: false });
    const [itemsComplete, setItemsComplete] = useState(false);
    const [itemsCompleteAt, setItemsCompleteAt] = useState<string | null>(null);
    type AccRow = {
        id: string;
        templateName: string;
        templateType: string;
        acceptedAt: string;
        renderedBody: string;
        signaturePng: string;
        signer: { email: string; name: string | null };
    };
    const [acceptances, setAcceptances] = useState<AccRow[]>([]);
    const [contractsLoading, setContractsLoading] = useState(true);
    const [attachedTemplates, setAttachedTemplates] = useState<
        { id: string; name: string; type: string; filledParams: Record<string, string> }[]
    >([]);

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
                templates?: { id: string; name: string; type: string; filledParams: Record<string, string> }[];
                acceptances?: AccRow[];
            };
            setItemsComplete(!!j.itemsRegistrationComplete);
            setItemsCompleteAt(j.itemsRegistrationCompletedAt ?? null);
            setAcceptances(Array.isArray(j.acceptances) ? j.acceptances : []);
            setAttachedTemplates(Array.isArray(j.templates) ? j.templates : []);
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
                    slug: garageSale.slug || "",
                    dataInicio: garageSale.dataInicio ? new Date(garageSale.dataInicio).toISOString().split('T')[0] : "",
                    dataFim: garageSale.dataFim ? new Date(garageSale.dataFim).toISOString().split('T')[0] : "",
                    horarioInicio: garageSale.horarioInicio || "",
                    horarioFim: garageSale.horarioFim || "",
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
                    arScoreThreshold: String(
                        typeof garageSale.arScoreThreshold === "number"
                            ? garageSale.arScoreThreshold
                            : 0.72
                    ),
                    reservationTTLMinutes: String(
                        typeof garageSale.reservationTTLMinutes === "number"
                            ? garageSale.reservationTTLMinutes
                            : 30
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

    useEffect(() => {
        const slug = normalizeEventSlug(formData.slug);
        if (!slug || !id) {
            setIsSlugAvailable(null);
            return;
        }
        let cancelled = false;
        const timer = setTimeout(async () => {
            const res = await fetch(
                `/api/garage-sales/slug-availability?slug=${encodeURIComponent(slug)}&excludeId=${encodeURIComponent(id)}`,
                { cache: "no-store" }
            );
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
    }, [formData.slug, id]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!normalizeEventSlug(formData.slug)) {
            showToast("Informe um slug válido para o link do evento.", "error");
            return;
        }
        if (isSlugAvailable === false) {
            showToast("Esse slug já está em uso. Escolha outro.", "error");
            return;
        }
        try {
            const {
                commissionPercent: commissionStr,
                arScoreThreshold: arStr,
                reservationTTLMinutes: ttlStr,
                ...rest
            } = formData;
            const parsedCommission = parseFloat(commissionStr.replace(",", "."));
            const parsedAr = parseFloat(arStr.replace(",", "."));
            const parsedTTL = parseInt(ttlStr, 10);
            await updateGarageSale(id, {
                ...rest,
                commissionPercent: Number.isFinite(parsedCommission) ? parsedCommission : 20,
                arScoreThreshold: Number.isFinite(parsedAr) ? parsedAr : 0.72,
                reservationTTLMinutes: Number.isFinite(parsedTTL) ? parsedTTL : 30,
            });
            showToast("Evento atualizado com sucesso!", "success");
            setTimeout(() => {
                router.push("/admin/garage-sales");
            }, 1000);
        } catch {
            showToast("Erro ao atualizar evento.", "error");
        }
    };

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

    function contractLabel(type: string) {
        if (type === "service") return "Contrato de prestação de serviço";
        if (type === "inventory") return "Contrato de inventário";
        return type;
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
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-stone-700">Nome do evento</label>
                            <input
                                type="text"
                                name="slug"
                                value={formData.slug}
                                onChange={(e) => {
                                    const value = normalizeEventSlug(e.target.value);
                                    setFormData((prev) => ({ ...prev, slug: value }));
                                }}
                                className="mt-1 block w-full rounded-lg border border-stone-200 bg-white p-3 text-stone-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                required
                            />
                            <p className={`mt-1 text-xs ${isSlugAvailable === false ? "text-red-500" : "text-stone-500"}`}>
                                Esse nome vira o link público automaticamente.
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
                        <div>
                            <label className="block text-sm font-medium text-stone-700">
                                Limiar de reconhecimento (AR)
                            </label>
                            <input
                                type="number"
                                min={0.55}
                                max={0.95}
                                step={0.01}
                                name="arScoreThreshold"
                                value={formData.arScoreThreshold}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-lg border border-stone-200 bg-white p-3 text-stone-900 focus:border-green-500 focus:ring-1 focus:ring-green-500"
                            />
                            <p className="mt-1 text-xs text-stone-500">
                                Entre 0.55 e 0.95. Valores mais baixos reconhecem mais produtos, mas podem causar confusões.
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-stone-700">
                                TTL de reserva (minutos)
                            </label>
                            <input
                                type="number"
                                min={5}
                                max={1440}
                                step={1}
                                name="reservationTTLMinutes"
                                value={formData.reservationTTLMinutes}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-lg border border-stone-200 bg-white p-3 text-stone-900 focus:border-green-500 focus:ring-1 focus:ring-green-500"
                            />
                            <p className="mt-1 text-xs text-stone-500">
                                Tempo máximo antes de liberar o produto se a reserva não for paga.
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
                    <div className="space-y-4">
                        <p className="text-sm text-stone-600">
                            Selecione os contratos deste evento e preencha os parâmetros. O proprietário assinará o contrato de serviço primeiro; o de inventário ficará disponível depois que o cadastro de itens for confirmado.
                        </p>
                        <EventContractSelector
                            garageSaleId={id}
                            attachedTemplates={attachedTemplates}
                            onSaved={() => void loadContracts()}
                            onError={(m) => showToast(m, "error")}
                            onSuccess={(m) => showToast(m, "success")}
                        />
                    </div>
                )}
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
                                    <span className="font-semibold text-stone-900">{a.templateName || contractLabel(a.templateType)}</span>
                                    <span className="text-xs text-stone-500">
                                        {new Date(a.acceptedAt).toLocaleString("pt-BR")} · {a.signer.email}
                                    </span>
                                </div>
                                <div
                                    className="mt-2 text-sm text-stone-800"
                                    dangerouslySetInnerHTML={{
                                        __html: sanitizeContractHtml(a.renderedBody),
                                    }}
                                />
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
