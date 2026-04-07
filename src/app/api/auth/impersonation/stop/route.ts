import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/session";
import { getSessionFromRequest } from "@/lib/session";

export async function POST(request: NextRequest) {
    const session = await getSessionFromRequest(request);
    if (!session?.impersonating) {
        return NextResponse.json({ error: "Nenhuma impersonação ativa." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, isSuperAdmin: true },
    });

    if (!user?.isSuperAdmin) {
        return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
    }

    const token = await signSession(user.id, null, true);
    const jar = await cookies();
    jar.set(SESSION_COOKIE, token, sessionCookieOptions(7 * 24 * 60 * 60));

    return NextResponse.json({ ok: true });
}
