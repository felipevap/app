import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/require-tenant";
import { garageSaleRelationFilter } from "@/lib/tenant-scope";

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const session = await requireTenantSession(req);
    if (session instanceof NextResponse) return session;

    try {
        const params = await props.params;
        const orderId = params.id;
        const body = await req.json();
        const { itemId } = body;

        if (!itemId) {
            return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
        }

        const orderOk = await prisma.pendingOrder.findFirst({
            where: { id: orderId, garageSale: garageSaleRelationFilter(session) },
        });
        if (!orderOk) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        const result = await prisma.$transaction(async (tx) => {
            const orderItem = await tx.pendingOrderItem.findUnique({
                where: { id: itemId },
            });

            if (!orderItem || orderItem.pendingOrderId !== orderId) {
                const orderExists = await tx.pendingOrder.findFirst({
                    where: { id: orderId, garageSale: garageSaleRelationFilter(session) },
                });
                if (!orderExists) return { deleted: true };
                throw new Error("Item not found in this order");
            }

            await tx.product.updateMany({
                where: {
                    id: orderItem.productId,
                    garageSale: garageSaleRelationFilter(session),
                },
                data: {
                    status: "disponível",
                    reservedBy: null,
                    reservedByName: null,
                    reservedByEmail: null,
                    reservedByPhone: null,
                    reservedAt: null,
                },
            });

            await tx.pendingOrderItem.delete({
                where: { id: itemId },
            });

            const remainingItems = await tx.pendingOrderItem.findMany({
                where: { pendingOrderId: orderId },
            });

            if (remainingItems.length === 0) {
                await tx.pendingOrder.delete({
                    where: { id: orderId },
                });
                return { deleted: true };
            }

            const newTotal = remainingItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
            const updatedOrder = await tx.pendingOrder.update({
                where: { id: orderId },
                data: { total: newTotal },
                include: { items: true },
            });
            return { deleted: false, order: updatedOrder };
        });

        return NextResponse.json(result);
    } catch (error: unknown) {
        console.error("Error removing item:", error);
        const message = error instanceof Error ? error.message : "Failed to remove item";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
