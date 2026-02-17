"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (email === "leader.fabio@gmail.com" && password === "eamsjc73") {
            document.cookie = "auth=true; path=/";
            router.push("/admin");
        } else {
            setError("Credenciais inválidas");
        }
    };

    return (
        <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-black p-4">
            <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
                <div className="mb-8 text-center">
                    <h1 className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-4xl font-bold text-transparent">
                        Garage Sale
                    </h1>
                    <p className="mt-2 text-gray-400">Acesso Gerenciador</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1 block w-full rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                            placeholder="admin@exemplo.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300">
                            Senha
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 block w-full rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {error && (
                        <div className="rounded-lg bg-red-500/10 p-3 text-center text-sm text-red-400">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full transform rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 font-semibold text-white transition-all hover:scale-[1.02] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                    >
                        Entrar
                    </button>
                </form>
            </div>
        </div>
    );
}
