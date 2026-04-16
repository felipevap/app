import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSessionFromCookies } from "@/lib/session";
import { getPortalContractSignPayload } from "@/lib/portal-contract-gate";
import ContractSignClient from "./ContractSignClient";

export default async function AceitePage() {
    const session = await getSessionFromCookies();
    if (!session || session.role !== "owner" || !session.ownerGarageSaleId) {
        redirect("/login");
    }
    const payload = await getPortalContractSignPayload(session);
    if (!payload) {
        redirect("/portal");
    }
    return (
        <Suspense
            fallback={
                <div className="flex min-h-[40vh] items-center justify-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
                </div>
            }
        >
            <ContractSignClient templateId={payload.templateId} renderedText={payload.renderedText} title={payload.title} />
        </Suspense>
    );
}
