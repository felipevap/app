"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { login } from "./actions";

function SubmitButton() {
    const { pending } = useFormStatus();

    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full transform rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 font-semibold text-white transition-all hover:scale-[1.02] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {pending ? "Entrando..." : "Entrar"}
        </button>
    );
}

export default function LoginPage() {
    const [state, setState] = useState<{ error?: string }>({});

    // Wrap the server action to handle the return value
    const clientAction = async (formData: FormData) => {
        const result = await login(formData);
        if (result?.error) {
            setState({ error: result.error });
        }
    };

    return (
        <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-black p-4">
            <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
                <div className="mb-8 text-center">
                    <h1 className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-4xl font-bold text-transparent">
                        Garage Sale Premium
                    </h1>
                    <p className="mt-2 text-gray-400">Acesso Gerenciador</p>
                </div>

                <form action={clientAction} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300">
                            Email ou Usuário
                        </label>
                        <input
                            type="text"
                            name="email"
                            className="mt-1 block w-full rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                            placeholder="admin@exemplo.com ou usuario"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300">
                            Senha
                        </label>
                        <input
                            type="password"
                            name="password"
                            className="mt-1 block w-full rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {state.error && (
                        <div className="rounded-lg bg-red-500/10 p-3 text-center text-sm text-red-400">
                            {state.error}
                        </div>
                    )}

                    <SubmitButton />
                </form>

                <div className="mt-6 text-center">
                    <a
                        href="/"
                        className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                        ← Voltar para Início
                    </a>
                </div>
            </div>
        </div>
    );
}
