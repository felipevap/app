"use server";

import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import bcrypt from "bcryptjs";
import { addDays, PREMIUM_FULL_PLAN } from "@/lib/billing";
import { mysqlDatabaseUrlProblem, prismaErrorUserMessage } from "@/lib/db-client-errors";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/session";
import { slugifyBase } from "@/lib/slug";

export async function registerOrganization(formData: FormData) {
    const tenantName = (formData.get("tenantName") as string)?.trim();
    const name = (formData.get("name") as string)?.trim() || null;
    const email = (formData.get("email") as string)?.trim().toLowerCase();
    const password = formData.get("password") as string;
    const acceptedPlan = formData.get("acceptPlan");

    if (!tenantName || !email || !password) {
        return { error: "Preencha nome da organização, email e senha" };
    }

    if (acceptedPlan !== "yes") {
        return { error: "Confirme a assinatura do Premium Full para continuar." };
    }

    if (password.length < 8) {
        return { error: "Senha deve ter no mínimo 8 caracteres" };
    }

    const urlProblem = mysqlDatabaseUrlProblem();
    if (urlProblem) {
        return { error: `Cadastro indisponível: ${urlProblem}` };
    }

    const authSecret = process.env.AUTH_SECRET;
    if (!authSecret || authSecret.length < 32) {
        return { error: "Cadastro indisponível: configure AUTH_SECRET com pelo menos 32 caracteres." };
    }

    try {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return { error: "Este email já está cadastrado" };
        }

        let slug = `${slugifyBase(tenantName)}-${randomUUID().slice(0, 8)}`;
        for (let i = 0; i < 12; i += 1) {
            const clash = await prisma.tenant.findUnique({ where: { slug } });
            if (!clash) break;
            slug = `${slugifyBase(tenantName)}-${randomUUID().slice(0, 8)}`;
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const subscriptionStartedAt = new Date();
        const trialEndsAt = addDays(subscriptionStartedAt, PREMIUM_FULL_PLAN.trialDays);

        const { user } = await prisma.$transaction(async (tx) => {
            const tenant = await tx.tenant.create({
                data: {
                    name: tenantName,
                    slug,
                    subscriptionPlanCode: PREMIUM_FULL_PLAN.code,
                    subscriptionPlanName: PREMIUM_FULL_PLAN.name,
                    subscriptionStatus: "trialing",
                    subscriptionMonthlyPriceCents: PREMIUM_FULL_PLAN.monthlyPriceCents,
                    billingEmail: email,
                    subscriptionStartedAt,
                    trialEndsAt,
                    nextBillingAt: trialEndsAt,
                },
            });

            const user = await tx.user.create({
                data: {
                    email,
                    passwordHash,
                    name,
                    tenantId: tenant.id,
                    isActive: true,
                },
            });

            return { user };
        });

        const tenantId = user.tenantId;
        if (!tenantId) {
            return { error: "Não foi possível concluir o cadastro. Tente novamente." };
        }

        const token = await signSession(user.id, tenantId, false, { role: "staff" });
        const jar = await cookies();
        jar.set(SESSION_COOKIE, token, sessionCookieOptions(7 * 24 * 60 * 60));

        redirect("/administracao");
    } catch (e) {
        if (isRedirectError(e)) throw e;
        console.error("[registerOrganization]", e);
        const mapped = prismaErrorUserMessage(e);
        if (mapped) {
            return { error: mapped };
        }
        return { error: "Não foi possível concluir o cadastro. Verifique o banco ou tente outro email." };
    }
}
