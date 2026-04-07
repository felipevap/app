"use server";

import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { TENANT_BILLING_STATUSES, type TenantBillingStatus } from "@/lib/billing";
import { requireSuperAdminOperator } from "@/lib/super-admin";
import { SESSION_COOKIE, sessionCookieOptions, signTenantImpersonationSession } from "@/lib/session";

type ActionResult = { ok?: boolean; error?: string };

function parseOptionalDate(value?: string | null): Date | null {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function startTenantImpersonation(tenantId: string): Promise<ActionResult> {
    const operator = await requireSuperAdminOperator();
    if (!operator) {
        return { error: "Sem permissão para impersonar tenants." };
    }

    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true },
    });

    if (!tenant) {
        return { error: "Tenant não encontrado." };
    }

    const token = await signTenantImpersonationSession(operator.user.id, tenant.id);
    const jar = await cookies();
    jar.set(SESSION_COOKIE, token, sessionCookieOptions(7 * 24 * 60 * 60));

    return { ok: true };
}

export async function updateTenantBilling(input: {
    tenantId: string;
    subscriptionStatus: TenantBillingStatus;
    billingEmail: string;
    trialEndsAt?: string | null;
    nextBillingAt?: string | null;
    lastPaymentAt?: string | null;
}): Promise<ActionResult> {
    const operator = await requireSuperAdminOperator();
    if (!operator) {
        return { error: "Sem permissão para atualizar cobrança." };
    }

    if (!TENANT_BILLING_STATUSES.includes(input.subscriptionStatus)) {
        return { error: "Status de cobrança inválido." };
    }

    await prisma.tenant.update({
        where: { id: input.tenantId },
        data: {
            subscriptionStatus: input.subscriptionStatus,
            billingEmail: input.billingEmail.trim().toLowerCase() || null,
            trialEndsAt: parseOptionalDate(input.trialEndsAt),
            nextBillingAt: parseOptionalDate(input.nextBillingAt),
            lastPaymentAt: parseOptionalDate(input.lastPaymentAt),
        },
    });

    revalidatePath("/super");
    return { ok: true };
}

export async function setTenantUserActive(userId: string, active: boolean): Promise<ActionResult> {
    const operator = await requireSuperAdminOperator();
    if (!operator) {
        return { error: "Sem permissão para alterar usuários." };
    }

    const target = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, isSuperAdmin: true, tenantId: true, isActive: true },
    });

    if (!target || target.isSuperAdmin || !target.tenantId) {
        return { error: "Usuário não encontrado para esse tenant." };
    }

    if (!active && target.isActive) {
        const activePeers = await prisma.user.count({
            where: {
                tenantId: target.tenantId,
                isSuperAdmin: false,
                isActive: true,
                NOT: { id: userId },
            },
        });

        if (activePeers === 0) {
            return { error: "Não é possível inativar o último usuário ativo do tenant." };
        }
    }

    await prisma.user.update({
        where: { id: userId },
        data: { isActive: active },
    });

    revalidatePath("/super");
    return { ok: true };
}

export async function resetTenantUserPassword(userId: string): Promise<{ ok?: boolean; error?: string; password?: string }> {
    const operator = await requireSuperAdminOperator();
    if (!operator) {
        return { error: "Sem permissão para resetar senha." };
    }

    const target = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, isSuperAdmin: true, tenantId: true },
    });

    if (!target || target.isSuperAdmin || !target.tenantId) {
        return { error: "Usuário não encontrado para esse tenant." };
    }

    const password = `PG-${randomBytes(4).toString("hex").toUpperCase()}`;
    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.update({
        where: { id: userId },
        data: { passwordHash, isActive: true },
    });

    revalidatePath("/super");
    return { ok: true, password };
}

export async function deleteTenantUser(userId: string): Promise<ActionResult> {
    const operator = await requireSuperAdminOperator();
    if (!operator) {
        return { error: "Sem permissão para excluir usuários." };
    }

    const target = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, isSuperAdmin: true, tenantId: true },
    });

    if (!target || target.isSuperAdmin || !target.tenantId) {
        return { error: "Usuário não encontrado para esse tenant." };
    }

    const remainingUsers = await prisma.user.count({
        where: {
            tenantId: target.tenantId,
            isSuperAdmin: false,
            NOT: { id: userId },
        },
    });

    if (remainingUsers === 0) {
        return { error: "Não é possível excluir o último usuário do tenant." };
    }

    await prisma.user.delete({ where: { id: userId } });

    revalidatePath("/super");
    return { ok: true };
}
