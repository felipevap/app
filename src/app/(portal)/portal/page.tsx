import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/session";
import { getOwnerContractGate } from "@/lib/portal-contract-gate";
import PortalDashboardClient from "./PortalDashboardClient";

export default async function PortalPage() {
    const session = await getSessionFromCookies();
    if (!session || session.role !== "owner" || !session.ownerGarageSaleId) {
        redirect("/login");
    }
    const gate = await getOwnerContractGate(session.ownerGarageSaleId);
    if (gate.mustSignTemplateId) {
        redirect("/portal/aceite");
    }
    return <PortalDashboardClient />;
}
