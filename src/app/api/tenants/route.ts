import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/require-tenant";

export async function GET(req: NextRequest) {
    const session = await requireTenantSession(req);
    if (session instanceof NextResponse) return session;
    if (!session.superAdmin) {
        return NextResponse.json({ error: "Proibido" }, { status: 403 });
    }
    const tenants = await prisma.tenant.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true },
    });
    return NextResponse.json(tenants);
}
