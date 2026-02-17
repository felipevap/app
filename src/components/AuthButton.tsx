"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

interface AuthButtonProps {
    isLoggedIn: boolean;
}

export default function AuthButton({ isLoggedIn }: AuthButtonProps) {
    const router = useRouter();

    const handleLogout = () => {
        document.cookie = "auth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
        router.refresh();
    };

    if (isLoggedIn) {
        return (
            <button
                onClick={handleLogout}
                className="rounded-full bg-red-500/10 px-6 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20"
            >
                Sair
            </button>
        );
    }

    return (
        <Link
            href="/login"
            className="rounded-full bg-blue-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
            Login
        </Link>
    );
}
