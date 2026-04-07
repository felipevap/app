import { prisma } from "@/lib/prisma";
import { getSessionFromCookies, type SessionPayload } from "@/lib/session";

export async function requireSuperAdminOperator(): Promise<{
    session: SessionPayload;
    user: { id: string; email: string; isSuperAdmin: boolean; name: string | null };
} | null> {
    const session = await getSessionFromCookies();
    if (!session) return null;

    const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, email: true, isSuperAdmin: true, name: true },
    });

    if (!user?.isSuperAdmin) {
        return null;
    }

    return { session, user };
}
