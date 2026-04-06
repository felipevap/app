import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/require-tenant";
import { requireStaffSession } from "@/lib/require-staff";
import { garageSaleFindWhere } from "@/lib/tenant-scope";

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

        const garageSale = await prisma.garageSale.update({
            where: { id: paramId },
            data: body,
        });

        return NextResponse.json(garageSale);
    } catch (error) {
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
