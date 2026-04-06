"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import bcrypt from "bcryptjs";
import { mysqlDatabaseUrlProblem, prismaErrorUserMessage } from "@/lib/db-client-errors";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/session";
import { randomUUID } from "crypto";
import { slugifyBase } from "@/lib/slug";

export async function registerOrganization(formData: FormData) {
    const tenantName = (formData.get("tenantName") as string)?.trim();
    const name = (formData.get("name") as string)?.trim() || null;
    const email = (formData.get("email") as string)?.trim().toLowerCase();
    const password = formData.get("password") as string;

    if (!tenantName || !email || !password) {
        return { error: "Preencha nome da organização, email e senha" };
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
        return { error: "Cadastro indisponível: configure AUTH_SECRET (mín. 32 caracteres)." };
    }

    try {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return { error: "Este email já está cadastrado" };
        }

        let slug = `${slugifyBase(tenantName)}-${randomUUID().slice(0, 8)}`;
        for (let i = 0; i < 12; i++) {
            const clash = await prisma.tenant.findUnique({ where: { slug } });
            if (!clash) break;
            slug = `${slugifyBase(tenantName)}-${randomUUID().slice(0, 8)}`;
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const { user } = await prisma.$transaction(async (tx) => {
            const tenant = await tx.tenant.create({
                data: { name: tenantName, slug },
            });
            const user = await tx.user.create({
                data: {
                    email,
                    passwordHash,
                    name,
                    tenantId: tenant.id,
                },
            });
            return { user };
        });

        const tenantId = user.tenantId;
        if (!tenantId) {
            return { error: "Não foi possível concluir o cadastro. Tente novamente." };
        }

        const token = await signSession(user.id, tenantId, false);
        const jar = await cookies();
        jar.set(SESSION_COOKIE, token, sessionCookieOptions(7 * 24 * 60 * 60));

        redirect("/dashboard");
    } catch (e) {
        if (isRedirectError(e)) throw e;
        console.error("[registerOrganization]", e);
        const mapped = prismaErrorUserMessage(e);
        if (mapped) {
            return { error: mapped };
        }
        return { error: "Não foi possível concluir o cadastro. Verifique a conexão com o banco ou tente outro email." };
    }
}
