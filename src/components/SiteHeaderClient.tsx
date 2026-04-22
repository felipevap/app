"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = {
    loggedIn: boolean;
    isSuperAdmin: boolean;
    isImpersonating: boolean;
    panelHref: string;
};

export default function SiteHeaderClient({ loggedIn, isSuperAdmin, isImpersonating, panelHref }: Props) {
    const router = useRouter();

    async function logout() {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/");
        router.refresh();
    }

    async function stopImpersonation() {
        await fetch("/api/auth/impersonation/stop", { method: "POST" });
        router.push("/super");
        router.refresh();
    }

    return (
        <div className="ml-auto flex items-center gap-2 pr-1 sm:gap-3">
            {loggedIn ? (
                <>
                    {isImpersonating && (
                        <>
                            <Link href="/super" className="text-sm font-medium text-sky-300 transition-colors hover:text-sky-200">
                                Voltar ao Super Admin
                            </Link>
                            <button type="button" onClick={() => void stopImpersonation()} className="rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-sm font-medium text-sky-100 transition-colors hover:bg-sky-500/20 sm:px-4">
                                Encerrar visão
                            </button>
                        </>
                    )}
                    {!isImpersonating &&
                        (isSuperAdmin ? (
                            <Link href="/super" className="text-sm font-medium text-amber-400/90 transition-colors hover:text-amber-300">
                                Super Admin
                            </Link>
                        ) : (
                            <>
                                <Link href={panelHref} className="text-sm font-medium text-slate-300 transition-colors hover:text-white">
                                    Painel
                                </Link>
                                <Link href="/download" className="hidden text-sm font-medium text-slate-400 transition-colors hover:text-white sm:inline">
                                    App Windows / macOS
                                </Link>
                            </>
                        ))}
                    <button type="button" onClick={() => void logout()} className="rounded-full border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm font-medium text-red-200 transition-colors hover:bg-red-950/60 sm:px-4">
                        Sair
                    </button>
                </>
            ) : (
                <>
                    <Link href="/#planos" className="text-sm font-medium text-amber-400/90 transition-colors hover:text-amber-300">
                        Planos
                    </Link>
                    <Link href="/login" className="rounded-full bg-gradient-to-r from-amber-500 to-amber-400 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-105 sm:px-4">
                        Entrar
                    </Link>
                </>
            )}
        </div>
    );
}
