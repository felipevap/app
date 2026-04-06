import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookies } from "@/lib/session";
import PortalGarageLogo from "@/components/PortalGarageLogo";
import { ScanBarcode, ShoppingCart, Store } from "lucide-react";

export default async function AdministracaoPage() {
    const session = await getSessionFromCookies();
    if (!session) {
        redirect("/login");
    }
    if (session.superAdmin) {
        redirect("/super");
    }
    if (session.role === "owner") {
        redirect("/portal");
    }
    if (!session.tenantId) {
        redirect("/login");
    }

    const tenant = await prisma.tenant.findUnique({
        where: { id: session.tenantId },
        select: { name: true, adminLogoDataUrl: true },
    });

    if (!tenant) {
        redirect("/login");
    }

    const cards = [
        {
            href: "/admin",
            title: "Organizador",
            desc: "Eventos, produtos, vendas e gestão completa.",
            icon: Store,
            className: "border-violet-200 bg-violet-50/80 hover:border-violet-300 hover:bg-violet-50",
            iconClass: "text-violet-600",
        },
        {
            href: "/capture",
            title: "Checagem",
            desc: "Consulta de preços e disponibilidade no evento.",
            icon: ScanBarcode,
            className: "border-emerald-200 bg-emerald-50/80 hover:border-emerald-300 hover:bg-emerald-50",
            iconClass: "text-emerald-600",
        },
        {
            href: "/pos",
            title: "PDV",
            desc: "Ponto de venda e fechamento de compras.",
            icon: ShoppingCart,
            className: "border-rose-200 bg-rose-50/80 hover:border-rose-300 hover:bg-rose-50",
            iconClass: "text-rose-600",
        },
    ] as const;

    return (
        <div className="min-h-[calc(100dvh-4rem)] bg-gradient-to-b from-stone-100 to-stone-200/90 px-4 py-10">
            <div className="mx-auto max-w-3xl">
                <div className="flex flex-col items-center text-center">
                    <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
                        {tenant.adminLogoDataUrl ? (
                            <Image
                                src={tenant.adminLogoDataUrl}
                                alt=""
                                width={80}
                                height={80}
                                unoptimized
                                className="object-contain"
                            />
                        ) : (
                            <PortalGarageLogo className="h-16 w-16" aria-hidden />
                        )}
                    </div>
                    <h1 className="mt-6 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">Administração</h1>
                    <p className="mt-2 text-stone-600">{tenant.name}</p>
                    <Link
                        href="/admin/settings"
                        className="mt-4 text-sm font-medium text-amber-800 hover:text-amber-900"
                    >
                        Configurações · logo e ajustes
                    </Link>
                </div>

                <ul className="mt-12 grid gap-4 sm:grid-cols-3">
                    {cards.map((c) => (
                        <li key={c.href}>
                            <Link
                                href={c.href}
                                className={`flex h-full flex-col rounded-2xl border-2 p-5 shadow-sm transition ${c.className}`}
                            >
                                <c.icon className={`h-8 w-8 ${c.iconClass}`} aria-hidden />
                                <span className="mt-4 text-lg font-semibold text-stone-900">{c.title}</span>
                                <span className="mt-1 text-sm text-stone-600">{c.desc}</span>
                            </Link>
                        </li>
                    ))}
                </ul>

                <p className="mt-10 text-center text-sm text-stone-500">
                    <Link href="/" className="text-amber-800 hover:text-amber-900">
                        ← Voltar ao site
                    </Link>
                </p>
            </div>
        </div>
    );
}
