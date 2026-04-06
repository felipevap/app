import type { SessionPayload } from "@/lib/session";

export function garageSaleTenantWhere(session: SessionPayload): Record<string, unknown> {
    if (session.superAdmin) return {};
    if (!session.tenantId) return { tenantId: "__invalid__" };
    return { tenantId: session.tenantId };
}

export function garageSaleFindWhere(session: SessionPayload, id: string): Record<string, unknown> {
    return { id, ...garageSaleTenantWhere(session) };
}

export function garageSaleRelationFilter(session: SessionPayload): Record<string, unknown> {
    if (session.superAdmin) return {};
    if (!session.tenantId) return { tenantId: "__invalid__" };
    return { tenantId: session.tenantId };
}
