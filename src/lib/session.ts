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
};

function parsePayload(payload: Record<string, unknown>, userId: string): SessionPayload | null {
    if (payload.sa === true) {
        return { userId, tenantId: null, superAdmin: true };
    }
    const tid = payload.tid;
    if (typeof tid === "string") {
        return { userId, tenantId: tid, superAdmin: false };
    }
    return null;
}

export async function signSession(
    userId: string,
    tenantId: string | null,
    isSuperAdmin: boolean
): Promise<string> {
    const body = isSuperAdmin ? { sa: true } : { sa: false, tid: tenantId as string };
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
        return parsePayload(payload as Record<string, unknown>, userId);
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
        return parsePayload(payload as Record<string, unknown>, userId);
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
