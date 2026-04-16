import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwnerSession } from "@/lib/require-owner";
import { garageSaleFindWhere } from "@/lib/tenant-scope";
import { isValidSignatureDataUrl, renderContractBody } from "@/lib/contract";
import { getOwnerContractGate, loadTemplateData } from "@/lib/portal-contract-gate";

export async function POST(req: NextRequest) {
    const session = await requireOwnerSession(req);
    if (session instanceof NextResponse) return session;

    const gid = session.ownerGarageSaleId!;

    try {
        const body = await req.json();
        const templateId = typeof body.templateId === "string" ? body.templateId : "";
        const signaturePng = typeof body.signaturePng === "string" ? body.signaturePng : "";

        if (!isValidSignatureDataUrl(signaturePng)) {
            return NextResponse.json({ error: "Assinatura inválida ou ausente" }, { status: 400 });
        }

        const gate = await getOwnerContractGate(gid);
        if (gate.mustSignTemplateId !== templateId) {
            return NextResponse.json({ error: "Nenhuma aceitação pendente para este contrato" }, { status: 409 });
        }

        const templateData = await loadTemplateData(gid, templateId);
        if (!templateData) {
            return NextResponse.json({ error: "Modelo ausente" }, { status: 404 });
        }

        const renderedBody = renderContractBody(templateData.text, templateData.filledParams);

        await prisma.garageSaleContractAcceptance.create({
            data: {
                garageSaleId: gid,
                signerUserId: session.userId,
                templateId,
                renderedBody,
                signaturePng,
            },
        });

        return NextResponse.json({ ok: true });
    } catch (e: unknown) {
        const code = e && typeof e === "object" && "code" in e ? (e as { code: string }).code : "";
        if (code === "P2002") {
            return NextResponse.json({ error: "Contrato já aceito" }, { status: 409 });
        }
        console.error("[portal/contract/accept]", e);
        return NextResponse.json({ error: "Falha ao registrar" }, { status: 500 });
    }
}
