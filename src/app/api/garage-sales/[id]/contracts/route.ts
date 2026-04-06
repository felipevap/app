import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffSession } from "@/lib/require-staff";
import { garageSaleFindWhere } from "@/lib/tenant-scope";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

        const [templates, acceptances] = await Promise.all([
            prisma.garageSaleContractTemplate.findMany({
                where: { garageSaleId: id },
                orderBy: { phase: "asc" },
            }),
            prisma.garageSaleContractAcceptance.findMany({
                where: { garageSaleId: id },
                orderBy: { acceptedAt: "desc" },
                include: { signer: { select: { id: true, email: true, name: true } } },
            }),
        ]);

        const gs = await prisma.garageSale.findUnique({
            where: { id },
            select: {
                itemsRegistrationComplete: true,
                itemsRegistrationCompletedAt: true,
            },
        });

        return NextResponse.json({
            itemsRegistrationComplete: gs?.itemsRegistrationComplete ?? false,
            itemsRegistrationCompletedAt: gs?.itemsRegistrationCompletedAt ?? null,
            templates,
            acceptances,
        });
    } catch (e) {
        console.error("[garage-sales/contracts GET]", e);
        return NextResponse.json({ error: "Falha ao carregar" }, { status: 500 });
    }
}
