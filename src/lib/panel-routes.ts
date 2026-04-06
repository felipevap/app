import type { SessionPayload } from "@/lib/session";

export function getPanelHref(session: SessionPayload | null): string {
    if (!session) return "/login";
    if (session.superAdmin) return "/super";
    if (session.role === "owner") return "/portal";
    return "/administracao";
}

export function isTenantAdministrator(session: SessionPayload | null): boolean {
    return !!session && !session.superAdmin && session.role !== "owner" && !!session.tenantId;
}
