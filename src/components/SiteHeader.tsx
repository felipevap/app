import Link from "next/link";
import { getSessionFromCookies } from "@/lib/session";
import { getPanelHref } from "@/lib/panel-routes";
import SiteHeaderClient from "@/components/SiteHeaderClient";
import PortalGarageLogo from "@/components/PortalGarageLogo";

export default async function SiteHeader() {
    const session = await getSessionFromCookies();
    const loggedIn = !!session;
    const isSuperAdmin = session?.superAdmin ?? false;
    const isImpersonating = session?.impersonating ?? false;
    const panelHref = getPanelHref(session);

    return (
        <header className="fixed top-0 left-0 right-0 z-[100] flex h-16 items-center border-b border-white/[0.08] bg-slate-950/90 px-4 shadow-lg shadow-black/20 backdrop-blur-xl">
            <Link
                href="/"
                className="flex min-w-0 shrink items-center gap-2.5 outline-offset-4 focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500/80"
            >
                <PortalGarageLogo className="h-9 w-9 shrink-0 sm:h-10 sm:w-10" aria-hidden />
                <span className="truncate text-lg font-semibold tracking-tight text-white sm:text-xl">Portal Garage</span>
            </Link>
            <SiteHeaderClient loggedIn={loggedIn} isSuperAdmin={isSuperAdmin} isImpersonating={isImpersonating} panelHref={panelHref} />
        </header>
    );
}
