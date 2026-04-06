"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { clearTenantAdminLogo, saveTenantAdminLogo } from "./actions";

type Props = {
    initialDataUrl: string | null;
};

function downscaleToDataUrl(file: File, maxEdge: number, quality: number): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = document.createElement("img");
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            let { width, height } = img;
            const scale = Math.min(1, maxEdge / Math.max(width, height));
            width = Math.round(width * scale);
            height = Math.round(height * scale);
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                reject(new Error("canvas"));
                return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            const out = canvas.toDataURL("image/jpeg", quality);
            resolve(out);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("load"));
        };
        img.src = url;
    });
}

export default function AdminLogoForm({ initialDataUrl }: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(initialDataUrl);
    const [message, setMessage] = useState<string | null>(null);
    const [err, setErr] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file || !file.type.startsWith("image/")) {
            setErr("Selecione uma imagem.");
            return;
        }
        setErr(null);
        setMessage(null);
        try {
            const dataUrl = await downscaleToDataUrl(file, 480, 0.82);
            setPreview(dataUrl);
            startTransition(async () => {
                const r = await saveTenantAdminLogo(dataUrl);
                if (r.error) {
                    setErr(r.error);
                    return;
                }
                setMessage("Logo atualizada.");
            });
        } catch {
            setErr("Não foi possível processar a imagem.");
        }
    }

    function onRemove() {
        setErr(null);
        setMessage(null);
        startTransition(async () => {
            const r = await clearTenantAdminLogo();
            if (r.error) {
                setErr(r.error);
                return;
            }
            setPreview(null);
            setMessage("Logo removida.");
        });
    }

    return (
        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-stone-900">Logo do administrador</h2>
            <p className="mt-1 text-sm text-stone-600">
                Aparece na página inicial do administrador da organização. Formatos: JPG, PNG ou WebP.
            </p>
            <div className="mt-4 flex flex-wrap items-start gap-6">
                <div className="relative flex h-28 w-40 items-center justify-center rounded-lg border border-dashed border-stone-300 bg-stone-50">
                    {preview ? (
                        <Image src={preview} alt="" width={144} height={96} unoptimized className="max-h-24 object-contain" />
                    ) : (
                        <span className="text-xs text-stone-500">Sem logo</span>
                    )}
                </div>
                <div className="flex flex-col gap-2">
                    <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPick} />
                    <button
                        type="button"
                        disabled={pending}
                        onClick={() => inputRef.current?.click()}
                        className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
                    >
                        Enviar imagem
                    </button>
                    {preview && (
                        <button
                            type="button"
                            disabled={pending}
                            onClick={onRemove}
                            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-50"
                        >
                            Remover
                        </button>
                    )}
                </div>
            </div>
            {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
            {message && !err && <p className="mt-3 text-sm text-emerald-700">{message}</p>}
        </div>
    );
}
