import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireOwnerSession } from "@/lib/require-owner";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/session";

export async function POST(req: NextRequest) {
    const session = await requireOwnerSession(req);
    if (session instanceof NextResponse) return session;

    let body: { currentPassword?: string; newPassword?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    const currentPassword = body.currentPassword ?? "";
    const newPassword = body.newPassword ?? "";
    if (!currentPassword || !newPassword) {
        return NextResponse.json({ error: "Preencha senha atual e nova senha" }, { status: 400 });
    }
    if (newPassword.length < 8) {
        return NextResponse.json({ error: "Nova senha deve ter no mínimo 8 caracteres" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || !user.tenantId || !user.ownerGarageSaleId) {
        return NextResponse.json({ error: "Usuário inválido" }, { status: 400 });
    }

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
        return NextResponse.json({ error: "Senha atual incorreta" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
    });

    const token = await signSession(user.id, user.tenantId, false, {
        role: "owner",
        ownerGarageSaleId: user.ownerGarageSaleId,
    });
    const jar = await cookies();
    jar.set(SESSION_COOKIE, token, sessionCookieOptions(7 * 24 * 60 * 60));

    return NextResponse.json({ ok: true });
}
