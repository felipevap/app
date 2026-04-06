"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/session";

export async function login(formData: FormData) {
    const email = (formData.get("email") as string)?.trim().toLowerCase();
    const password = formData.get("password") as string;

    if (!email || !password) {
        return { error: "Preencha email e senha" };
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        return { error: "Credenciais inválidas" };
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
        return { error: "Credenciais inválidas" };
    }

    const token = await signSession(user.id, user.tenantId, user.isSuperAdmin);
    const jar = await cookies();
    jar.set(SESSION_COOKIE, token, sessionCookieOptions(7 * 24 * 60 * 60));

    if (user.isSuperAdmin) {
        redirect("/super");
    }
    redirect("/dashboard");
}
