"use client";

import { useEffect, useState } from "react";
import { useGarageSales } from "@/contexts/GarageSaleContext";

type ReindexStatus = "idle" | "running" | "done";

interface ProductRow {
    id: string;
    nome: string;
    imagens: string[];
    embedding?: number[] | null;
}

export default function ReindexProductsForm() {
    const { garageSales, loading: garageSalesLoading } = useGarageSales();
    const [selectedGarageSaleId, setSelectedGarageSaleId] = useState<string>("");
    const [status, setStatus] = useState<ReindexStatus>("idle");
    const [processed, setProcessed] = useState(0);
    const [total, setTotal] = useState(0);
    const [ok, setOk] = useState(0);
    const [failed, setFailed] = useState(0);
    const [missingOnly, setMissingOnly] = useState(true);
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        if (!selectedGarageSaleId && garageSales.length > 0) {
            setSelectedGarageSaleId(garageSales[0].id);
        }
    }, [garageSales, selectedGarageSaleId]);

    const run = async () => {
        if (!selectedGarageSaleId || status === "running") return;
        setStatus("running");
        setProcessed(0);
        setOk(0);
        setFailed(0);
        setMessage(null);

        try {
            const params = new URLSearchParams({
                garageSaleId: selectedGarageSaleId,
                page: "1",
                limit: "1000",
                includeDeleted: "false",
                search: "",
                category: "",
                condition: "",
                indexing: missingOnly ? "missing" : "",
                images: "",
            });
            const res = await fetch(`/api/products?${params.toString()}`, { cache: "no-store" });
            if (!res.ok) throw new Error("Falha ao carregar produtos");
            const j = (await res.json()) as { data?: ProductRow[] };
            const rows = (j.data || []).filter((p) => Array.isArray(p.imagens) && p.imagens.length > 0);
            setTotal(rows.length);

            if (rows.length === 0) {
                setMessage("Nenhum produto com fotos para reindexar.");
                setStatus("done");
                return;
            }

            const { computeProductEmbeddingMean } = await import("@/utils/productEmbedding");

            for (const row of rows) {
                try {
                    const embedding = await computeProductEmbeddingMean(row.imagens);
                    if (!embedding) {
                        setFailed((n) => n + 1);
                    } else {
                        const putRes = await fetch(`/api/products/${row.id}`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ embedding }),
                        });
                        if (putRes.ok) setOk((n) => n + 1);
                        else setFailed((n) => n + 1);
                    }
                } catch {
                    setFailed((n) => n + 1);
                } finally {
                    setProcessed((n) => n + 1);
                }
            }

            setStatus("done");
        } catch (e) {
            setMessage(e instanceof Error ? e.message : "Erro inesperado");
            setStatus("done");
        }
    };

    const pct = total > 0 ? Math.round((processed / total) * 100) : 0;

    return (
        <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-xl font-bold text-stone-900">Reindexar produtos (AR)</h2>
            <p className="mb-4 text-sm text-stone-600">
                Recalcula o embedding de reconhecimento para todos os produtos com foto do evento selecionado. Roda no navegador — pode levar alguns minutos.
            </p>

            {garageSalesLoading ? (
                <p className="text-sm text-stone-500">Carregando eventos…</p>
            ) : garageSales.length === 0 ? (
                <p className="text-sm text-stone-500">Nenhum evento cadastrado.</p>
            ) : (
                <>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1">Evento</label>
                            <select
                                value={selectedGarageSaleId}
                                onChange={(e) => setSelectedGarageSaleId(e.target.value)}
                                disabled={status === "running"}
                                className="w-full rounded-lg border border-stone-300 bg-white p-3 text-stone-900 focus:border-blue-500 focus:outline-none"
                            >
                                {garageSales.map((gs) => (
                                    <option key={gs.id} value={gs.id}>{gs.nome}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-end">
                            <label className="inline-flex items-center gap-2 text-sm text-stone-700 select-none cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={missingOnly}
                                    onChange={(e) => setMissingOnly(e.target.checked)}
                                    disabled={status === "running"}
                                    className="h-4 w-4 rounded border-stone-300 text-blue-600 focus:ring-blue-500"
                                />
                                Somente produtos sem índice
                            </label>
                        </div>
                    </div>

                    <div className="mt-4 flex items-center gap-3">
                        <button
                            type="button"
                            onClick={run}
                            disabled={status === "running" || !selectedGarageSaleId}
                            className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-3 font-semibold text-white shadow-md transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {status === "running" ? "Reindexando…" : "Reindexar agora"}
                        </button>
                        {status !== "idle" && total > 0 && (
                            <div className="flex-1">
                                <div className="mb-1 flex items-center justify-between text-xs text-stone-600">
                                    <span>{processed} / {total}</span>
                                    <span>{ok} ok · {failed} falha{failed !== 1 ? 's' : ''}</span>
                                </div>
                                <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {message && (
                        <p className="mt-3 text-sm text-stone-600">{message}</p>
                    )}
                </>
            )}
        </div>
    );
}
