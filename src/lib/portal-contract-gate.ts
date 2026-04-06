import { prisma } from "@/lib/prisma";
import {
    buildContractParamMap,
    CONTRACT_PHASE_ONBOARDING,
    CONTRACT_PHASE_PRE_EVENT,
    renderContractBody,
    type ContractSegment,
} from "@/lib/contract";
import type { SessionPayload } from "@/lib/session";
import { garageSaleFindWhere } from "@/lib/tenant-scope";

export type PortalContractGate = {
    mustSignPhase: typeof CONTRACT_PHASE_ONBOARDING | typeof CONTRACT_PHASE_PRE_EVENT;
} | { mustSignPhase: null };

export async function getOwnerContractGate(garageSaleId: string): Promise<PortalContractGate> {
    const gs = await prisma.garageSale.findUnique({
        where: { id: garageSaleId },
        select: {
            itemsRegistrationComplete: true,
            contractTemplates: { select: { phase: true } },
            contractAcceptances: { select: { phase: true } },
        },
    });
    if (!gs) return { mustSignPhase: null };

    const hasTemplate = (p: string) => gs.contractTemplates.some((t) => t.phase === p);
    const hasAccept = (p: string) => gs.contractAcceptances.some((a) => a.phase === p);

    if (hasTemplate(CONTRACT_PHASE_ONBOARDING) && !hasAccept(CONTRACT_PHASE_ONBOARDING)) {
        return { mustSignPhase: CONTRACT_PHASE_ONBOARDING };
    }
    if (
        gs.itemsRegistrationComplete &&
        hasTemplate(CONTRACT_PHASE_PRE_EVENT) &&
        !hasAccept(CONTRACT_PHASE_PRE_EVENT)
    ) {
        return { mustSignPhase: CONTRACT_PHASE_PRE_EVENT };
    }
    return { mustSignPhase: null };
}

export async function loadTemplateSegments(
    garageSaleId: string,
    phase: string
): Promise<ContractSegment[] | null> {
    const t = await prisma.garageSaleContractTemplate.findUnique({
        where: { garageSaleId_phase: { garageSaleId, phase } },
    });
    if (!t) return null;
    const raw = t.segments;
    if (!Array.isArray(raw)) return null;
    const segments: ContractSegment[] = [];
    for (const row of raw) {
        if (!row || typeof row !== "object") return null;
        const text = typeof (row as { text?: unknown }).text === "string" ? (row as { text: string }).text : "";
        const pk = (row as { paramKey?: unknown }).paramKey;
        const paramKey = pk === null || pk === "" ? null : typeof pk === "string" ? pk : null;
        segments.push({ text, paramKey });
    }
    return segments.length ? segments : null;
}

export type PortalContractSignPayload = {
    phase: typeof CONTRACT_PHASE_ONBOARDING | typeof CONTRACT_PHASE_PRE_EVENT;
    renderedText: string;
    title: string;
};

export async function getPortalContractSignPayload(
    session: SessionPayload
): Promise<PortalContractSignPayload | null> {
    if (session.role !== "owner" || !session.ownerGarageSaleId) return null;
    const gid = session.ownerGarageSaleId;
    const gate = await getOwnerContractGate(gid);
    if (!gate.mustSignPhase) return null;

    const gs = await prisma.garageSale.findFirst({
        where: garageSaleFindWhere(session, gid),
    });
    if (!gs) return null;

    const owner = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { name: true },
    });

    const segments = await loadTemplateSegments(gid, gate.mustSignPhase);
    if (!segments) return null;

    const params = buildContractParamMap(gs, owner?.name ?? null);
    const renderedText = renderContractBody(segments, params);
    const title =
        gate.mustSignPhase === CONTRACT_PHASE_ONBOARDING
            ? "Contrato de adesão"
            : "Contrato pré-evento";

    return { phase: gate.mustSignPhase, renderedText, title };
}
