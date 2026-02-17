import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const garageSaleId = searchParams.get('garageSaleId');

        const where: any = {};
        if (garageSaleId) where.garageSaleId = garageSaleId;

        const sales = await prisma.sale.findMany({
            where,
            include: {
                items: true,
                payments: true
            },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(sales);
    } catch (error) {
        console.error('Error fetching sales:', error);
        return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { items, payments, totalValue, buyerName, buyerPhone, buyerEmail, garageSaleId } = body;

        const result = await prisma.$transaction(async (tx) => {
            // Update or Create product for each item
            for (const item of items) {
                if (item.productId) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { status: 'vendido' }
                    }).catch(err => console.warn(`Failed to update product ${item.productId}`, err));
                } else if (garageSaleId) {
                    // Item has no ID, so it's an ad-hoc item.
                    // First try to find if it matches an existing global product (optional fallback)
                    // But user requested to "add the product", suggesting we should CREATE it if it doesn't exist.
                    // Let's create it as a "vendido" product so it's registered in the system.

                    // We use originalPrice if available (to store the "real" value), otherwise the sale price.
                    // The client side sends 'price' as the final price. 
                    // We need to check if we are receiving 'originalPrice' from the client.
                    // The POST body destructuring in line 30 doesn't explicitly pick it up but 'items' has it.

                    const productPrice = item.originalPrice || item.price;

                    await tx.product.create({
                        data: {
                            nome: item.desc,
                            descricao: "Produto adicionado no PDV",
                            preco: parseFloat(productPrice),
                            status: 'vendido',
                            garageSaleId: garageSaleId,
                            // Add other required fields if any. 
                        }
                    });
                }
            }

            const newSale = await tx.sale.create({
                data: {
                    totalValue,
                    buyerName,
                    buyerPhone,
                    buyerEmail,
                    garageSaleId,
                    items: {
                        create: items.map((item: any) => ({
                            description: item.desc,
                            price: item.price,
                            quantity: item.qty
                        }))
                    },
                    payments: {
                        create: payments.map((p: any) => ({
                            method: p.method,
                            amount: p.amount
                        }))
                    }
                },
                include: {
                    items: true,
                    payments: true
                }
            });

            return newSale;
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error creating sale:', error);
        return NextResponse.json({ error: 'Failed to create sale' }, { status: 500 });
    }
}
