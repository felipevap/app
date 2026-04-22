import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffSession } from "@/lib/require-staff";
import { validateContractInput } from "@/lib/contract-validation";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
    const session = await requireStaffSession(request);
    if (session instanceof NextResponse) return session;

    try {
        if (session.superAdmin && !session.tenantId) {
            return NextResponse.json([]);
        }
        const templates = await prisma.contractTemplate.findMany({
            where: { tenantId: session.tenantId! },
            orderBy: { createdAt: "desc" },
        });
        return NextResponse.json(templates);
    } catch (error) {
        console.error("Error fetching contract templates:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const session = await requireStaffSession(request);
    if (session instanceof NextResponse) return session;

    try {
        if (session.superAdmin && !session.tenantId) {
            return NextResponse.json({ error: "Selecione um tenant antes de criar modelo de contrato." }, { status: 400 });
        }
        const raw = await request.json();
        const parsed = validateContractInput(raw);
        if (typeof parsed === "string") {
            return NextResponse.json({ error: parsed }, { status: 400 });
        }

        const template = await prisma.contractTemplate.create({
            data: {
                name: parsed.name,
                type: parsed.type,
                text: parsed.text,
                parameters: parsed.parameters as unknown as Prisma.InputJsonValue,
                createdBy: session.userId,
                tenantId: session.tenantId!,
            },
        });

        return NextResponse.json(template);
    } catch (error) {
        console.error("Error creating contract template:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
