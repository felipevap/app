import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/require-tenant";
import { garageSaleTenantWhere } from "@/lib/tenant-scope";

export async function GET(req: NextRequest) {
    const session = await requireTenantSession(req);
    if (session instanceof NextResponse) return session;

    try {
        const { searchParams } = new URL(req.url);
        const includeDeleted = searchParams.get("includeDeleted") === "true";

        const where: Record<string, unknown> = { ...garageSaleTenantWhere(session) };
        if (!includeDeleted) {
            where.deletedAt = null;
        }

        const garageSales = await prisma.garageSale.findMany({
            where,
            orderBy: { createdAt: "desc" },
        });
        return NextResponse.json(garageSales);
    } catch (error) {
        console.error("Error fetching garage sales:", error);
        return NextResponse.json(
            {
                error: "Failed to fetch garage sales",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    const session = await requireTenantSession(req);
    if (session instanceof NextResponse) return session;

    try {
        const body = await req.json();
        const { nome, dataInicio, dataFim, endereco, responsavel, email, regras } = body;

        let tenantId = session.tenantId;
        if (session.superAdmin) {
            tenantId = body.tenantId;
            if (!tenantId || typeof tenantId !== "string") {
                return NextResponse.json({ error: "tenantId é obrigatório para super admin" }, { status: 400 });
            }
            const t = await prisma.tenant.findUnique({ where: { id: tenantId } });
            if (!t) {
                return NextResponse.json({ error: "Tenant inválido" }, { status: 400 });
            }
        }

        if (!tenantId) {
            return NextResponse.json({ error: "Sem organização vinculada" }, { status: 403 });
        }

        const garageSale = await prisma.garageSale.create({
            data: {
                nome,
                dataInicio: new Date(dataInicio),
                dataFim: dataFim ? new Date(dataFim) : null,
                endereco,
                responsavel,
                email,
                regras,
                cep: body.cep,
                cpf: body.cpf,
                pix: body.pix,
                tenantId,
            },
        });

        return NextResponse.json(garageSale);
    } catch (error) {
        console.error("Error creating garage sale:", error);
        return NextResponse.json(
            {
                error: "Failed to create garage sale",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
