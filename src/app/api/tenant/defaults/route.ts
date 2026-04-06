import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffSession } from "@/lib/require-staff";

export async function GET(req: NextRequest) {
    const session = await requireStaffSession(req);
    if (session instanceof NextResponse) return session;

    const { searchParams } = new URL(req.url);
    let tenantId = session.tenantId ?? null;
    if (session.superAdmin) {
        tenantId = searchParams.get("tenantId") || tenantId;
    }
    if (!tenantId) {
        return NextResponse.json({ error: "tenantId é obrigatório" }, { status: 400 });
    }

    try {
        const tenant = await prisma.tenant.findFirst({
            where: { id: tenantId },
            select: { defaultCommissionPercent: true },
        });
        if (!tenant) {
            return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });
        }
        return NextResponse.json({ defaultCommissionPercent: tenant.defaultCommissionPercent });
    } catch (e) {
        console.error("[tenant/defaults]", e);
        return NextResponse.json({ error: "Falha ao carregar" }, { status: 500 });
    }
}
