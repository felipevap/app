"use client";

import { useState, useEffect } from "react";
import ContractBuilder from "@/components/ContractBuilder";
import type { ContractParameter } from "@/lib/contract";
import { sanitizeContractHtml } from "@/lib/sanitize-html";

type ContractTemplate = {
    id: string;
    name: string;
    type: "service" | "inventory";
    text: string;
    parameters: ContractParameter[];
    createdAt: string;
};

export default function ContractTemplatesPage() {
    const [templates, setTemplates] = useState<ContractTemplate[]>([]);
    const [editing, setEditing] = useState<ContractTemplate | null>(null);
    const [name, setName] = useState("");
    const [type, setType] = useState<"service" | "inventory">("service");
    const [text, setText] = useState("");
    const [parameters, setParameters] = useState<ContractParameter[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        const res = await fetch("/api/admin/contract-templates");
        if (res.ok) {
            const data = await res.json();
            setTemplates(data);
        }
    };

    const handleSave = async () => {
        setError(null);
        if (!name.trim()) {
            setError("Informe um nome para o modelo.");
            return;
        }
        if (!text.trim()) {
            setError("O texto do contrato está vazio.");
            return;
        }
        setSaving(true);
        try {
            const payload = { name, type, text, parameters };
            const method = editing ? "PUT" : "POST";
            const url = editing
                ? `/api/admin/contract-templates/${editing.id}`
                : "/api/admin/contract-templates";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                setError(j.error ?? "Falha ao salvar modelo.");
                return;
            }
            await fetchTemplates();
            resetForm();
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (template: ContractTemplate) => {
        setEditing(template);
        setName(template.name);
        setType(template.type);
        setText(template.text);
        setParameters(template.parameters);
        setError(null);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Tem certeza que deseja excluir este modelo?")) {
            const res = await fetch(`/api/admin/contract-templates/${id}`, { method: "DELETE" });
            if (res.ok) await fetchTemplates();
        }
    };

    const resetForm = () => {
        setEditing(null);
        setName("");
        setType("service");
        setText("");
        setParameters([]);
        setError(null);
    };

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">Modelos de Contrato</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                    <h2 className="text-xl font-semibold mb-4">
                        {editing ? "Editar Modelo" : "Novo Modelo"}
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium">Nome</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                maxLength={200}
                                className="mt-1 w-full rounded-md border border-gray-300 p-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Tipo</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value as "service" | "inventory")}
                                className="mt-1 w-full rounded-md border border-gray-300 p-2"
                            >
                                <option value="service">Contrato de prestação de serviço</option>
                                <option value="inventory">Contrato de inventário</option>
                            </select>
                        </div>
                        <ContractBuilder
                            html={text}
                            parameters={parameters}
                            onChange={(nextHtml, nextParams) => {
                                setText(nextHtml);
                                setParameters(nextParams);
                            }}
                        />

                        {error && (
                            <p className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                                {error}
                            </p>
                        )}

                        <div className="flex gap-2">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
                            >
                                {saving ? "Salvando…" : editing ? "Atualizar" : "Criar"}
                            </button>
                            {editing && (
                                <button
                                    onClick={resetForm}
                                    className="rounded-md bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
                                >
                                    Cancelar
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div>
                    <h2 className="text-xl font-semibold mb-4">Modelos Existentes</h2>
                    <div className="space-y-4">
                        {templates.map((template) => (
                            <div
                                key={template.id}
                                className="rounded-lg border border-gray-200 bg-white p-4 shadow"
                            >
                                <h3 className="font-semibold">{template.name}</h3>
                                <p className="text-sm text-gray-600">
                                    Tipo:{" "}
                                    {template.type === "service" ? "Serviço" : "Inventário"}
                                </p>
                                <p className="text-sm text-gray-600">
                                    Parâmetros: {template.parameters.length}
                                </p>
                                <div
                                    className="mt-3 max-h-48 overflow-y-auto rounded border border-stone-100 bg-stone-50 p-2 text-xs text-stone-700"
                                    dangerouslySetInnerHTML={{
                                        __html: sanitizeContractHtml(template.text),
                                    }}
                                />
                                <div className="mt-2 flex gap-2">
                                    <button
                                        onClick={() => handleEdit(template)}
                                        className="rounded-md bg-yellow-600 px-3 py-1 text-sm text-white hover:bg-yellow-700"
                                    >
                                        Editar
                                    </button>
                                    <button
                                        onClick={() => handleDelete(template.id)}
                                        className="rounded-md bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
                                    >
                                        Excluir
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
