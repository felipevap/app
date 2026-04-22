import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffSession } from "@/lib/require-staff";
import { isValidEventSlug, normalizeEventSlug } from "@/lib/slug";

export async function GET(req: NextRequest) {
    const session = await requireStaffSession(req);
    if (session instanceof NextResponse) return session;

    const { searchParams } = new URL(req.url);
    const rawSlug = searchParams.get("slug") || "";
    const excludeId = searchParams.get("excludeId") || "";
    const slug = normalizeEventSlug(rawSlug);

    if (!slug || !isValidEventSlug(slug)) {
        return NextResponse.json({ available: false, normalized: slug });
    }

    const existing = await prisma.garageSale.findFirst({
        where: {
            slug,
            deletedAt: null,
            ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        select: { id: true },
    });

    return NextResponse.json({
        available: !existing,
        normalized: slug,
    });
}
