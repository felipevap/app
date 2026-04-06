import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookies } from "@/lib/session";

export default async function DashboardPage() {
    const session = await getSessionFromCookies();
    if (!session) {
        redirect("/login");
    }

    const user = await prisma.user.findUnique({
        where: { id: session.userId },
        include: { tenant: true },
    });

    if (!user) {
        redirect("/login");
    }

    if (user.isSuperAdmin) {
        redirect("/super");
    }

    if (!session.tenantId || !user.tenant) {
        redirect("/login");
    }

    const garageSales = await prisma.garageSale.findMany({
        where: { tenantId: session.tenantId, deletedAt: null },
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { products: true } } },
    });

    return (
        <div className="mx-auto max-w-4xl px-4 py-8">
            <h1 className="text-3xl font-bold text-stone-900">Painel</h1>
            <p className="mt-1 text-stone-600">
                {user.tenant.name}
                {user.name ? ` · ${user.name}` : ""} · {user.email}
            </p>

            <h2 className="mt-10 text-lg font-semibold text-stone-900">Seus eventos</h2>
            <p className="text-sm text-stone-600">Garagens e feiras cadastradas na sua organização.</p>

            <ul className="mt-4 space-y-3">
                {garageSales.map((gs) => (
                    <li
                        key={gs.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm"
                    >
                        <div>
                            <p className="font-medium text-stone-900">{gs.nome}</p>
                            <p className="text-xs text-stone-500">
                                {gs._count.products} produto(s) · {new Date(gs.dataInicio).toLocaleDateString("pt-BR")}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Link
                                href={`/admin/products?garageSale=${gs.id}`}
                                className="rounded-lg bg-stone-800 px-3 py-1.5 text-sm text-white hover:bg-stone-700"
                            >
                                Produtos
                            </Link>
                            <Link
                                href="/pos"
                                className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm text-white hover:bg-rose-700"
                            >
                                PDV
                            </Link>
                            <Link
                                href="/capture"
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700"
                            >
                                Checagem
                            </Link>
                        </div>
                    </li>
                ))}
            </ul>

            {garageSales.length === 0 && (
                <p className="mt-6 rounded-xl border border-dashed border-stone-300 p-8 text-center text-stone-600">
                    Nenhum evento ainda.{" "}
                    <Link href="/admin/garage-sales/new" className="text-amber-800 hover:text-amber-900 font-medium">
                        Criar primeiro evento
                    </Link>
                </p>
            )}

            <div className="mt-10 flex flex-wrap gap-4">
                <Link
                    href="/admin"
                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700"
                >
                    Painel administrativo
                </Link>
                <Link
                    href="/admin/garage-sales"
                    className="rounded-xl border border-stone-300 px-5 py-3 text-sm font-medium text-stone-800 hover:bg-stone-100"
                >
                    Todos os eventos
                </Link>
            </div>
        </div>
    );
}
