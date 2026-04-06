"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { registerOrganization } from "./actions";
import PortalGarageLogo from "@/components/PortalGarageLogo";

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 px-4 py-3.5 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-500/25 transition hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
            {pending ? "Criando cadastro…" : "Criar cadastro"}
        </button>
    );
}

export default function AssociacaoPage() {
    const [state, setState] = useState<{ error?: string }>({});

    async function clientAction(formData: FormData) {
        const result = await registerOrganization(formData);
        if (result?.error) {
            setState({ error: result.error });
        }
    }

    return (
        <div className="flex min-h-[calc(100dvh-4rem)] w-full items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
            <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/40 backdrop-blur-xl">
                <div className="mb-8 flex flex-col items-center text-center">
                    <Link
                        href="/"
                        className="inline-flex rounded-2xl outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500/80"
                    >
                        <PortalGarageLogo className="h-14 w-14 drop-shadow-[0_0_24px_rgba(251,191,36,0.35)]" />
                    </Link>
                    <h1 className="mt-4 text-2xl font-semibold text-white">Portal Garage</h1>
                    <p className="mt-2 text-sm font-medium text-amber-400/90">Criação de cadastro</p>
                    <p className="mt-1 text-sm text-slate-400">
                        Crie sua organização e entre no painel em um único passo.
                    </p>
                </div>

                <form action={clientAction} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-200">Nome da organização</label>
                        <input
                            type="text"
                            name="tenantName"
                            required
                            className="mt-1.5 block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                            placeholder="Ex.: Garage Sale da Vila"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-200">Seu nome (opcional)</label>
                        <input
                            type="text"
                            name="name"
                            className="mt-1.5 block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                            placeholder="Como podemos te chamar"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-200">Email</label>
                        <input
                            type="email"
                            name="email"
                            required
                            autoComplete="email"
                            className="mt-1.5 block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                            placeholder="voce@exemplo.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-200">Senha</label>
                        <input
                            type="password"
                            name="password"
                            required
                            minLength={8}
                            autoComplete="new-password"
                            className="mt-1.5 block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                            placeholder="Mínimo 8 caracteres"
                        />
                    </div>

                    {state.error && (
                        <div className="rounded-xl border border-red-500/30 bg-red-950/50 p-3 text-center text-sm text-red-200">
                            {state.error}
                        </div>
                    )}

                    <SubmitButton />
                </form>

                <p className="mt-6 text-center text-sm text-slate-400">
                    Já tem conta?{" "}
                    <Link href="/login" className="font-medium text-amber-400/90 hover:text-amber-300">
                        Entrar
                    </Link>
                </p>
                <p className="mt-2 text-center">
                    <Link href="/" className="text-sm text-slate-500 hover:text-slate-300">
                        ← Voltar ao início
                    </Link>
                </p>
            </div>
        </div>
    );
}
