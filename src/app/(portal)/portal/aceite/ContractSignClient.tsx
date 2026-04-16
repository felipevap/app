"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import PortalGarageLogo from "@/components/PortalGarageLogo";

type Props = {
    templateId: string;
    renderedText: string;
    title: string;
};

export default function ContractSignClient({ templateId, renderedText, title }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawing = useRef(false);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [ok, setOk] = useState(false);


    const pos = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const c = canvasRef.current;
        if (!c) return { x: 0, y: 0 };
        const r = c.getBoundingClientRect();
        const scaleX = c.width / r.width;
        const scaleY = c.height / r.height;
        if ("touches" in e && e.touches[0]) {
            return {
                x: (e.touches[0].clientX - r.left) * scaleX,
                y: (e.touches[0].clientY - r.top) * scaleY,
            };
        }
        const me = e as React.MouseEvent<HTMLCanvasElement>;
        return {
            x: (me.clientX - r.left) * scaleX,
            y: (me.clientY - r.top) * scaleY,
        };
    }, []);

    function start(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
        e.preventDefault();
        drawing.current = true;
        const c = canvasRef.current;
        const ctx = c?.getContext("2d");
        if (!ctx || !c) return;
        const { x, y } = pos(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
    }

    function move(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
        if (!drawing.current) return;
        e.preventDefault();
        const c = canvasRef.current;
        const ctx = c?.getContext("2d");
        if (!ctx) return;
        const { x, y } = pos(e);
        ctx.strokeStyle = "#1c1917";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    }

    function end() {
        drawing.current = false;
    }

    function clearPad() {
        const c = canvasRef.current;
        const ctx = c?.getContext("2d");
        if (!c || !ctx) return;
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, c.width, c.height);
    }

    async function submit() {
        setErr(null);
        const c = canvasRef.current;
        if (!c) return;
        const dataUrl = c.toDataURL("image/png");
        if (dataUrl.length < 1200) {
            setErr("Desenhe sua assinatura no quadro.");
            return;
        }
        setBusy(true);
        try {
            const res = await fetch("/api/portal/contract/accept", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ templateId, signaturePng: dataUrl }),
            });
            const j = (await res.json().catch(() => ({}))) as { error?: string };
            if (!res.ok) {
                setErr(j.error ?? "Não foi possível registrar o aceite.");
                return;
            }
            setOk(true);
            window.location.href = "/portal";
        } catch {
            setErr("Falha de rede. Tente novamente.");
        } finally {
            setBusy(false);
        }
    }

    useEffect(() => {
        clearPad();
    }, []);

    if (ok) {
        return (
            <div className="mx-auto max-w-lg p-8 text-center">
                <p className="text-emerald-700">Registrado. Redirecionando…</p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-2xl px-4 py-8">
            <header className="mb-8 flex flex-col items-center gap-3 text-center">
                <PortalGarageLogo className="h-12 w-12" aria-hidden />
                <h1 className="text-2xl font-bold text-stone-900">{title}</h1>
                <p className="text-sm text-stone-600">
                    Leia o texto abaixo e assine para continuar. Este aceite fica registrado para você e para a
                    organização.
                </p>
            </header>

            <section className="mb-8 max-h-[40vh] overflow-y-auto rounded-2xl border border-stone-200 bg-white p-5 text-sm leading-relaxed text-stone-800 shadow-sm whitespace-pre-wrap">
                {renderedText}
            </section>

            <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <p className="mb-2 text-sm font-medium text-stone-800">Assinatura do contratante</p>
                <canvas
                    ref={canvasRef}
                    width={700}
                    height={200}
                    className="w-full max-w-full touch-none cursor-crosshair rounded-lg border border-stone-300 bg-white"
                    onMouseDown={start}
                    onMouseMove={move}
                    onMouseUp={end}
                    onMouseLeave={end}
                    onTouchStart={start}
                    onTouchMove={move}
                    onTouchEnd={end}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={clearPad}
                        className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
                    >
                        Limpar assinatura
                    </button>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => void submit()}
                        className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
                    >
                        {busy ? "Enviando…" : "Li e aceito — confirmar"}
                    </button>
                </div>
                {err ? <p className="mt-3 text-sm text-red-600">{err}</p> : null}
            </section>

            <p className="mt-6 text-center text-sm text-stone-500">
                <Link href="/login" className="text-purple-700 underline">
                    Sair
                </Link>
            </p>
        </div>
    );
}
