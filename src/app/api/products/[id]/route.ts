import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/require-tenant";
import { garageSaleRelationFilter } from "@/lib/tenant-scope";

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const session = await requireTenantSession(req);
    if (session instanceof NextResponse) return session;

    try {
        const params = await props.params;
        const id = params.id;
        const body = await req.json();
        delete body.tenantId;
        delete body.garageSale;

        const existingProduct = await prisma.product.findFirst({
            where: { id, garageSale: garageSaleRelationFilter(session) },
        });

        if (!existingProduct) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        const product = await prisma.product.update({
            where: { id },
            data: body,
        });

        return NextResponse.json(product);
    } catch (error) {
        console.error("Error updating product:", error);
        return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const session = await requireTenantSession(req);
    if (session instanceof NextResponse) return session;

    try {
        const params = await props.params;
        const id = params.id;
        const { searchParams } = new URL(req.url);
        const permanent = searchParams.get("permanent") === "true";

        const existingProduct = await prisma.product.findFirst({
            where: { id, garageSale: garageSaleRelationFilter(session) },
        });
        if (!existingProduct) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        if (permanent) {
            await prisma.product.delete({ where: { id } });
        } else {
            await prisma.product.update({
                where: { id },
                data: { deletedAt: new Date() },
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting product:", error);
        return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
    }
}
