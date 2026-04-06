import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSessionFromRequest, type SessionPayload } from "@/lib/session";

export async function requireTenantSession(
    req: NextRequest
): Promise<SessionPayload | NextResponse> {
    const session = await getSessionFromRequest(req);
    if (!session) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return session;
}
