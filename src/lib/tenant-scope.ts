import type { SessionPayload } from "@/lib/session";

export function garageSaleTenantWhere(session: SessionPayload): Record<string, unknown> {
    if (session.superAdmin) return {};
    if (!session.tenantId) return { tenantId: "__invalid__" };
    if (session.role === "owner" && session.ownerGarageSaleId) {
        return { tenantId: session.tenantId, id: session.ownerGarageSaleId };
    }
    return { tenantId: session.tenantId };
}

export function garageSaleFindWhere(session: SessionPayload, id: string): Record<string, unknown> {
    if (session.role === "owner" && session.ownerGarageSaleId && session.ownerGarageSaleId !== id) {
        return { id: "__invalid__", tenantId: session.tenantId ?? "__invalid__" };
    }
    return { id, ...garageSaleTenantWhere(session) };
}

export function garageSaleRelationFilter(session: SessionPayload): Record<string, unknown> {
    if (session.superAdmin) return {};
    if (!session.tenantId) return { tenantId: "__invalid__" };
    if (session.role === "owner" && session.ownerGarageSaleId) {
        return { tenantId: session.tenantId, id: session.ownerGarageSaleId };
    }
    return { tenantId: session.tenantId };
}
