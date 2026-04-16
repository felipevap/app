"use client";

import { useState, useEffect } from "react";
import ContractSegmentsBuilder from "@/components/ContractSegmentsBuilder";
import type { ContractParameter } from "@/lib/contract";

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
    const [sourceFileName, setSourceFileName] = useState<string | null>(null);

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
        const payload = { name, type, text, parameters };
        const method = editing ? "PUT" : "POST";
        const url = editing ? `/api/admin/contract-templates/${editing.id}` : "/api/admin/contract-templates";
        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        if (res.ok) {
            await fetchTemplates();
            resetForm();
        }
    };

    const handleEdit = (template: ContractTemplate) => {
        setEditing(template);
        setName(template.name);
        setType(template.type);
        setText(template.text);
        setParameters(template.parameters);
        setSourceFileName(null);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Tem certeza que deseja excluir este modelo?")) {
            const res = await fetch(`/api/admin/contract-templates/${id}`, { method: "DELETE" });
            if (res.ok) {
                await fetchTemplates();
            }
        }
    };

    const resetForm = () => {
        setEditing(null);
        setName("");
        setType("service");
        setText("");
        setParameters([]);
        setSourceFileName(null);
    };

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">Modelos de Contrato</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                    <h2 className="text-xl font-semibold mb-4">{editing ? "Editar Modelo" : "Novo Modelo"}</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium">Nome</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
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
                        <ContractSegmentsBuilder
                            text={text}
                            parameters={parameters}
                            onChange={(newText, newParams) => {
                                setText(newText);
                                setParameters(newParams);
                            }}
                            sourceFileName={sourceFileName}
                            onSourceFileName={setSourceFileName}
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleSave}
                                className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                            >
                                {editing ? "Atualizar" : "Criar"}
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
                            <div key={template.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow">
                                <h3 className="font-semibold">{template.name}</h3>
                                <p className="text-sm text-gray-600">Tipo: {template.type === "service" ? "Serviço" : "Inventário"}</p>
                                <p className="text-sm text-gray-600">Parâmetros: {template.parameters.length}</p>
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