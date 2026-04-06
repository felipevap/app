"use client";

import { useMemo } from "react";
import type { ContractSegment } from "@/lib/contract";
import { CONTRACT_PARAM_OPTIONS } from "@/lib/contract";

type Props = {
    segments: ContractSegment[];
    onChange: (s: ContractSegment[]) => void;
    sourceFileName: string | null;
    onSourceFileName: (name: string | null) => void;
    title?: string;
    description?: string;
};

export default function ContractSegmentsBuilder({
    segments,
    onChange,
    sourceFileName,
    onSourceFileName,
    title = "Contrato parametrizável (primeiro acesso)",
    description = "Envie um arquivo .txt. O texto será dividido em blocos (parágrafos separados por linha em branco). Marque os blocos que devem ser preenchidos automaticamente com dados do evento.",
}: Props) {
    const hasSegments = segments.length > 0;

    const paramSelect = useMemo(() => CONTRACT_PARAM_OPTIONS, []);

    function updateRow(i: number, patch: Partial<ContractSegment>) {
        const next = segments.map((row, j) => (j === i ? { ...row, ...patch } : row));
        onChange(next);
    }

    return (
        <div className="space-y-4 rounded-xl border border-violet-200 bg-violet-50/40 p-4">
            <h3 className="text-lg font-semibold text-violet-950">{title}</h3>
            <p className="text-sm text-violet-900/85">{description}</p>
            <div>
                <label className="block text-sm font-medium text-stone-700">Arquivo .txt do contrato</label>
                <input
                    type="file"
                    accept=".txt,text/plain"
                    className="mt-1 block w-full text-sm text-stone-700"
                    onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        onSourceFileName(f.name);
                        const reader = new FileReader();
                        reader.onload = () => {
                            const t = typeof reader.result === "string" ? reader.result : "";
                            const parts = t
                                .split(/\n\s*\n/)
                                .map((s) => s.trim())
                                .filter(Boolean);
                            onChange(parts.map((text) => ({ text, paramKey: null })));
                        };
                        reader.readAsText(f, "UTF-8");
                    }}
                />
                {sourceFileName ? (
                    <p className="mt-1 text-xs text-stone-500">Arquivo: {sourceFileName}</p>
                ) : null}
            </div>

            {hasSegments ? (
                <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                    {segments.map((seg, i) => (
                        <div
                            key={i}
                            className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm"
                        >
                            <div className="mb-2 flex flex-wrap items-center gap-3">
                                <label className="flex items-center gap-2 text-sm text-stone-800">
                                    <input
                                        type="checkbox"
                                        checked={seg.paramKey !== null}
                                        onChange={(e) =>
                                            updateRow(i, {
                                                paramKey: e.target.checked ? "EVENT_NAME" : null,
                                            })
                                        }
                                    />
                                    Bloco parametrizável
                                </label>
                                {seg.paramKey !== null ? (
                                    <select
                                        value={seg.paramKey}
                                        onChange={(e) => updateRow(i, { paramKey: e.target.value || null })}
                                        className="rounded-md border border-stone-200 px-2 py-1 text-sm"
                                    >
                                        {paramSelect.map((o) => (
                                            <option key={o.value} value={o.value}>
                                                {o.label}
                                            </option>
                                        ))}
                                    </select>
                                ) : null}
                            </div>
                            <textarea
                                value={seg.text}
                                onChange={(e) => updateRow(i, { text: e.target.value })}
                                rows={Math.min(8, Math.max(2, Math.ceil(seg.text.length / 80)))}
                                className="w-full rounded-md border border-stone-200 p-2 text-sm text-stone-900"
                            />
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-stone-500">Nenhum bloco carregado. Envie um .txt para montar o contrato.</p>
            )}
        </div>
    );
}
