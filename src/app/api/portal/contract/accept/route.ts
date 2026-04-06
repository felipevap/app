import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwnerSession } from "@/lib/require-owner";
import { garageSaleFindWhere } from "@/lib/tenant-scope";
import {
    buildContractParamMap,
    CONTRACT_PHASE_ONBOARDING,
    CONTRACT_PHASE_PRE_EVENT,
    isValidSignatureDataUrl,
    renderContractBody,
} from "@/lib/contract";
import { getOwnerContractGate, loadTemplateSegments } from "@/lib/portal-contract-gate";

export async function POST(req: NextRequest) {
    const session = await requireOwnerSession(req);
    if (session instanceof NextResponse) return session;

    const gid = session.ownerGarageSaleId!;

    try {
        const body = await req.json();
        const phaseRaw = body.phase;
        const phase =
            phaseRaw === CONTRACT_PHASE_PRE_EVENT ? CONTRACT_PHASE_PRE_EVENT : CONTRACT_PHASE_ONBOARDING;
        const signaturePng = typeof body.signaturePng === "string" ? body.signaturePng : "";

        if (!isValidSignatureDataUrl(signaturePng)) {
            return NextResponse.json({ error: "Assinatura inválida ou ausente" }, { status: 400 });
        }

        const gate = await getOwnerContractGate(gid);
        if (gate.mustSignPhase !== phase) {
            return NextResponse.json({ error: "Nenhuma aceitação pendente para esta fase" }, { status: 409 });
        }

        const gs = await prisma.garageSale.findFirst({
            where: garageSaleFindWhere(session, gid),
        });
        if (!gs) {
            return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
        }

        const owner = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { name: true },
        });

        const segments = await loadTemplateSegments(gid, phase);
        if (!segments) {
            return NextResponse.json({ error: "Modelo ausente" }, { status: 404 });
        }

        const params = buildContractParamMap(gs, owner?.name ?? null);
        const renderedBody = renderContractBody(segments, params);

        await prisma.garageSaleContractAcceptance.create({
            data: {
                garageSaleId: gid,
                signerUserId: session.userId,
                phase,
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
