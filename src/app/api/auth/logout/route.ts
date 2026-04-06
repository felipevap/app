import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST() {
    const jar = await cookies();
    jar.set(SESSION_COOKIE, "", {
        httpOnly: true,
        path: "/",
        maxAge: 0,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
    });
    return NextResponse.json({ ok: true });
}
