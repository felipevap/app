"use client";

import { useMemo, useState, useEffect } from "react";
import type { ContractParameter } from "@/lib/contract";
import { parsePlaceholders } from "@/lib/contract";

type Props = {
    text: string;
    parameters: ContractParameter[];
    onChange: (text: string, parameters: ContractParameter[]) => void;
    sourceFileName: string | null;
    onSourceFileName: (name: string | null) => void;
    title?: string;
    description?: string;
};

export default function ContractSegmentsBuilder({
    text,
    parameters,
    onChange,
    sourceFileName,
    onSourceFileName,
    title = "Modelo de contrato",
    description = "Cole o texto do contrato. Use {{nome_parametro}} para indicar onde os parâmetros serão inseridos.",
}: Props) {
    const [paramInputs, setParamInputs] = useState<{ name: string; type: 'text' | 'date' | 'number'; required: boolean }[]>(parameters);

    useEffect(() => {
        setParamInputs(parameters);
    }, [parameters]);

    const handleTextChange = (newText: string) => {
        const detected = parsePlaceholders(newText);
        const merged = detected.map((d) => {
            const existing = paramInputs.find((p) => p.name === d.name);
            return existing || d;
        });
        setParamInputs(merged);
        onChange(newText, merged);
    };

    const handleParamChange = (index: number, patch: Partial<ContractParameter>) => {
        const next = paramInputs.map((p, i) => i === index ? { ...p, ...patch } : p);
        setParamInputs(next);
        onChange(text, next);
    };

    const addParam = () => {
        const newParam = { name: `param${paramInputs.length + 1}`, type: 'text' as const, required: true };
        const next = [...paramInputs, newParam];
        setParamInputs(next);
        onChange(text, next);
    };

    const removeParam = (index: number) => {
        const next = paramInputs.filter((_, i) => i !== index);
        setParamInputs(next);
        onChange(text, next);
    };

    return (
        <div className="space-y-4 rounded-xl border border-violet-200 bg-violet-50/40 p-4">
            <h3 className="text-lg font-semibold text-violet-950">{title}</h3>
            <p className="text-sm text-violet-900/85">{description}</p>
            <div>
                <label className="block text-sm font-medium text-stone-700">Arquivo .txt do contrato (opcional)</label>
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
                            handleTextChange(t);
                        };
                        reader.readAsText(f, "UTF-8");
                    }}
                />
                {sourceFileName ? (
                    <p className="mt-1 text-xs text-stone-500">Arquivo: {sourceFileName}</p>
                ) : null}
            </div>

            <div>
                <label className="block text-sm font-medium text-stone-700">Texto do contrato</label>
                <textarea
                    value={text}
                    onChange={(e) => handleTextChange(e.target.value)}
                    rows={10}
                    className="mt-1 w-full rounded-md border border-stone-200 p-2 text-sm text-stone-900"
                    placeholder="Cole o texto do contrato aqui. Use {{parametro}} para placeholders."
                />
            </div>

            <div>
                <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-stone-700">Parâmetros detectados</label>
                    <button
                        type="button"
                        onClick={addParam}
                        className="rounded-md bg-violet-600 px-3 py-1 text-sm text-white hover:bg-violet-700"
                    >
                        Adicionar parâmetro
                    </button>
                </div>
                <div className="mt-2 space-y-2">
                    {paramInputs.map((param, i) => (
                        <div key={i} className="flex items-center gap-2 rounded-md border border-stone-200 bg-white p-2">
                            <input
                                type="text"
                                value={param.name}
                                onChange={(e) => handleParamChange(i, { name: e.target.value })}
                                className="flex-1 rounded border px-2 py-1 text-sm"
                                placeholder="Nome do parâmetro"
                            />
                            <select
                                value={param.type}
                                onChange={(e) => handleParamChange(i, { type: e.target.value as 'text' | 'date' | 'number' })}
                                className="rounded border px-2 py-1 text-sm"
                            >
                                <option value="text">Texto</option>
                                <option value="date">Data</option>
                                <option value="number">Número</option>
                            </select>
                            <label className="flex items-center gap-1 text-sm">
                                <input
                                    type="checkbox"
                                    checked={param.required}
                                    onChange={(e) => handleParamChange(i, { required: e.target.checked })}
                                />
                                Obrigatório
                            </label>
                            <button
                                type="button"
                                onClick={() => removeParam(i)}
                                className="rounded bg-red-600 px-2 py-1 text-sm text-white hover:bg-red-700"
                            >
                                Remover
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
