import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSuperAdminOperator } from "@/lib/super-admin";
import SuperAdminDashboard from "@/app/super/SuperAdminDashboard";

function toIso(value: Date | null) {
    return value ? value.toISOString() : null;
}

export default async function SuperAdminPage() {
    const operator = await requireSuperAdminOperator();
    if (!operator) {
        redirect("/login");
    }

    const [tenants, superAdmins] = await Promise.all([
        prisma.tenant.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                users: {
                    where: { isSuperAdmin: false },
                    orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        isActive: true,
                        createdAt: true,
                        ownerGarageSaleId: true,
                    },
                },
                _count: {
                    select: { users: true, garageSales: true },
                },
            },
        }),
        prisma.user.findMany({
            where: { isSuperAdmin: true },
            orderBy: { createdAt: "asc" },
            select: { id: true, name: true, email: true, isActive: true, createdAt: true },
        }),
    ]);

    return (
        <SuperAdminDashboard
            operatorName={operator.user.name || operator.user.email}
            impersonating={operator.session.impersonating}
            superAdmins={superAdmins.map((admin) => ({
                ...admin,
                createdAt: admin.createdAt.toISOString(),
            }))}
            tenants={tenants.map((tenant) => ({
                id: tenant.id,
                name: tenant.name,
                slug: tenant.slug,
                subscriptionStatus: tenant.subscriptionStatus,
                subscriptionPlanName: tenant.subscriptionPlanName,
                subscriptionMonthlyPriceCents: tenant.subscriptionMonthlyPriceCents,
                billingEmail: tenant.billingEmail,
                subscriptionStartedAt: toIso(tenant.subscriptionStartedAt),
                trialEndsAt: toIso(tenant.trialEndsAt),
                nextBillingAt: toIso(tenant.nextBillingAt),
                lastPaymentAt: toIso(tenant.lastPaymentAt),
                createdAt: tenant.createdAt.toISOString(),
                users: tenant.users.map((user) => ({
                    ...user,
                    createdAt: user.createdAt.toISOString(),
                })),
                counts: {
                    users: tenant._count.users,
                    garageSales: tenant._count.garageSales,
                    activeUsers: tenant.users.filter((user) => user.isActive).length,
                },
            }))}
        />
    );
}
