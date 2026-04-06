import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE } from "@/lib/session";

export async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;
    const protectedPrefixes = ["/admin", "/pos", "/capture", "/dashboard", "/super"];
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
        await jwtVerify(token, new TextEncoder().encode(secret));
        return NextResponse.next();
    } catch {
        return NextResponse.redirect(new URL("/login", request.url));
    }
}

export const config = {
    matcher: ["/admin/:path*", "/pos/:path*", "/capture/:path*", "/dashboard/:path*", "/super", "/super/:path*"],
};
