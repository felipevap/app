"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ContractParameter } from "@/lib/contract";
import { isValidParamName, parsePlaceholders } from "@/lib/contract";
import { sanitizeContractHtml } from "@/lib/sanitize-html";

type Props = {
    html: string;
    parameters: ContractParameter[];
    onChange: (html: string, parameters: ContractParameter[]) => void;
    title?: string;
    description?: string;
};

const MIME = "application/x-contract-param";
const FONT_SIZES = [
    { label: "Pequeno", value: "14px" },
    { label: "Normal", value: "16px" },
    { label: "Médio", value: "18px" },
    { label: "Grande", value: "22px" },
    { label: "Muito grande", value: "28px" },
];

export default function ContractBuilder({
    html,
    parameters,
    onChange,
    title = "Modelo de contrato",
    description = 'Edite o contrato como em um editor de texto: negrito, alinhamento, listas e tamanho da fonte. Arraste parâmetros para o texto ou clique em "inserir" — o parâmetro entra na posição do cursor (ou onde você estava editando por último).',
}: Props) {
    const editorRef = useRef<HTMLDivElement>(null);
    const lastEditorRangeRef = useRef<Range | null>(null);
    const [draft, setDraft] = useState<ContractParameter>({ name: "", type: "text", required: true });
    const [draftError, setDraftError] = useState<string | null>(null);
    const [isEditorFocused, setIsEditorFocused] = useState(false);

    useEffect(() => {
        const el = editorRef.current;
        if (!el) return;
        if (el.innerHTML !== html) {
            el.innerHTML = sanitizeContractHtml(html) || "";
        }
    }, [html]);

    const captureSelection = useCallback(() => {
        const el = editorRef.current;
        if (!el) return;
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        const range = sel.getRangeAt(0);
        if (el.contains(range.commonAncestorContainer)) {
            lastEditorRangeRef.current = range.cloneRange();
        }
    }, []);

    useEffect(() => {
        document.addEventListener("selectionchange", captureSelection);
        return () => document.removeEventListener("selectionchange", captureSelection);
    }, [captureSelection]);

    const emit = useCallback(() => {
        const el = editorRef.current;
        if (!el) return;
        const nextHtml = el.innerHTML;
        const detected = parsePlaceholders(nextHtml);
        const merged: ContractParameter[] = detected.map((d) => {
            const prior = parameters.find((p) => p.name === d.name);
            return prior ?? d;
        });
        onChange(nextHtml, merged);
    }, [onChange, parameters]);

    const insertChipAtSelection = (name: string) => {
        const el = editorRef.current;
        if (!el) return;
        el.focus();

        const insertWithRange = (range: Range): boolean => {
            if (!el.contains(range.commonAncestorContainer)) return false;
            const chip = document.createElement("span");
            chip.className = "contract-param";
            chip.setAttribute("data-param", name);
            chip.setAttribute("contenteditable", "false");
            chip.textContent = `{{${name}}}`;
            const trail = document.createTextNode("\u00A0");
            range.deleteContents();
            range.insertNode(chip);
            range.setStartAfter(chip);
            range.collapse(true);
            range.insertNode(trail);
            range.setStartAfter(trail);
            range.collapse(true);
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
            lastEditorRangeRef.current = range.cloneRange();
            return true;
        };

        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            const live = sel.getRangeAt(0);
            if (insertWithRange(live.cloneRange())) {
                emit();
                return;
            }
        }
        const saved = lastEditorRangeRef.current;
        if (saved) {
            try {
                const r = saved.cloneRange();
                if (insertWithRange(r)) {
                    emit();
                    return;
                }
            } catch {}
        }
        const end = document.createRange();
        end.selectNodeContents(el);
        end.collapse(false);
        if (insertWithRange(end)) {
            emit();
            return;
        }
        const chip = document.createElement("span");
        chip.className = "contract-param";
        chip.setAttribute("data-param", name);
        chip.setAttribute("contenteditable", "false");
        chip.textContent = `{{${name}}}`;
        el.appendChild(chip);
        el.appendChild(document.createTextNode("\u00A0"));
        const after = document.createRange();
        after.setStartAfter(el.lastChild!);
        after.collapse(true);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(after);
        lastEditorRangeRef.current = after.cloneRange();
        emit();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        const name = e.dataTransfer.getData(MIME);
        if (!name) return;
        e.preventDefault();
        const doc = document;
        let range: Range | null = null;
        const getCaret = (doc as unknown as {
            caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
            caretRangeFromPoint?: (x: number, y: number) => Range | null;
        });
        if (typeof getCaret.caretRangeFromPoint === "function") {
            range = getCaret.caretRangeFromPoint(e.clientX, e.clientY);
        } else if (typeof getCaret.caretPositionFromPoint === "function") {
            const pos = getCaret.caretPositionFromPoint(e.clientX, e.clientY);
            if (pos) {
                range = doc.createRange();
                range.setStart(pos.offsetNode, pos.offset);
                range.collapse(true);
            }
        }
        if (range) {
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
        }
        insertChipAtSelection(name);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        if (e.dataTransfer.types.includes(MIME)) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
        }
    };

    const exec = (command: string, value?: string) => {
        editorRef.current?.focus();
        document.execCommand(command, false, value);
        emit();
    };

    const applyFontSize = (size: string) => {
        const el = editorRef.current;
        if (!el) return;
        el.focus();
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        const range = sel.getRangeAt(0);
        if (range.collapsed) return;
        const span = document.createElement("span");
        span.setAttribute("style", `font-size: ${size}`);
        try {
            span.appendChild(range.extractContents());
            range.insertNode(span);
            sel.removeAllRanges();
            const after = document.createRange();
            after.selectNodeContents(span);
            after.collapse(false);
            sel.addRange(after);
            emit();
        } catch {
        }
    };

    const addParameter = () => {
        const name = draft.name.trim();
        if (!isValidParamName(name)) {
            setDraftError("Use apenas letras, números e sublinhado (máx. 64).");
            return;
        }
        if (parameters.some((p) => p.name === name)) {
            setDraftError("Já existe um parâmetro com esse nome.");
            return;
        }
        setDraftError(null);
        const next = [...parameters, { ...draft, name }];
        onChange(html, next);
        setDraft({ name: "", type: "text", required: true });
    };

    const updateParam = (idx: number, patch: Partial<ContractParameter>) => {
        const next = parameters.map((p, i) => (i === idx ? { ...p, ...patch } : p));
        onChange(html, next);
    };

    const removeParameter = (idx: number) => {
        const target = parameters[idx];
        if (!target) return;
        const stripped = html.replace(
            new RegExp(
                `<span[^>]*data-param="${target.name}"[^>]*>\\s*\\{\\{${target.name}\\}\\}\\s*</span>`,
                "g"
            ),
            ""
        );
        const next = parameters.filter((_, i) => i !== idx);
        onChange(stripped, next);
    };

    const importTxt = (file: File) => {
        const reader = new FileReader();
        reader.onload = () => {
            const text = typeof reader.result === "string" ? reader.result : "";
            const converted = text
                .split(/\n{2,}/)
                .map(
                    (block) =>
                        `<p>${block
                            .replace(/&/g, "&amp;")
                            .replace(/</g, "&lt;")
                            .replace(/>/g, "&gt;")
                            .replace(/\n/g, "<br/>")}</p>`
                )
                .join("");
            const detected = parsePlaceholders(converted);
            let withChips = converted;
            for (const p of detected) {
                const token = new RegExp(`\\{\\{\\s*${p.name}\\s*\\}\\}`, "g");
                withChips = withChips.replace(
                    token,
                    `<span class="contract-param" data-param="${p.name}" contenteditable="false">{{${p.name}}}</span>`
                );
            }
            onChange(withChips, detected.length ? detected : parameters);
        };
        reader.readAsText(file, "UTF-8");
    };

    const availableParams = useMemo(() => parameters, [parameters]);

    return (
        <div className="space-y-4 rounded-xl border border-violet-200 bg-violet-50/40 p-4">
            <div>
                <h3 className="text-lg font-semibold text-violet-950">{title}</h3>
                <p className="mt-1 text-sm text-violet-900/85">{description}</p>
            </div>

            <div>
                <label className="block text-sm font-medium text-stone-700">
                    Importar arquivo .txt (opcional)
                </label>
                <input
                    type="file"
                    accept=".txt,text/plain"
                    className="mt-1 block w-full text-sm text-stone-700"
                    onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        importTxt(f);
                        e.target.value = "";
                    }}
                />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
                <div>
                    <div
                        className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm shadow-sm"
                        onMouseDown={(e) => {
                            if ((e.target as HTMLElement).closest("button")) {
                                e.preventDefault();
                            }
                        }}
                    >
                        <button
                            type="button"
                            onClick={() => exec("bold")}
                            className="rounded px-2 py-1 font-bold hover:bg-stone-100"
                            title="Negrito (Ctrl+B)"
                        >
                            N
                        </button>
                        <button
                            type="button"
                            onClick={() => exec("italic")}
                            className="rounded px-2 py-1 italic hover:bg-stone-100"
                            title="Itálico (Ctrl+I)"
                        >
                            I
                        </button>
                        <button
                            type="button"
                            onClick={() => exec("underline")}
                            className="rounded px-2 py-1 underline hover:bg-stone-100"
                            title="Sublinhado (Ctrl+U)"
                        >
                            S
                        </button>
                        <span className="h-5 w-px bg-stone-200" aria-hidden />
                        <select
                            onChange={(e) => {
                                applyFontSize(e.target.value);
                                e.target.value = "";
                            }}
                            className="rounded border border-stone-200 px-2 py-1 text-sm"
                            defaultValue=""
                            title="Tamanho da fonte aplicado ao texto selecionado"
                        >
                            <option value="" disabled>
                                Tamanho da fonte…
                            </option>
                            {FONT_SIZES.map((s) => (
                                <option key={s.value} value={s.value}>
                                    {s.label}
                                </option>
                            ))}
                        </select>
                        <span className="h-5 w-px bg-stone-200" aria-hidden />
                        <button
                            type="button"
                            onClick={() => exec("insertUnorderedList")}
                            className="rounded px-2 py-1 hover:bg-stone-100"
                            title="Lista com marcadores"
                        >
                            • Lista
                        </button>
                        <button
                            type="button"
                            onClick={() => exec("insertOrderedList")}
                            className="rounded px-2 py-1 hover:bg-stone-100"
                            title="Lista numerada"
                        >
                            1. Lista
                        </button>
                        <span className="h-5 w-px bg-stone-200" aria-hidden />
                        <button
                            type="button"
                            onClick={() => exec("justifyLeft")}
                            className="rounded px-2 py-1 hover:bg-stone-100"
                            title="Alinhar à esquerda"
                            aria-label="Alinhar à esquerda"
                        >
                            Esq
                        </button>
                        <button
                            type="button"
                            onClick={() => exec("justifyCenter")}
                            className="rounded px-2 py-1 hover:bg-stone-100"
                            title="Centralizar"
                            aria-label="Centralizar"
                        >
                            Centro
                        </button>
                        <button
                            type="button"
                            onClick={() => exec("justifyRight")}
                            className="rounded px-2 py-1 hover:bg-stone-100"
                            title="Alinhar à direita"
                            aria-label="Alinhar à direita"
                        >
                            Dir
                        </button>
                        <button
                            type="button"
                            onClick={() => exec("justifyFull")}
                            className="rounded px-2 py-1 hover:bg-stone-100"
                            title="Justificar"
                            aria-label="Justificar"
                        >
                            Just
                        </button>
                        <span className="h-5 w-px bg-stone-200" aria-hidden />
                        <button
                            type="button"
                            onClick={() => exec("strikeThrough")}
                            className="rounded px-2 py-1 line-through hover:bg-stone-100"
                            title="Riscado"
                        >
                            R
                        </button>
                        <button
                            type="button"
                            onClick={() => exec("removeFormat")}
                            className="rounded px-2 py-1 hover:bg-stone-100"
                            title="Limpar formatação da seleção"
                        >
                            Limpar
                        </button>
                        <span className="h-5 w-px bg-stone-200" aria-hidden />
                        <button
                            type="button"
                            onClick={() => exec("formatBlock", "<h3>")}
                            className="rounded px-2 py-1 hover:bg-stone-100"
                            title="Título"
                        >
                            Título
                        </button>
                        <button
                            type="button"
                            onClick={() => exec("formatBlock", "<p>")}
                            className="rounded px-2 py-1 hover:bg-stone-100"
                            title="Parágrafo"
                        >
                            ¶
                        </button>
                    </div>

                    <style>{`
                        .contract-editor .contract-param {
                            user-select: none;
                            cursor: default;
                        }
                        .contract-editor [contenteditable="true"]:empty::before {
                            content: attr(data-placeholder);
                            color: #a8a29e;
                            pointer-events: none;
                        }
                    `}</style>
                    <div className="contract-editor">
                        <div
                            ref={editorRef}
                            role="textbox"
                            aria-multiline="true"
                            contentEditable
                            suppressContentEditableWarning
                            data-placeholder='Escreva o contrato aqui. Use a barra de ferramentas para formato e alinhamento. Parâmetros: arraste da lista ou clique em "inserir" na posição do cursor.'
                            onInput={() => {
                                captureSelection();
                                emit();
                            }}
                            onMouseUp={captureSelection}
                            onKeyUp={captureSelection}
                            onBlur={() => {
                                setIsEditorFocused(false);
                                captureSelection();
                                emit();
                            }}
                            onFocus={() => {
                                setIsEditorFocused(true);
                                captureSelection();
                            }}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            className={`min-h-[280px] rounded-lg border bg-white p-4 text-sm leading-relaxed text-stone-900 shadow-sm transition focus:outline-none ${
                                isEditorFocused
                                    ? "border-violet-400 ring-2 ring-violet-200"
                                    : "border-stone-200"
                            }`}
                        />
                    </div>
                    <p className="mt-1 text-xs text-stone-500">
                        {
                            'Dica: clique no editor para posicionar o cursor antes de "inserir" um parâmetro. A seleção é memorizada ao digitar ou ao sair do campo.'
                        }
                    </p>
                </div>

                <aside className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm">
                    <h4 className="text-sm font-semibold text-stone-800">Parâmetros</h4>
                    <p className="mt-1 text-xs text-stone-500">
                        {
                            'Crie um parâmetro abaixo; arraste para o texto ou use "inserir" com o cursor no ponto desejado.'
                        }
                    </p>

                    <div className="mt-3 space-y-2">
                        <input
                            type="text"
                            value={draft.name}
                            onChange={(e) =>
                                setDraft((d) => ({ ...d, name: e.target.value.replace(/[^a-zA-Z0-9_]/g, "") }))
                            }
                            placeholder="nome_do_parametro"
                            className="w-full rounded border border-stone-200 px-2 py-1 text-sm"
                        />
                        <div className="flex items-center gap-2">
                            <select
                                value={draft.type}
                                onChange={(e) =>
                                    setDraft((d) => ({
                                        ...d,
                                        type: e.target.value as ContractParameter["type"],
                                    }))
                                }
                                className="flex-1 rounded border border-stone-200 px-2 py-1 text-sm"
                            >
                                <option value="text">Texto</option>
                                <option value="date">Data</option>
                                <option value="number">Número</option>
                            </select>
                            <label className="flex items-center gap-1 text-xs text-stone-700">
                                <input
                                    type="checkbox"
                                    checked={draft.required}
                                    onChange={(e) =>
                                        setDraft((d) => ({ ...d, required: e.target.checked }))
                                    }
                                />
                                Obrigatório
                            </label>
                        </div>
                        {draftError && <p className="text-xs text-red-600">{draftError}</p>}
                        <button
                            type="button"
                            onClick={addParameter}
                            className="w-full rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700"
                        >
                            Adicionar parâmetro
                        </button>
                    </div>

                    <div className="mt-4 space-y-2">
                        {availableParams.length === 0 && (
                            <p className="rounded-md border border-dashed border-stone-300 bg-stone-50 p-2 text-xs text-stone-500">
                                Nenhum parâmetro criado ainda.
                            </p>
                        )}
                        {availableParams.map((p, i) => (
                            <div
                                key={`${p.name}-${i}`}
                                draggable
                                onDragStart={(e) => {
                                    e.dataTransfer.setData(MIME, p.name);
                                    e.dataTransfer.effectAllowed = "copy";
                                }}
                                className="group cursor-grab rounded-lg border border-violet-200 bg-violet-50 p-2 text-sm text-violet-950 shadow-sm hover:border-violet-400 active:cursor-grabbing"
                                title="Arraste para dentro do texto"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-mono text-xs font-semibold">
                                        {p.name}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => removeParameter(i)}
                                        className="text-xs text-red-600 opacity-70 hover:opacity-100"
                                        aria-label={`Remover parâmetro ${p.name}`}
                                    >
                                        remover
                                    </button>
                                </div>
                                <div className="mt-1 flex items-center gap-2 text-xs text-violet-800/80">
                                    <select
                                        value={p.type}
                                        onChange={(e) =>
                                            updateParam(i, {
                                                type: e.target.value as ContractParameter["type"],
                                            })
                                        }
                                        className="rounded border border-violet-200 bg-white px-1.5 py-0.5 text-xs"
                                    >
                                        <option value="text">Texto</option>
                                        <option value="date">Data</option>
                                        <option value="number">Número</option>
                                    </select>
                                    <label className="flex items-center gap-1">
                                        <input
                                            type="checkbox"
                                            checked={p.required}
                                            onChange={(e) =>
                                                updateParam(i, { required: e.target.checked })
                                            }
                                        />
                                        obrigatório
                                    </label>
                                    <button
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => insertChipAtSelection(p.name)}
                                        className="ml-auto rounded bg-white px-2 py-0.5 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-200 hover:bg-violet-100"
                                    >
                                        inserir
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>
            </div>
        </div>
    );
}
