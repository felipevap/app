import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: paramId } = await params;
        const id = parseInt(paramId);
        const body = await req.json();
        const { items, payments, totalValue, buyerName, buyerPhone, buyerEmail, garageSaleId } = body;

        // Transaction to update sale:
        // 1. Delete existing items and payments
        // 2. Update sale details
        // 3. Create new items and payments

        // Note: In a real production app, we might want to be more granular or use soft deletes, 
        // but for this requirement "alterar tudo", replacing is cleaner.

        const updatedSale = await prisma.$transaction(async (tx) => {
            // Delete old relations
            await tx.saleItem.deleteMany({ where: { saleId: id } });
            await tx.payment.deleteMany({ where: { saleId: id } });

            // Create new items data
            const newItems = items.map((item: any) => ({
                description: item.desc,
                price: parseFloat(item.price),
                quantity: parseInt(item.qty),
            }));

            // Create new payments data
            const newPayments = payments.map((payment: any) => ({
                method: payment.method,
                amount: parseFloat(payment.amount),
            }));

            // Update sale and recreate relations
            return await tx.sale.update({
                where: { id },
                data: {
                    totalValue: parseFloat(totalValue),
                    buyerName,
                    buyerPhone,
                    buyerEmail,
                    garageSaleId,
                    items: {
                        create: newItems,
                    },
                    payments: {
                        create: newPayments,
                    },
                },
                include: {
                    items: true,
                    payments: true,
                },
            });
        });

        return NextResponse.json(updatedSale);
    } catch (error) {
        console.error('Error updating sale:', error);
        return NextResponse.json({ error: 'Failed to update sale' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: paramId } = await params;
        const id = parseInt(paramId);
        await prisma.sale.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting sale:', error);
        return NextResponse.json({ error: 'Failed to delete sale' }, { status: 500 });
    }
}
