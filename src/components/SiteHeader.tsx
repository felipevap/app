import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookies } from "@/lib/session";
import SiteHeaderClient from "@/components/SiteHeaderClient";

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
        <header className="fixed top-0 left-0 right-0 z-[100] flex h-28 items-center border-b border-stone-200 bg-white/95 px-4 shadow-sm backdrop-blur-md">
            <Link
                href="/"
                className="flex min-w-0 shrink items-center outline-offset-4 focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500/80"
            >
                <Image
                    src="/apresentacao-316/maju-logo.png"
                    alt="Maju — Garage Sale"
                    width={680}
                    height={216}
                    className="h-[6.25rem] w-auto max-w-[min(680px,calc(100vw-11rem))] object-contain object-left"
                    priority
                />
            </Link>
            <SiteHeaderClient loggedIn={loggedIn} isSuperAdmin={isSuperAdmin} />
        </header>
    );
}
