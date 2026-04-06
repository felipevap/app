"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = {
    loggedIn: boolean;
    isSuperAdmin: boolean;
};

export default function SiteHeaderClient({ loggedIn, isSuperAdmin }: Props) {
    const router = useRouter();

    async function logout() {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/");
        router.refresh();
    }

    return (
        <div className="ml-auto flex items-center gap-2 pr-1 sm:gap-3">
            {loggedIn ? (
                <>
                    {isSuperAdmin ? (
                        <Link
                            href="/super"
                            className="text-sm font-medium text-amber-400/90 transition-colors hover:text-amber-300"
                        >
                            Super Admin
                        </Link>
                    ) : (
                        <Link
                            href="/dashboard"
                            className="text-sm font-medium text-slate-300 transition-colors hover:text-white"
                        >
                            Painel
                        </Link>
                    )}
                    <button
                        type="button"
                        onClick={() => void logout()}
                        className="rounded-full border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm font-medium text-red-200 transition-colors hover:bg-red-950/60 sm:px-4"
                    >
                        Sair
                    </button>
                </>
            ) : (
                <>
                    <Link
                        href="/#passaporte"
                        className="text-sm font-medium text-amber-400/90 transition-colors hover:text-amber-300"
                    >
                        Passaporte
                    </Link>
                    <Link
                        href="/login"
                        className="rounded-full bg-gradient-to-r from-amber-500 to-amber-400 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-105 sm:px-4"
                    >
                        Entrar
                    </Link>
                </>
            )}
        </div>
    );
}
