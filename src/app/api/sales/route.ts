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
            // Update product status for each item
            for (const item of items) {
                if (item.productId) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { status: 'vendido' }
                    }).catch(err => console.warn(`Failed to update product ${item.productId}`, err));
                } else if (garageSaleId) {
                    // Fallback: try to find matching available product
                    const products = await tx.product.findMany({
                        where: {
                            garageSaleId,
                            nome: item.desc,
                            preco: item.price,
                            status: 'disponível'
                        },
                        take: 1
                    });

                    if (products.length > 0) {
                        await tx.product.update({
                            where: { id: products[0].id },
                            data: { status: 'vendido' }
                        });
                    }
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
