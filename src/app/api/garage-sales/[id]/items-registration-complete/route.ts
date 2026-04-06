import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffSession } from "@/lib/require-staff";
import { garageSaleFindWhere } from "@/lib/tenant-scope";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

        const body = await req.json().catch(() => ({}));
        const complete = body.complete !== false;

        const gs = await prisma.garageSale.update({
            where: { id },
            data: {
                itemsRegistrationComplete: complete,
                itemsRegistrationCompletedAt: complete ? new Date() : null,
            },
        });

        return NextResponse.json({
            itemsRegistrationComplete: gs.itemsRegistrationComplete,
            itemsRegistrationCompletedAt: gs.itemsRegistrationCompletedAt,
        });
    } catch (e) {
        console.error("[items-registration-complete]", e);
        return NextResponse.json({ error: "Falha ao atualizar" }, { status: 500 });
    }
}
