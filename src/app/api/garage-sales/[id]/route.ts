import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/require-tenant";
import { requireStaffSession } from "@/lib/require-staff";
import { garageSaleFindWhere } from "@/lib/tenant-scope";
import { parseCommissionPercentInput } from "@/lib/commission";
import { isValidEventSlug, normalizeEventSlug } from "@/lib/slug";
import { Prisma } from "@prisma/client";
import {
    parseArScoreThresholdInput,
    parseReservationTTLInput,
} from "@/lib/garage-sale-config";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await requireTenantSession(req);
    if (session instanceof NextResponse) return session;

    try {
        const { id: paramId } = await params;
        const garageSale = await prisma.garageSale.findFirst({
            where: garageSaleFindWhere(session, paramId),
        });

        if (!garageSale) {
            return NextResponse.json({ error: "Garage sale not found" }, { status: 404 });
        }

        return NextResponse.json(garageSale);
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2022") {
            return NextResponse.json({ error: "Banco desatualizado. Execute as migrações pendentes no ambiente." }, { status: 500 });
        }
        console.error("Error fetching garage sale:", error);
        return NextResponse.json({ error: "Failed to fetch garage sale" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await requireStaffSession(req);
    if (session instanceof NextResponse) return session;

    try {
        const { id: paramId } = await params;
        const owned = await prisma.garageSale.findFirst({
            where: garageSaleFindWhere(session, paramId),
        });
        if (!owned) {
            return NextResponse.json({ error: "Garage sale not found" }, { status: 404 });
        }

        const body = await req.json();
        delete body.tenantId;
        if (Object.prototype.hasOwnProperty.call(body, "slug")) {
            const normalizedSlug = normalizeEventSlug(String(body.slug || ""));
            if (!isValidEventSlug(normalizedSlug)) {
                return NextResponse.json({ error: "Slug inválido. Use apenas letras, números e hífens." }, { status: 400 });
            }
            const slugInUse = await prisma.garageSale.findFirst({
                where: {
                    slug: normalizedSlug,
                    id: { not: paramId },
                    deletedAt: null,
                },
                select: { id: true },
            });
            if (slugInUse) {
                return NextResponse.json({ error: "Este slug já está em uso por outro evento." }, { status: 409 });
            }
            body.slug = normalizedSlug;
        }
        if (Object.prototype.hasOwnProperty.call(body, "commissionPercent")) {
            body.commissionPercent = parseCommissionPercentInput(
                body.commissionPercent,
                owned.commissionPercent
            );
        }
        if (Object.prototype.hasOwnProperty.call(body, "arScoreThreshold")) {
            body.arScoreThreshold = parseArScoreThresholdInput(
                body.arScoreThreshold,
                owned.arScoreThreshold
            );
        }
        if (Object.prototype.hasOwnProperty.call(body, "reservationTTLMinutes")) {
            body.reservationTTLMinutes = parseReservationTTLInput(
                body.reservationTTLMinutes,
                owned.reservationTTLMinutes
            );
        }

        const garageSale = await prisma.garageSale.update({
            where: { id: paramId },
            data: body,
        });

        return NextResponse.json(garageSale);
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2022") {
            return NextResponse.json({ error: "Banco desatualizado. Execute as migrações pendentes no ambiente." }, { status: 500 });
        }
        console.error("Error updating garage sale:", error);
        return NextResponse.json({ error: "Failed to update garage sale" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await requireStaffSession(req);
    if (session instanceof NextResponse) return session;

    try {
        const { id: paramId } = await params;
        const owned = await prisma.garageSale.findFirst({
            where: garageSaleFindWhere(session, paramId),
        });
        if (!owned) {
            return NextResponse.json({ error: "Garage sale not found" }, { status: 404 });
        }

        const garageSale = await prisma.garageSale.update({
            where: { id: paramId },
            data: { deletedAt: new Date() },
        });

        return NextResponse.json(garageSale);
    } catch (error) {
        console.error("Error deleting garage sale:", error);
        return NextResponse.json({ error: "Failed to delete garage sale" }, { status: 500 });
    }
}
