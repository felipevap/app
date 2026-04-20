import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookies } from "@/lib/session";
import { isTenantAdministrator } from "@/lib/panel-routes";
import AdminLogoForm from "./AdminLogoForm";
import CommissionPercentForm from "./CommissionPercentForm";
import ReindexProductsForm from "./ReindexProductsForm";

export default async function AdminSettingsPage() {
    const session = await getSessionFromCookies();
    if (!session) {
        redirect("/login");
    }

    const tenant =
        isTenantAdministrator(session) && session.tenantId
            ? await prisma.tenant.findUnique({
                  where: { id: session.tenantId },
                  select: { adminLogoDataUrl: true, defaultCommissionPercent: true },
              })
            : null;

    return (
        <div>
            <h1 className="mb-6 text-3xl font-bold text-stone-900">Configurações</h1>
            {tenant ? (
                <>
                    <CommissionPercentForm initialPercent={tenant.defaultCommissionPercent} />
                    <ReindexProductsForm />
                    <AdminLogoForm initialDataUrl={tenant.adminLogoDataUrl} />
                </>
            ) : (
                <div className="rounded-xl border border-stone-200 bg-white p-6 text-center text-stone-600 shadow-sm">
                    <span className="mb-4 block text-4xl">⚙️</span>
                    <p>Configurações avançadas ficam disponíveis para o administrador da organização.</p>
                </div>
            )}
        </div>
    );
}
