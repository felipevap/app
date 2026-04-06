"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { registerOrganization } from "./actions";
import GestorGarageLogo from "@/components/GestorGarageLogo";

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full transform rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 px-4 py-3 font-semibold text-white transition-all hover:scale-[1.02] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50"
        >
            {pending ? "Criando conta..." : "Criar conta e organização"}
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
        <div className="flex min-h-[calc(100dvh-6rem)] w-full items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-stone-100 p-4">
            <div className="w-full max-w-md overflow-hidden rounded-2xl border border-stone-200 bg-white p-8 shadow-xl">
                <div className="mb-8 flex flex-col items-center text-center">
                    <GestorGarageLogo className="h-12 w-12" />
                    <h1 className="mt-4 text-3xl font-bold text-stone-900">Gestor Garage</h1>
                    <p className="mt-2 text-sm text-amber-800">Associação — sua organização</p>
                    <p className="mt-1 text-sm text-stone-600">
                        Um usuário, uma organização. Cadastre-se para gerir seus eventos.
                    </p>
                </div>

                <form action={clientAction} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-stone-700">Nome da organização</label>
                        <input
                            type="text"
                            name="tenantName"
                            required
                            className="mt-1 block w-full rounded-lg border border-stone-300 bg-stone-50 px-4 py-3 text-stone-900 placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            placeholder="Ex.: Bazar da Vila"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-stone-700">Seu nome (opcional)</label>
                        <input
                            type="text"
                            name="name"
                            className="mt-1 block w-full rounded-lg border border-stone-300 bg-stone-50 px-4 py-3 text-stone-900 placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            placeholder="Como podemos te chamar"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-stone-700">Email</label>
                        <input
                            type="email"
                            name="email"
                            required
                            autoComplete="email"
                            className="mt-1 block w-full rounded-lg border border-stone-300 bg-stone-50 px-4 py-3 text-stone-900 placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            placeholder="voce@exemplo.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-stone-700">Senha</label>
                        <input
                            type="password"
                            name="password"
                            required
                            minLength={8}
                            autoComplete="new-password"
                            className="mt-1 block w-full rounded-lg border border-stone-300 bg-stone-50 px-4 py-3 text-stone-900 placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            placeholder="Mínimo 8 caracteres"
                        />
                    </div>

                    {state.error && (
                        <div className="rounded-lg bg-red-50 p-3 text-center text-sm text-red-700">{state.error}</div>
                    )}

                    <SubmitButton />
                </form>

                <p className="mt-6 text-center text-sm text-stone-600">
                    Já tem conta?{" "}
                    <Link href="/login" className="text-amber-800 hover:text-amber-900 font-medium">
                        Entrar
                    </Link>
                </p>
                <p className="mt-2 text-center">
                    <Link href="/" className="text-sm text-stone-500 hover:text-stone-800">
                        ← Voltar ao início
                    </Link>
                </p>
            </div>
        </div>
    );
}
