"use client";

import { useEffect, useMemo, useState } from "react";
import type { ContractParameter } from "@/lib/contract";
import { sanitizeContractHtml } from "@/lib/sanitize-html";
import { renderContractBody } from "@/lib/contract";

export type ContractTemplateOption = {
    id: string;
    name: string;
    type: "service" | "inventory";
    text: string;
    parameters: ContractParameter[];
};

export type AttachedContract = {
    id: string;
    name: string;
    type: string;
    filledParams: Record<string, string>;
};

type Props = {
    garageSaleId: string;
    attachedTemplates: AttachedContract[];
    onSaved: () => void;
    onError: (message: string) => void;
    onSuccess: (message: string) => void;
    disabled?: boolean;
};

const TYPE_LABELS: Record<string, string> = {
    service: "Contrato de prestação de serviço",
    inventory: "Contrato de inventário",
};

export default function EventContractSelector({
    garageSaleId,
    attachedTemplates,
    onSaved,
    onError,
    onSuccess,
    disabled,
}: Props) {
    const [templates, setTemplates] = useState<ContractTemplateOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedByType, setSelectedByType] = useState<Record<string, string>>({});
    const [paramValues, setParamValues] = useState<Record<string, Record<string, string>>>({});
    const [busyType, setBusyType] = useState<string | null>(null);
    const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch("/api/admin/contract-templates", { cache: "no-store" });
                if (!res.ok) return;
                const data = (await res.json()) as ContractTemplateOption[];
                if (!cancelled) setTemplates(data);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    // Seed current selections from what's already attached to this event.
    useEffect(() => {
        if (!templates.length) return;
        const sel: Record<string, string> = {};
        const params: Record<string, Record<string, string>> = {};
        for (const att of attachedTemplates) {
            sel[att.type] = att.id;
            params[att.id] = { ...(att.filledParams || {}) };
        }
        setSelectedByType((prev) => ({ ...sel, ...prev }));
        setParamValues((prev) => ({ ...params, ...prev }));
    }, [templates, attachedTemplates]);

    const templatesByType = useMemo(() => {
        const g: Record<string, ContractTemplateOption[]> = { service: [], inventory: [] };
        for (const t of templates) {
            if (t.type === "service" || t.type === "inventory") g[t.type].push(t);
        }
        return g;
    }, [templates]);

    const setTemplateForType = (type: string, templateId: string) => {
        setSelectedByType((prev) => ({ ...prev, [type]: templateId }));
        const existingValues = paramValues[templateId];
        if (!existingValues) {
            const tpl = templates.find((t) => t.id === templateId);
            const seed: Record<string, string> = {};
            for (const p of tpl?.parameters ?? []) seed[p.name] = "";
            setParamValues((prev) => ({ ...prev, [templateId]: seed }));
        }
    };

    const setParamValue = (templateId: string, name: string, value: string) => {
        setParamValues((prev) => ({
            ...prev,
            [templateId]: { ...(prev[templateId] ?? {}), [name]: value },
        }));
    };

    const save = async (type: string) => {
        const templateId = selectedByType[type];
        if (!templateId) {
            onError("Selecione um modelo antes de salvar.");
            return;
        }
        const tpl = templates.find((t) => t.id === templateId);
        if (!tpl) {
            onError("Modelo inválido.");
            return;
        }
        const filled = paramValues[templateId] ?? {};
        const missing = tpl.parameters
            .filter((p) => p.required && !(filled[p.name] && filled[p.name].trim()))
            .map((p) => p.name);
        if (missing.length) {
            onError(`Preencha os parâmetros obrigatórios: ${missing.join(", ")}`);
            return;
        }

        setBusyType(type);
        try {
            const res = await fetch(`/api/garage-sales/${garageSaleId}/contract-template`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ templateId, filledParams: filled }),
            });
            if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                onError(j.error ?? "Falha ao salvar contrato no evento.");
                return;
            }
            onSuccess(`Contrato ${TYPE_LABELS[type] ?? type} salvo.`);
            onSaved();
        } finally {
            setBusyType(null);
        }
    };

    const detach = async (type: string) => {
        const templateId = selectedByType[type];
        if (!templateId) return;
        if (!confirm("Remover este contrato do evento? Essa ação é bloqueada se o contrato já tiver sido assinado.")) return;
        setBusyType(type);
        try {
            const res = await fetch(
                `/api/garage-sales/${garageSaleId}/contract-template?templateId=${encodeURIComponent(
                    templateId
                )}`,
                { method: "DELETE" }
            );
            if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                onError(j.error ?? "Falha ao remover contrato.");
                return;
            }
            setSelectedByType((prev) => {
                const next = { ...prev };
                delete next[type];
                return next;
            });
            onSuccess("Contrato removido do evento.");
            onSaved();
        } finally {
            setBusyType(null);
        }
    };

    if (loading) {
        return <p className="text-sm text-stone-600">Carregando modelos…</p>;
    }

    return (
        <div className="space-y-6">
            {(["service", "inventory"] as const).map((type) => {
                const options = templatesByType[type] ?? [];
                const selectedId = selectedByType[type] ?? "";
                const tpl = templates.find((t) => t.id === selectedId);
                const already = attachedTemplates.find((a) => a.type === type);
                const busy = busyType === type;

                return (
                    <div
                        key={type}
                        className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
                    >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="text-base font-semibold text-stone-900">
                                {TYPE_LABELS[type]}
                            </h3>
                            {already && (
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                                    Atribuído: {already.name}
                                </span>
                            )}
                        </div>

                        {options.length === 0 ? (
                            <p className="mt-3 rounded-md bg-amber-50 p-2 text-sm text-amber-900 ring-1 ring-amber-200">
                                Nenhum modelo do tipo{" "}
                                <span className="font-semibold">{TYPE_LABELS[type]}</span>{" "}
                                encontrado. Crie um em{" "}
                                <a
                                    className="underline"
                                    href="/admin/contract-templates"
                                >
                                    Modelos de contrato
                                </a>
                                .
                            </p>
                        ) : (
                            <div className="mt-3 space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-stone-700">
                                        Modelo
                                    </label>
                                    <select
                                        value={selectedId}
                                        onChange={(e) => setTemplateForType(type, e.target.value)}
                                        disabled={disabled || busy}
                                        className="mt-1 block w-full rounded-md border border-stone-200 bg-white p-2 text-sm"
                                    >
                                        <option value="">— Selecionar —</option>
                                        {options.map((o) => (
                                            <option key={o.id} value={o.id}>
                                                {o.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {tpl && (
                                    <div className="space-y-3">
                                        {tpl.parameters.length > 0 && (
                                            <div>
                                                <p className="text-sm font-medium text-stone-700">
                                                    Parâmetros
                                                </p>
                                                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                    {tpl.parameters.map((p) => {
                                                        const val =
                                                            paramValues[tpl.id]?.[p.name] ?? "";
                                                        const inputType =
                                                            p.type === "date"
                                                                ? "date"
                                                                : p.type === "number"
                                                                ? "number"
                                                                : "text";
                                                        return (
                                                            <label
                                                                key={p.name}
                                                                className="flex flex-col gap-1 text-xs text-stone-700"
                                                            >
                                                                <span>
                                                                    {p.name}
                                                                    {p.required ? (
                                                                        <span className="ml-1 text-red-500">
                                                                            *
                                                                        </span>
                                                                    ) : null}
                                                                </span>
                                                                <input
                                                                    type={inputType}
                                                                    value={val}
                                                                    disabled={disabled || busy}
                                                                    onChange={(e) =>
                                                                        setParamValue(
                                                                            tpl.id,
                                                                            p.name,
                                                                            e.target.value
                                                                        )
                                                                    }
                                                                    className="rounded border border-stone-200 p-2 text-sm"
                                                                    maxLength={5000}
                                                                />
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() => save(type)}
                                                disabled={disabled || busy}
                                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                                            >
                                                {busy ? "Salvando…" : "Salvar contrato no evento"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setPreviewTemplateId((cur) =>
                                                        cur === tpl.id ? null : tpl.id
                                                    )
                                                }
                                                className="rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
                                            >
                                                {previewTemplateId === tpl.id
                                                    ? "Ocultar pré-visualização"
                                                    : "Pré-visualizar"}
                                            </button>
                                            {already && (
                                                <button
                                                    type="button"
                                                    onClick={() => detach(type)}
                                                    disabled={disabled || busy}
                                                    className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
                                                >
                                                    Remover do evento
                                                </button>
                                            )}
                                        </div>

                                        {previewTemplateId === tpl.id && (
                                            <div
                                                className="rounded-lg border border-stone-100 bg-stone-50 p-3 text-sm text-stone-800"
                                                dangerouslySetInnerHTML={{
                                                    __html: sanitizeContractHtml(
                                                        renderContractBody(
                                                            tpl.text,
                                                            paramValues[tpl.id] ?? {}
                                                        )
                                                    ),
                                                }}
                                            />
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
