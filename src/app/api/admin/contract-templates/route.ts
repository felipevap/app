import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffSession } from "@/lib/require-staff";
import type { ContractParameter } from "@/lib/contract";

export async function GET(request: NextRequest) {
    const session = await requireStaffSession(request);
    if (session instanceof NextResponse) return session;

    try {
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
        const { name, type, text, parameters }: { name: string; type: "service" | "inventory"; text: string; parameters: ContractParameter[] } = await request.json();

        if (!name || !type || !text) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const template = await prisma.contractTemplate.create({
            data: {
                name,
                type,
                text,
                parameters: parameters as any,
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
