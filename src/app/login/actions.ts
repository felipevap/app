"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { getTenantBlockedLoginMessage } from "@/lib/billing";
import { mysqlDatabaseUrlProblem, prismaErrorUserMessage } from "@/lib/db-client-errors";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/session";

export async function login(formData: FormData) {
    const email = (formData.get("email") as string)?.trim().toLowerCase();
    const password = formData.get("password") as string;

    if (!email || !password) {
        return { error: "Preencha email e senha" };
    }

    const urlProblem = mysqlDatabaseUrlProblem();
    if (urlProblem) {
        return { error: urlProblem };
    }

    let user;
    try {
        user = await prisma.user.findUnique({ where: { email } });
    } catch (e) {
        console.error("[login]", e);
        const mapped = prismaErrorUserMessage(e);
        if (mapped) {
            return { error: mapped };
        }
        return { error: "Serviço indisponível. Tente novamente em instantes." };
    }

    if (!user) {
        return { error: "Credenciais inválidas" };
    }

    if (!user.isActive) {
        return { error: "Este usuário está inativo. Peça ao super admin para reativar o acesso." };
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
        return { error: "Credenciais inválidas" };
    }

    if (!user.isSuperAdmin) {
        const tenantId = user.tenantId;
        if (!tenantId) {
            return { error: "Usuário sem tenant vinculado. Verifique o cadastro no super admin." };
        }

        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { subscriptionStatus: true, trialEndsAt: true },
        });

        if (!tenant) {
            return { error: "Tenant não encontrado. Verifique o cadastro no super admin." };
        }

        const blockedMessage = getTenantBlockedLoginMessage(tenant);
        if (blockedMessage) {
            return { error: blockedMessage };
        }
    }

    const dbRole = user.role === "owner" ? "owner" : "staff";
    const ownerGid = user.ownerGarageSaleId;
    let token: string;
    try {
        if (dbRole === "owner" && ownerGid) {
            token = await signSession(user.id, user.tenantId, user.isSuperAdmin, {
                role: "owner",
                ownerGarageSaleId: ownerGid,
            });
        } else {
            token = await signSession(user.id, user.tenantId, user.isSuperAdmin, { role: "staff" });
        }
    } catch {
        return { error: "Autenticação não configurada corretamente no servidor." };
    }

    const jar = await cookies();
    jar.set(SESSION_COOKIE, token, sessionCookieOptions(7 * 24 * 60 * 60));

    if (user.isSuperAdmin) {
        redirect("/super");
    }
    if (dbRole === "owner" && ownerGid) {
        redirect("/portal");
    }
    redirect("/administracao");
}
