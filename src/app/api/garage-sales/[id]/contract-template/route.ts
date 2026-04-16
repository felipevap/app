import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffSession } from "@/lib/require-staff";
import { garageSaleFindWhere } from "@/lib/tenant-scope";

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
        const templateId = typeof body.templateId === "string" ? body.templateId : "";
        const filledParams = typeof body.filledParams === "object" && body.filledParams !== null ? body.filledParams : {};

        if (!templateId) {
            return NextResponse.json({ error: "templateId obrigatório" }, { status: 400 });
        }

        const template = await prisma.contractTemplate.findUnique({ where: { id: templateId } });
        if (!template || template.tenantId !== session.tenantId) {
            return NextResponse.json({ error: "Modelo inválido" }, { status: 404 });
        }

        const row = await prisma.garageSaleContractTemplate.upsert({
            where: { garageSaleId_templateId: { garageSaleId: id, templateId } },
            create: {
                garageSaleId: id,
                templateId,
                filledParams,
            },
            update: { filledParams },
        });

        return NextResponse.json(row);
    } catch (e) {
        console.error("[contract-template PUT]", e);
        return NextResponse.json({ error: "Falha ao salvar" }, { status: 500 });
    }
}
