import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookies } from "@/lib/session";
import SiteHeaderClient from "@/components/SiteHeaderClient";
import PortalGarageLogo from "@/components/PortalGarageLogo";

export default async function SiteHeader() {
    const session = await getSessionFromCookies();
    const loggedIn = !!session;

    let isSuperAdmin = false;
    if (session) {
        const u = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { isSuperAdmin: true },
        });
        isSuperAdmin = u?.isSuperAdmin ?? false;
    }

    return (
        <header className="fixed top-0 left-0 right-0 z-[100] flex h-24 items-center border-b border-stone-200 bg-white/95 px-4 shadow-sm backdrop-blur-md">
            <Link
                href="/"
                className="flex min-w-0 flex-1 items-center gap-3 outline-offset-4 focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500/80"
            >
                <PortalGarageLogo className="h-10 w-10 shrink-0 drop-shadow-sm sm:h-11 sm:w-11" aria-hidden />
                <span className="flex min-w-0 flex-col leading-tight">
                    <span className="text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">Portal Garage</span>
                    <span className="hidden text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-800/90 sm:inline">
                        Eventos premium
                    </span>
                </span>
            </Link>
            <SiteHeaderClient loggedIn={loggedIn} isSuperAdmin={isSuperAdmin} />
        </header>
    );
}
