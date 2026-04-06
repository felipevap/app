import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireTenantSession } from "@/lib/require-tenant";
import type { SessionPayload } from "@/lib/session";

export async function requireStaffSession(
    req: NextRequest
): Promise<SessionPayload | NextResponse> {
    const session = await requireTenantSession(req);
    if (session instanceof NextResponse) return session;
    if (session.role === "owner") {
        return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    return session;
}
