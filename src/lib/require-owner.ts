import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireTenantSession } from "@/lib/require-tenant";
import type { SessionPayload } from "@/lib/session";

export async function requireOwnerSession(
    req: NextRequest
): Promise<SessionPayload | NextResponse> {
    const session = await requireTenantSession(req);
    if (session instanceof NextResponse) return session;
    if (session.role !== "owner" || !session.ownerGarageSaleId) {
        return NextResponse.json({ error: "Proibido" }, { status: 403 });
    }
    return session;
}
