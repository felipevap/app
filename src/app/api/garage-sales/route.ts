import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/require-tenant";
import { requireStaffSession } from "@/lib/require-staff";
import { garageSaleTenantWhere } from "@/lib/tenant-scope";
import { parseCommissionPercentInput } from "@/lib/commission";
import { isValidEventSlug, normalizeEventSlug, slugifyBase } from "@/lib/slug";

const OWNER_EMAIL_IN_USE = "OWNER_EMAIL_IN_USE";

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
    const session = await requireStaffSession(req);
    if (session instanceof NextResponse) return session;

    try {
        const body = await req.json();
        const { nome, dataInicio, dataFim, endereco, responsavel, email, regras } = body;
        const normalizedSlug = normalizeEventSlug(typeof body.slug === "string" && body.slug.trim() ? body.slug : slugifyBase(nome ?? ""));
        if (!isValidEventSlug(normalizedSlug)) {
            return NextResponse.json({ error: "Slug inválido. Use apenas letras, números e hífens." }, { status: 400 });
        }

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

        const garageSale = await prisma.$transaction(async (tx) => {
            const tenantRow = await tx.tenant.findUnique({
                where: { id: tenantId },
                select: { defaultCommissionPercent: true },
            });
            const tenantDefault = tenantRow?.defaultCommissionPercent ?? 20;
            const commissionPercent = parseCommissionPercentInput(body.commissionPercent, tenantDefault);

            const existingBySlug = await tx.garageSale.findFirst({
                where: {
                    slug: normalizedSlug,
                    deletedAt: null,
                },
                select: { id: true },
            });
            if (existingBySlug) {
                throw new Error("SLUG_ALREADY_EXISTS");
            }

            const gs = await tx.garageSale.create({
                data: {
                    slug: normalizedSlug,
                    nome,
                    dataInicio: new Date(dataInicio),
                    dataFim: dataFim ? new Date(dataFim) : null,
                    horarioInicio: body.horarioInicio || null,
                    horarioFim: body.horarioFim || null,
                    endereco,
                    responsavel,
                    email,
                    regras,
                    cep: body.cep,
                    cpf: body.cpf,
                    pix: body.pix,
                    commissionPercent,
                    tenantId,
                },
            });

            const rawEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
            if (rawEmail) {
                const existing = await tx.user.findUnique({ where: { email: rawEmail } });
                const hash = await bcrypt.hash("12345", 10);
                if (!existing) {
                    await tx.user.create({
                        data: {
                            email: rawEmail,
                            passwordHash: hash,
                            name: responsavel ?? null,
                            tenantId,
                            role: "owner",
                            ownerGarageSaleId: gs.id,
                        },
                    });
                } else if (!existing.isSuperAdmin && existing.role === "owner") {
                    if (existing.ownerGarageSaleId && existing.ownerGarageSaleId !== gs.id) {
                        throw new Error(OWNER_EMAIL_IN_USE);
                    }
                    await tx.user.update({
                        where: { id: existing.id },
                        data: {
                            role: "owner",
                            tenantId,
                            ownerGarageSaleId: gs.id,
                            passwordHash: hash,
                            name: responsavel ?? existing.name,
                        },
                    });
                }
            }

            // New contract template logic
            const { contractTemplateId, filledParams } = body;
            if (contractTemplateId && typeof contractTemplateId === "string") {
                const template = await tx.contractTemplate.findFirst({
                    where: { id: contractTemplateId, tenantId },
                });
                if (!template) {
                    throw new Error("Modelo de contrato inválido");
                }
                if (filledParams && typeof filledParams === "object") {
                    await tx.garageSaleContractTemplate.create({
                        data: {
                            garageSaleId: gs.id,
                            templateId: contractTemplateId,
                            filledParams,
                        },
                    });
                }
            }

            return gs;
        });

        return NextResponse.json(garageSale);
    } catch (error) {
        if (error instanceof Error && error.message === "SLUG_ALREADY_EXISTS") {
            return NextResponse.json({ error: "Este slug já está em uso por outro evento." }, { status: 409 });
        }
        if (error instanceof Error && error.message === OWNER_EMAIL_IN_USE) {
            return NextResponse.json(
                { error: "Este e-mail já é proprietário de outro evento. Use outro e-mail." },
                { status: 409 }
            );
        }
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
