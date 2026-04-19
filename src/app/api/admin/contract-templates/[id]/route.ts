import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffSession } from "@/lib/require-staff";
import { validateContractInput } from "@/lib/contract-validation";
import type { Prisma } from "@prisma/client";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await requireStaffSession(request);
    if (session instanceof NextResponse) return session;

    try {
        const { id } = await params;
        const raw = await request.json();
        const parsed = validateContractInput(raw);
        if (typeof parsed === "string") {
            return NextResponse.json({ error: parsed }, { status: 400 });
        }

        const existing = await prisma.contractTemplate.findUnique({ where: { id } });
        if (!existing || existing.tenantId !== session.tenantId) {
            return NextResponse.json({ error: "Modelo não encontrado" }, { status: 404 });
        }

        const template = await prisma.contractTemplate.update({
            where: { id },
            data: {
                name: parsed.name,
                type: parsed.type,
                text: parsed.text,
                parameters: parsed.parameters as unknown as Prisma.InputJsonValue,
            },
        });

        return NextResponse.json(template);
    } catch (error) {
        console.error("Error updating contract template:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await requireStaffSession(request);
    if (session instanceof NextResponse) return session;

    try {
        const { id } = await params;
        const existing = await prisma.contractTemplate.findUnique({ where: { id } });
        if (!existing || existing.tenantId !== session.tenantId) {
            return NextResponse.json({ error: "Modelo não encontrado" }, { status: 404 });
        }

        await prisma.contractTemplate.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting contract template:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
