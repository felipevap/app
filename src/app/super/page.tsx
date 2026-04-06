import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookies } from "@/lib/session";

export default async function SuperAdminPage() {
    const session = await getSessionFromCookies();
    if (!session) {
        redirect("/login");
    }

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user?.isSuperAdmin) {
        redirect("/dashboard");
    }

    const tenants = await prisma.tenant.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            _count: {
                select: { users: true, garageSales: true },
            },
        },
    });

    return (
        <div className="mx-auto max-w-5xl px-4 py-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-stone-900">Super Admin</h1>
                    <p className="text-sm text-stone-600">Todas as organizações (tenants) do sistema</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Link
                        href="/admin/garage-sales/new"
                        className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
                    >
                        Novo evento
                    </Link>
                    <Link
                        href="/admin/garage-sales"
                        className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
                    >
                        Eventos (painel)
                    </Link>
                    <Link href="/" className="text-sm text-amber-800 hover:text-amber-900 font-medium">
                        ← Site
                    </Link>
                </div>
            </div>

            <div className="mt-8 overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
                <table className="w-full text-left text-sm text-stone-700">
                    <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-stone-500">
                        <tr>
                            <th className="px-4 py-3">Organização</th>
                            <th className="px-4 py-3">Slug</th>
                            <th className="px-4 py-3">Usuários</th>
                            <th className="px-4 py-3">Eventos</th>
                            <th className="px-4 py-3">Criado</th>
                            <th className="px-4 py-3">ID</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tenants.map((t) => (
                            <tr key={t.id} className="border-b border-stone-100 hover:bg-stone-50">
                                <td className="px-4 py-3 font-medium text-stone-900">{t.name}</td>
                                <td className="px-4 py-3 text-stone-600">{t.slug}</td>
                                <td className="px-4 py-3">{t._count.users}</td>
                                <td className="px-4 py-3">{t._count.garageSales}</td>
                                <td className="px-4 py-3 text-stone-600">
                                    {t.createdAt.toLocaleDateString("pt-BR")}
                                </td>
                                <td className="max-w-[120px] truncate px-4 py-3 font-mono text-xs text-stone-500">
                                    {t.id}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {tenants.length === 0 && (
                <p className="mt-8 text-center text-stone-600">Nenhum tenant cadastrado ainda.</p>
            )}

            <p className="mt-8 text-xs text-stone-600">
                Ao criar evento pelo painel, selecione a organização. Na API{" "}
                <code className="rounded bg-stone-100 px-1 py-0.5 text-stone-800">POST /api/garage-sales</code>, envie{" "}
                <code className="rounded bg-stone-100 px-1 py-0.5 text-stone-800">tenantId</code> no JSON. Usuários normais veem só o próprio tenant.
            </p>
        </div>
    );
}
