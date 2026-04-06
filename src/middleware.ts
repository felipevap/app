import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE, parseSessionFromJwtPayload } from "@/lib/session";

export async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;
    const protectedPrefixes = [
        "/admin",
        "/pos",
        "/capture",
        "/dashboard",
        "/super",
        "/portal",
        "/administracao",
    ];
    const isProtected = protectedPrefixes.some((p) => path.startsWith(p));

    if (!isProtected) {
        return NextResponse.next();
    }

    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (!token) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    const secret = process.env.AUTH_SECRET;
    if (!secret || secret.length < 32) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    try {
        const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
        const userId = payload.sub;
        if (typeof userId !== "string") {
            return NextResponse.redirect(new URL("/login", request.url));
        }
        const session = parseSessionFromJwtPayload(userId, payload as Record<string, unknown>);
        if (!session) {
            return NextResponse.redirect(new URL("/login", request.url));
        }

        const isOwner = session.role === "owner" && !session.superAdmin;

        if (path.startsWith("/portal")) {
            if (!isOwner) {
                const dest = session.superAdmin ? "/super" : "/administracao";
                return NextResponse.redirect(new URL(dest, request.url));
            }
            return NextResponse.next();
        }

        if (path.startsWith("/administracao") && session.superAdmin) {
            return NextResponse.redirect(new URL("/super", request.url));
        }

        if (isOwner) {
            return NextResponse.redirect(new URL("/portal", request.url));
        }

        return NextResponse.next();
    } catch {
        return NextResponse.redirect(new URL("/login", request.url));
    }
}

export const config = {
    matcher: [
        "/admin/:path*",
        "/pos/:path*",
        "/capture/:path*",
        "/dashboard/:path*",
        "/super",
        "/super/:path*",
        "/portal",
        "/portal/:path*",
        "/administracao",
        "/administracao/:path*",
    ],
};
