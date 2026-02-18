import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params;
        const orderId = params.id;
        const body = await req.json();
        const { itemId } = body;

        if (!itemId) {
            return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
        }

        const result = await prisma.$transaction(async (tx) => {
            // 1. Get the item to find productId and price
            const orderItem = await tx.pendingOrderItem.findUnique({
                where: { id: itemId }
            });

            if (!orderItem || orderItem.pendingOrderId !== orderId) {
                // If item doesn't exist, maybe it was already deleted. 
                // We should check if the order exists to be sure.
                const orderExists = await tx.pendingOrder.findUnique({ where: { id: orderId } });
                if (!orderExists) return { deleted: true }; // Order already gone
                throw new Error("Item not found in this order");
            }

            // 2. Release the product
            await tx.product.update({
                where: { id: orderItem.productId },
                data: {
                    status: "disponível",
                    reservedBy: null,
                    reservedByName: null,
                    reservedByEmail: null,
                    reservedByPhone: null,
                    reservedAt: null
                }
            });

            // 3. Delete the item
            await tx.pendingOrderItem.delete({
                where: { id: itemId }
            });

            // 4. Check remaining items and update total
            const remainingItems = await tx.pendingOrderItem.findMany({
                where: { pendingOrderId: orderId }
            });

            if (remainingItems.length === 0) {
                // Delete the empty order
                await tx.pendingOrder.delete({
                    where: { id: orderId }
                });
                return { deleted: true };
            } else {
                // Update total
                const newTotal = remainingItems.reduce((acc, item) => acc + item.price, 0);
                const updatedOrder = await tx.pendingOrder.update({
                    where: { id: orderId },
                    data: { total: newTotal },
                    include: { items: true }
                });
                return { deleted: false, order: updatedOrder };
            }
        });

        return NextResponse.json(result);

    } catch (error: any) {
        console.error("Error removing item:", error);
        return NextResponse.json({ error: error.message || "Failed to remove item" }, { status: 500 });
    }
}
