import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/require-tenant";
import { garageSaleRelationFilter } from "@/lib/tenant-scope";

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const session = await requireTenantSession(req);
    if (session instanceof NextResponse) return session;

    try {
        const { id } = await context.params;
        const saleId = parseInt(id);

        if (isNaN(saleId)) {
            return NextResponse.json({ error: "Invalid sale ID" }, { status: 400 });
        }

        const sale = await prisma.sale.findFirst({
            where: {
                id: saleId,
                garageSale: garageSaleRelationFilter(session),
            },
            include: { items: true },
        });

        if (!sale) {
            return NextResponse.json({ error: "Sale not found" }, { status: 404 });
        }

        await prisma.$transaction(async (tx) => {
            for (const item of sale.items) {
                if (item.productId) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: {
                            status: "disponível",
                            reservedBy: null,
                            reservedByName: null,
                            reservedByEmail: null,
                            reservedByPhone: null,
                            reservedAt: null,
                        },
                    });
                }
            }

            await tx.sale.delete({
                where: { id: saleId },
            });
        });

        return NextResponse.json({ message: "Sale deleted successfully" });
    } catch (error) {
        console.error("Error deleting sale:", error);
        return NextResponse.json({ error: "Failed to delete sale" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const session = await requireTenantSession(req);
    if (session instanceof NextResponse) return session;

    try {
        const { id } = await context.params;
        const saleId = parseInt(id);
        const body = await req.json();
        const { buyerName, buyerPhone, buyerEmail, items: newItems, totalValue } = body;

        if (isNaN(saleId)) {
            return NextResponse.json({ error: "Invalid sale ID" }, { status: 400 });
        }

        const currentSale = await prisma.sale.findFirst({
            where: {
                id: saleId,
                garageSale: garageSaleRelationFilter(session),
            },
            include: { items: true },
        });

        if (!currentSale) {
            return NextResponse.json({ error: "Sale not found" }, { status: 404 });
        }

        const updatedSale = await prisma.$transaction(async (tx) => {
            const newItemsIds = new Set(
                newItems.filter((i: { id?: number }) => i.id).map((i: { id: number }) => i.id)
            );

            const itemsToRemove = currentSale.items.filter((item) => !newItemsIds.has(item.id));

            for (const item of itemsToRemove) {
                if (item.productId) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: {
                            status: "disponível",
                            reservedBy: null,
                            reservedByName: null,
                            reservedByEmail: null,
                            reservedByPhone: null,
                            reservedAt: null,
                        },
                    });
                }
                await tx.saleItem.delete({ where: { id: item.id } });
            }

            return await tx.sale.update({
                where: { id: saleId },
                data: {
                    buyerName,
                    buyerPhone,
                    buyerEmail,
                    totalValue: parseFloat(totalValue),
                },
                include: { items: true, payments: true },
            });
        });

        return NextResponse.json(updatedSale);
    } catch (error) {
        console.error("Error updating sale:", error);
        return NextResponse.json({ error: "Failed to update sale" }, { status: 500 });
    }
}
