import { NextRequest, NextResponse } from "next/server";
import { requireOwnerSession } from "@/lib/require-owner";
import { getPortalContractSignPayload } from "@/lib/portal-contract-gate";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
    const session = await requireOwnerSession(req);
    if (session instanceof NextResponse) return session;

    try {
        const payload = await getPortalContractSignPayload(session);
        if (!payload) {
            return NextResponse.json({ pending: false as const });
        }
        return NextResponse.json({
            pending: true as const,
            phase: payload.phase,
            renderedText: payload.renderedText,
            title: payload.title,
        });
    } catch (e) {
        console.error("[portal/contract/pending]", e);
        return NextResponse.json({ error: "Falha" }, { status: 500 });
    }
}
