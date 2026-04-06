import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSessionFromCookies } from "@/lib/session";
import { getPortalContractSignPayload } from "@/lib/portal-contract-gate";
import ContractSignClient from "./ContractSignClient";

export default async function AceitePage({
    searchParams,
}: {
    searchParams: Promise<{ phase?: string }>;
}) {
    const session = await getSessionFromCookies();
    if (!session || session.role !== "owner" || !session.ownerGarageSaleId) {
        redirect("/login");
    }
    const payload = await getPortalContractSignPayload(session);
    if (!payload) {
        redirect("/portal");
    }
    const sp = await searchParams;
    if (sp.phase && sp.phase !== payload.phase) {
        redirect(`/portal/aceite?phase=${encodeURIComponent(payload.phase)}`);
    }
    return (
        <Suspense
            fallback={
                <div className="flex min-h-[40vh] items-center justify-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
                </div>
            }
        >
            <ContractSignClient phase={payload.phase} renderedText={payload.renderedText} title={payload.title} />
        </Suspense>
    );
}
