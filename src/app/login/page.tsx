"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { login } from "./actions";
import PortalGarageLogo from "@/components/PortalGarageLogo";

function SubmitButton() {
    const { pending } = useFormStatus();

    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full transform rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 font-semibold text-white transition-all hover:scale-[1.02] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50"
        >
            {pending ? "Entrando..." : "Entrar"}
        </button>
    );
}

export default function LoginPage() {
    const [state, setState] = useState<{ error?: string }>({});

    async function clientAction(formData: FormData) {
        const result = await login(formData);
        if (result?.error) {
            setState({ error: result.error });
        }
    }

    return (
        <div className="flex min-h-[calc(100dvh-7rem)] w-full items-center justify-center bg-gradient-to-br from-sky-50 via-violet-50 to-amber-50 p-4">
            <div className="w-full max-w-md overflow-hidden rounded-2xl border border-stone-200 bg-white p-8 shadow-xl">
                <div className="mb-8 flex flex-col items-center text-center">
                    <PortalGarageLogo className="h-14 w-14" />
                    <h1 className="mt-4 bg-gradient-to-r from-amber-700 via-amber-600 to-stone-800 bg-clip-text text-4xl font-bold text-transparent">
                        Portal Garage
                    </h1>
                    <p className="mt-2 text-sm uppercase tracking-widest text-amber-800/90">Acesso ao painel</p>
                </div>

                <form action={clientAction} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-stone-700">Email</label>
                        <input
                            type="email"
                            name="email"
                            autoComplete="email"
                            className="mt-1 block w-full rounded-lg border border-stone-300 bg-stone-50 px-4 py-3 text-stone-900 placeholder-stone-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                            placeholder="voce@exemplo.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-stone-700">Senha</label>
                        <input
                            type="password"
                            name="password"
                            autoComplete="current-password"
                            className="mt-1 block w-full rounded-lg border border-stone-300 bg-stone-50 px-4 py-3 text-stone-900 placeholder-stone-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {state.error && (
                        <div className="rounded-lg bg-red-50 p-3 text-center text-sm text-red-700">{state.error}</div>
                    )}

                    <SubmitButton />
                </form>

                <p className="mt-6 text-center text-sm text-stone-600">
                    Primeira vez?{" "}
                    <Link href="/associacao" className="text-amber-800 hover:text-amber-900 font-medium">
                        Associação
                    </Link>
                </p>
                <div className="mt-4 text-center">
                    <Link href="/" className="text-sm text-stone-500 transition-colors hover:text-stone-800">
                        ← Voltar para Início
                    </Link>
                </div>
            </div>
        </div>
    );
}
