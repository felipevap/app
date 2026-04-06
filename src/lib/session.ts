import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";

export const SESSION_COOKIE = "gg_session";

function getSecretKey(): Uint8Array {
    const s = process.env.AUTH_SECRET;
    if (!s || s.length < 32) {
        throw new Error("AUTH_SECRET must be set and at least 32 characters");
    }
    return new TextEncoder().encode(s);
}

export type SessionPayload = {
    userId: string;
    tenantId: string | null;
    superAdmin: boolean;
    role: "owner" | "staff";
    ownerGarageSaleId: string | null;
};

export function parseSessionFromJwtPayload(
    userId: string,
    payload: Record<string, unknown>
): SessionPayload | null {
    if (payload.sa === true) {
        return { userId, tenantId: null, superAdmin: true, role: "staff", ownerGarageSaleId: null };
    }
    const tid = payload.tid;
    if (typeof tid !== "string") return null;
    const r = payload.r === "owner" ? "owner" : "staff";
    const g = typeof payload.g === "string" ? payload.g : null;
    if (r === "owner" && !g) return null;
    return {
        userId,
        tenantId: tid,
        superAdmin: false,
        role: r,
        ownerGarageSaleId: r === "owner" ? g : null,
    };
}

export async function signSession(
    userId: string,
    tenantId: string | null,
    isSuperAdmin: boolean,
    opts?: { role?: "owner" | "staff"; ownerGarageSaleId?: string | null }
): Promise<string> {
    if (isSuperAdmin) {
        return new SignJWT({ sa: true })
            .setProtectedHeader({ alg: "HS256" })
            .setSubject(userId)
            .setIssuedAt()
            .setExpirationTime("7d")
            .sign(getSecretKey());
    }
    if (!tenantId) {
        throw new Error("tenantId required for non-superadmin session");
    }
    const role = opts?.role ?? "staff";
    const gid = opts?.ownerGarageSaleId ?? null;
    const body: Record<string, unknown> =
        role === "owner" && gid
            ? { sa: false, tid: tenantId, r: "owner", g: gid }
            : { sa: false, tid: tenantId, r: "staff" };
    return new SignJWT(body)
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(userId)
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(getSecretKey());
}

export async function getSessionFromRequest(req: NextRequest): Promise<SessionPayload | null> {
    const s = process.env.AUTH_SECRET;
    if (!s || s.length < 32) return null;
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    try {
        const { payload } = await jwtVerify(token, new TextEncoder().encode(s));
        const userId = payload.sub;
        if (typeof userId !== "string") return null;
        return parseSessionFromJwtPayload(userId, payload as Record<string, unknown>);
    } catch {
        return null;
    }
}

export async function getSessionFromCookies(): Promise<SessionPayload | null> {
    const s = process.env.AUTH_SECRET;
    if (!s || s.length < 32) return null;
    const jar = await cookies();
    const token = jar.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    try {
        const { payload } = await jwtVerify(token, new TextEncoder().encode(s));
        const userId = payload.sub;
        if (typeof userId !== "string") return null;
        return parseSessionFromJwtPayload(userId, payload as Record<string, unknown>);
    } catch {
        return null;
    }
}

export function sessionCookieOptions(maxAgeSec: number) {
    return {
        httpOnly: true,
        path: "/" as const,
        sameSite: "lax" as const,
        secure: process.env.NODE_ENV === "production",
        maxAge: maxAgeSec,
    };
}
