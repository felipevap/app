"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Check, LockKeyhole } from "lucide-react";
import { registerOrganization } from "@/app/associacao/actions";
import { formatCurrencyBRLFromCents, PREMIUM_FULL_PLAN } from "@/lib/billing";

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full rounded-[1.25rem] bg-gradient-to-r from-amber-300 via-yellow-200 to-stone-50 px-4 py-4 text-sm font-semibold text-slate-950 shadow-[0_24px_60px_rgba(251,191,36,0.25)] transition hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
            {pending ? "Ativando seu trial..." : "Assinar e começar 14 dias grátis"}
        </button>
    );
}

const items = [
    "Multiempresa com isolamento total entre organizações",
    "Cadastro de produtos, checagem com câmera e PDV no mesmo fluxo",
    "Painel do organizador, visão operacional e gestão centralizada",
];

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
            <div className="rounded-[1.5rem] border border-amber-300/20 bg-amber-300/10 p-5 text-amber-50">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-100/80">Plano único</p>
                        <h3 className="mt-2 text-2xl font-semibold text-white">{PREMIUM_FULL_PLAN.name}</h3>
                        <p className="mt-2 text-sm text-amber-50/85">14 dias grátis para operar sua primeira empresa com o pacote completo.</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-right">
                        <p className="text-xs uppercase tracking-[0.2em] text-amber-100/70">Depois do trial</p>
                        <p className="mt-1 text-2xl font-semibold text-white">{formatCurrencyBRLFromCents(PREMIUM_FULL_PLAN.monthlyPriceCents)}</p>
                        <p className="text-xs text-amber-50/70">por mês</p>
                    </div>
                </div>

                <div className="mt-4 grid gap-2">
                    {items.map((item) => (
                        <div key={item} className="flex items-center gap-2 text-sm text-amber-50/90">
                            <Check className="h-4 w-4 shrink-0 text-amber-200" />
                            <span>{item}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-stone-200">Nome da organização</label>
                <input type="text" name="tenantName" required className="mt-1.5 block w-full rounded-[1.1rem] border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-stone-500 backdrop-blur-sm transition focus:border-amber-300/50 focus:outline-none focus:ring-1 focus:ring-amber-200/30" placeholder="Ex.: Garage Sale Solidário Jardim das Flores" />
            </div>
            <div>
                <label className="block text-sm font-medium text-stone-200">Seu nome</label>
                <input type="text" name="name" className="mt-1.5 block w-full rounded-[1.1rem] border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-stone-500 backdrop-blur-sm transition focus:border-amber-300/50 focus:outline-none focus:ring-1 focus:ring-amber-200/30" placeholder="Como podemos te chamar" />
            </div>
            <div>
                <label className="block text-sm font-medium text-stone-200">Email financeiro e de acesso</label>
                <input type="email" name="email" required autoComplete="email" className="mt-1.5 block w-full rounded-[1.1rem] border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-stone-500 backdrop-blur-sm transition focus:border-amber-300/50 focus:outline-none focus:ring-1 focus:ring-amber-200/30" placeholder="voce@organizacao.org" />
            </div>
            <div>
                <label className="block text-sm font-medium text-stone-200">Crie sua senha</label>
                <input type="password" name="password" required minLength={8} autoComplete="new-password" className="mt-1.5 block w-full rounded-[1.1rem] border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-stone-500 backdrop-blur-sm transition focus:border-amber-300/50 focus:outline-none focus:ring-1 focus:ring-amber-200/30" placeholder="Mínimo 8 caracteres" />
            </div>

            <label className="flex items-start gap-3 rounded-[1.2rem] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-stone-200">
                <input type="checkbox" name="acceptPlan" value="yes" required className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent text-amber-300 focus:ring-amber-200" />
                <span>
                    Confirmo a assinatura do <strong>{PREMIUM_FULL_PLAN.name}</strong> com <strong>14 dias grátis</strong> e cobrança de{" "}
                    <strong>{formatCurrencyBRLFromCents(PREMIUM_FULL_PLAN.monthlyPriceCents)}/mês</strong> após o período de teste.
                </span>
            </label>

            {state.error && <div className="rounded-[1.2rem] border border-red-500/30 bg-red-950/50 px-4 py-3 text-center text-sm text-red-200">{state.error}</div>}

            <SubmitButton />

            <div className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-4 text-sm text-stone-300">
                <div className="flex items-center gap-2 text-stone-100">
                    <LockKeyhole className="h-4 w-4 text-amber-200" />
                    Sua empresa já nasce com trial, plano e email de cobrança configurados.
                </div>
            </div>

            <p className="text-center text-xs text-stone-500">
                Já tem conta?{" "}
                <Link href="/login" className="font-medium text-amber-300 hover:text-amber-200">
                    Entrar
                </Link>
            </p>
        </form>
    );
}
