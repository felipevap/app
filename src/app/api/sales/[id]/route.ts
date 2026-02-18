import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const saleId = parseInt(id);

        if (isNaN(saleId)) {
            return NextResponse.json({ error: 'Invalid sale ID' }, { status: 400 });
        }

        // 1. Fetch sale with items to get product IDs
        const sale = await prisma.sale.findUnique({
            where: { id: saleId },
            include: { items: true }
        });

        if (!sale) {
            return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
        }

        // 2. Restore products to 'disponível' & Delete Sale
        await prisma.$transaction(async (tx) => {
            for (const item of sale.items) {
                if (item.productId) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: {
                            status: 'disponível',
                            reservedBy: null,
                            reservedByName: null,
                            reservedByEmail: null,
                            reservedByPhone: null,
                            reservedAt: null
                        }
                    });
                }
            }

            await tx.sale.delete({
                where: { id: saleId }
            });
        });

        return NextResponse.json({ message: 'Sale deleted successfully' });
    } catch (error) {
        console.error('Error deleting sale:', error);
        return NextResponse.json({ error: 'Failed to delete sale' }, { status: 500 });
    }
}

export async function PUT(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const saleId = parseInt(id);
        const body = await req.json();
        const { buyerName, buyerPhone, buyerEmail, items: newItems, totalValue } = body;

        if (isNaN(saleId)) {
            return NextResponse.json({ error: 'Invalid sale ID' }, { status: 400 });
        }

        const currentSale = await prisma.sale.findUnique({
            where: { id: saleId },
            include: { items: true }
        });

        if (!currentSale) {
            return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
        }

        const updatedSale = await prisma.$transaction(async (tx) => {
            // 1. Identify removed items
            // newItems contains the list of items that should REMAIN
            const newItemsIds = new Set(newItems.filter((i: any) => i.id).map((i: any) => i.id));

            const itemsToRemove = currentSale.items.filter(item => !newItemsIds.has(item.id));

            // Restore removed items
            for (const item of itemsToRemove) {
                if (item.productId) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: {
                            status: 'disponível',
                            reservedBy: null,
                            reservedByName: null,
                            reservedByEmail: null,
                            reservedByPhone: null,
                            reservedAt: null
                        }
                    });
                }
                // Delete SaleItem
                await tx.saleItem.delete({ where: { id: item.id } });
            }

            // 2. Update Sale details
            return await tx.sale.update({
                where: { id: saleId },
                data: {
                    buyerName,
                    buyerPhone,
                    buyerEmail,
                    totalValue: parseFloat(totalValue)
                },
                include: { items: true, payments: true }
            });
        });

        return NextResponse.json(updatedSale);

    } catch (error) {
        console.error('Error updating sale:', error);
        return NextResponse.json({ error: 'Failed to update sale' }, { status: 500 });
    }
}
