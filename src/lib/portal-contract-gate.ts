import { prisma } from "@/lib/prisma";
import { renderContractBody } from "@/lib/contract";
import type { SessionPayload } from "@/lib/session";
import { garageSaleFindWhere } from "@/lib/tenant-scope";

export type PortalContractGate = {
    mustSignTemplateId: string;
} | { mustSignTemplateId: null };

export async function getOwnerContractGate(garageSaleId: string): Promise<PortalContractGate> {
    const gs = await prisma.garageSale.findUnique({
        where: { id: garageSaleId },
        select: {
            itemsRegistrationComplete: true,
            contractTemplates: {
                select: {
                    templateId: true,
                    template: { select: { type: true } }
                }
            },
            contractAcceptances: { select: { templateId: true } },
        },
    });
    if (!gs) return { mustSignTemplateId: null };

    const hasTemplate = (type: string) => gs.contractTemplates.some((t) => t.template.type === type);
    const hasAccept = (type: string) => gs.contractAcceptances.some((a) => {
        const template = gs.contractTemplates.find(t => t.templateId === a.templateId);
        return template?.template.type === type;
    });

    if (hasTemplate("service") && !hasAccept("service")) {
        const template = gs.contractTemplates.find(t => t.template.type === "service");
        return { mustSignTemplateId: template!.templateId };
    }
    if (
        gs.itemsRegistrationComplete &&
        hasTemplate("inventory") &&
        !hasAccept("inventory")
    ) {
        const template = gs.contractTemplates.find(t => t.template.type === "inventory");
        return { mustSignTemplateId: template!.templateId };
    }
    return { mustSignTemplateId: null };
}

export async function loadTemplateData(
    garageSaleId: string,
    templateId: string
): Promise<{ text: string; filledParams: Record<string, string> } | null> {
    const t = await prisma.garageSaleContractTemplate.findFirst({
        where: { garageSaleId, templateId },
        include: { template: { select: { text: true } } }
    });
    if (!t) return null;
    return { text: t.template.text, filledParams: t.filledParams as Record<string, string> };
}

export type PortalContractSignPayload = {
    templateId: string;
    renderedText: string;
    title: string;
};

export async function getPortalContractSignPayload(
    session: SessionPayload
): Promise<PortalContractSignPayload | null> {
    if (session.role !== "owner" || !session.ownerGarageSaleId) return null;
    const gid = session.ownerGarageSaleId;
    const gate = await getOwnerContractGate(gid);
    if (!gate.mustSignTemplateId) return null;

    const templateData = await loadTemplateData(gid, gate.mustSignTemplateId);
    if (!templateData) return null;

    const renderedText = renderContractBody(templateData.text, templateData.filledParams);
    const title = "Contrato";

    return { templateId: gate.mustSignTemplateId, renderedText, title };
}
