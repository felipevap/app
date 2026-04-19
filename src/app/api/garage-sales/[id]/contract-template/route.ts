import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffSession } from "@/lib/require-staff";
import { garageSaleFindWhere } from "@/lib/tenant-scope";
import { validateFilledParams } from "@/lib/contract-validation";
import type { ContractParameter } from "@/lib/contract";
import type { Prisma } from "@prisma/client";

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
        if (!templateId) {
            return NextResponse.json({ error: "templateId obrigatório" }, { status: 400 });
        }

        const template = await prisma.contractTemplate.findUnique({ where: { id: templateId } });
        if (!template || template.tenantId !== session.tenantId) {
            return NextResponse.json({ error: "Modelo inválido" }, { status: 404 });
        }

        const knownParams = new Set<string>(
            Array.isArray(template.parameters)
                ? (template.parameters as unknown as ContractParameter[])
                      .map((p) => p?.name)
                      .filter((n): n is string => typeof n === "string")
                : []
        );
        const filledOrError = validateFilledParams(body.filledParams, knownParams);
        if (typeof filledOrError === "string") {
            return NextResponse.json({ error: filledOrError }, { status: 400 });
        }

        // Enforce required parameters.
        const declared = Array.isArray(template.parameters)
            ? (template.parameters as unknown as ContractParameter[])
            : [];
        const missing = declared
            .filter((p) => p.required)
            .map((p) => p.name)
            .filter((name) => !filledOrError[name] || filledOrError[name].trim() === "");
        if (missing.length) {
            return NextResponse.json(
                { error: `Parâmetros obrigatórios faltando: ${missing.join(", ")}` },
                { status: 400 }
            );
        }

        const row = await prisma.garageSaleContractTemplate.upsert({
            where: { garageSaleId_templateId: { garageSaleId: id, templateId } },
            create: {
                garageSaleId: id,
                templateId,
                filledParams: filledOrError as unknown as Prisma.InputJsonValue,
            },
            update: { filledParams: filledOrError as unknown as Prisma.InputJsonValue },
        });

        return NextResponse.json(row);
    } catch (e) {
        console.error("[contract-template PUT]", e);
        return NextResponse.json({ error: "Falha ao salvar" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
        const url = new URL(req.url);
        const templateId = url.searchParams.get("templateId") ?? "";
        if (!templateId) {
            return NextResponse.json({ error: "templateId obrigatório" }, { status: 400 });
        }
        // Disallow removal if the contract has already been signed.
        const acceptance = await prisma.garageSaleContractAcceptance.findFirst({
            where: { garageSaleId: id, templateId },
            select: { id: true },
        });
        if (acceptance) {
            return NextResponse.json(
                { error: "Contrato já assinado, não pode ser removido." },
                { status: 409 }
            );
        }
        await prisma.garageSaleContractTemplate
            .delete({ where: { garageSaleId_templateId: { garageSaleId: id, templateId } } })
            .catch(() => null);
        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error("[contract-template DELETE]", e);
        return NextResponse.json({ error: "Falha ao remover" }, { status: 500 });
    }
}
