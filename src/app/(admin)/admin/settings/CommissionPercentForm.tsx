"use client";

import { useState } from "react";
import { saveTenantDefaultCommission } from "./actions";

export default function CommissionPercentForm({ initialPercent }: { initialPercent: number }) {
    const [value, setValue] = useState(String(initialPercent));
    const [pending, setPending] = useState(false);
    const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setPending(true);
        setFeedback(null);
        const n = parseFloat(value.replace(",", "."));
        const r = await saveTenantDefaultCommission(n);
        setPending(false);
        if (r.error) {
            setFeedback({ type: "err", text: r.error });
            return;
        }
        setFeedback({ type: "ok", text: "Porcentagem padrão salva." });
    }

    return (
        <div className="mb-8 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-stone-900">Comissão padrão da operação</h2>
            <p className="mt-1 text-sm text-stone-600">
                Percentual aplicado nos relatórios de fechamento (PDV e portal). Ao criar um evento novo, este valor
                vem preenchido automaticamente; você pode alterar por evento se precisar de uma comissão diferenciada.
            </p>
            <form onSubmit={(e) => void onSubmit(e)} className="mt-4 flex flex-wrap items-end gap-4">
                <div>
                    <label htmlFor="default-commission" className="block text-sm font-medium text-stone-700">
                        Porcentagem (%)
                    </label>
                    <input
                        id="default-commission"
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="mt-1 w-32 rounded-lg border border-stone-200 p-2.5 text-stone-900"
                        required
                    />
                </div>
                <button
                    type="submit"
                    disabled={pending}
                    className="rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
                >
                    {pending ? "Salvando…" : "Salvar"}
                </button>
            </form>
            {feedback ? (
                <p
                    className={`mt-3 text-sm ${feedback.type === "ok" ? "text-emerald-700" : "text-red-700"}`}
                    role="status"
                >
                    {feedback.text}
                </p>
            ) : null}
        </div>
    );
}
