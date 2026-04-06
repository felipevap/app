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
        <div className="ml-auto flex items-center gap-3 pr-1">
            {loggedIn ? (
                <>
                    {isSuperAdmin ? (
                        <Link
                            href="/super"
                            className="text-sm font-medium text-amber-800 transition-colors hover:text-amber-700"
                        >
                            Super Admin
                        </Link>
                    ) : (
                        <Link
                            href="/dashboard"
                            className="text-sm font-medium text-stone-600 transition-colors hover:text-stone-900"
                        >
                            Painel
                        </Link>
                    )}
                    <button
                        type="button"
                        onClick={() => void logout()}
                        className="rounded-full bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
                    >
                        Sair
                    </button>
                </>
            ) : (
                <>
                    <Link
                        href="/associacao"
                        className="text-sm font-medium text-amber-800 transition-colors hover:text-amber-900"
                    >
                        Associação
                    </Link>
                    <Link
                        href="/login"
                        className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                    >
                        Entrar
                    </Link>
                </>
            )}
        </div>
    );
}
