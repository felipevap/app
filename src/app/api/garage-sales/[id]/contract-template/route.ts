import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffSession } from "@/lib/require-staff";
import { garageSaleFindWhere } from "@/lib/tenant-scope";
import { CONTRACT_PHASE_ONBOARDING, CONTRACT_PHASE_PRE_EVENT, normalizeSegments } from "@/lib/contract";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await requireStaffSession(req);
    if (session instanceof NextResponse) return session;

    try {
        const { id } = await params;
        const owned = await prisma.garageSale.findFirst({
            where: garageSaleFindWhere(session, id),
            select: { id: true },
        });
        if (!owned) {
            return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
        }

        const body = await req.json();
        const phase = body.phase === CONTRACT_PHASE_PRE_EVENT ? CONTRACT_PHASE_PRE_EVENT : CONTRACT_PHASE_ONBOARDING;
        const segments = normalizeSegments(body.segments);
        if (!segments) {
            return NextResponse.json({ error: "segments inválidos" }, { status: 400 });
        }
        const sourceFileName =
            typeof body.sourceFileName === "string" ? body.sourceFileName.slice(0, 512) : null;

        const row = await prisma.garageSaleContractTemplate.upsert({
            where: { garageSaleId_phase: { garageSaleId: id, phase } },
            create: {
                garageSaleId: id,
                phase,
                sourceFileName,
                segments,
            },
            update: { sourceFileName, segments },
        });

        return NextResponse.json(row);
    } catch (e) {
        console.error("[contract-template PUT]", e);
        return NextResponse.json({ error: "Falha ao salvar" }, { status: 500 });
    }
}
