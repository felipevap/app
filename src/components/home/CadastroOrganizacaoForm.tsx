"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { registerOrganization } from "@/app/associacao/actions";

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 px-4 py-3.5 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-500/25 transition hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
            {pending ? "Criando seu cadastro…" : "Criar cadastro e organização"}
        </button>
    );
}

export default function CadastroOrganizacaoForm() {
    const [state, setState] = useState<{ error?: string }>({});

    async function clientAction(formData: FormData) {
        const result = await registerOrganization(formData);
        if (result?.error) {
            setState({ error: result.error });
        }
    }

    return (
        <form action={clientAction} className="space-y-5">
            <div>
                <label className="block text-sm font-medium text-slate-200">Nome da organização</label>
                <input
                    type="text"
                    name="tenantName"
                    required
                    className="mt-1.5 block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 backdrop-blur-sm transition focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                    placeholder="Ex.: Garage Sale Solidário Jardim das Flores"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-200">Seu nome (opcional)</label>
                <input
                    type="text"
                    name="name"
                    className="mt-1.5 block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 backdrop-blur-sm transition focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
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
                    className="mt-1.5 block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 backdrop-blur-sm transition focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                    placeholder="voce@organizacao.org"
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
                    className="mt-1.5 block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 backdrop-blur-sm transition focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                    placeholder="Mínimo 8 caracteres"
                />
            </div>
            {state.error && (
                <div className="rounded-xl border border-red-500/30 bg-red-950/50 px-4 py-3 text-center text-sm text-red-200">
                    {state.error}
                </div>
            )}
            <SubmitButton />
            <p className="text-center text-xs text-slate-500">
                Já tem conta?{" "}
                <Link href="/login" className="font-medium text-amber-400/90 hover:text-amber-300">
                    Entrar
                </Link>
            </p>
        </form>
    );
}
