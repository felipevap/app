import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);

        // Check for expired orders and release products
        const expirationTime = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
        const expiredOrders = await prisma.pendingOrder.findMany({
            where: {
                status: 'pending',
                isPaid: false,
                createdAt: { lt: expirationTime }
            },
            include: { items: true }
        });

        for (const order of expiredOrders) {
            await prisma.$transaction(async (tx) => {
                await tx.pendingOrder.update({
                    where: { id: order.id },
                    data: { status: 'expired' }
                });

                for (const item of order.items) {
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
            });
        }

        const garageSaleId = searchParams.get('garageSaleId');

        const customerEmail = searchParams.get('customerEmail');
        const customerPhone = searchParams.get('customerPhone');

        const where: any = { status: 'pending' };

        if (garageSaleId) {
            where.garageSaleId = garageSaleId;
        }

        if (customerEmail) {
            where.customerEmail = customerEmail;
        }

        if (customerPhone) {
            // Basic normalization to ensure matching (optional but good practice)
            where.customerPhone = customerPhone;
        }

        const pendingOrders = await prisma.pendingOrder.findMany({
            where,
            include: {
                items: true,
            },
            orderBy: {
                createdAt: 'asc',
            },
        });

        return NextResponse.json(pendingOrders);
    } catch (error) {
        console.error('Error fetching pending orders:', error);
        return NextResponse.json({ error: 'Failed to fetch pending orders' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { customerName, customerPhone, customerEmail, total, garageSaleId, items } = body;

        const result = await prisma.$transaction(async (tx) => {
            // 1. Verify availability first
            for (const item of items) {
                const product = await tx.product.findUnique({
                    where: { id: item.productId }
                });

                if (!product) {
                    throw new Error(`Produto não encontrado: ${item.desc}`);
                }

                if (product.status !== 'disponível') {
                    // Allow if reserved by the current client
                    if (product.status === 'reservado' && product.reservedBy === body.clientId) {
                        // All good, proceed
                    } else {
                        throw new Error(`Produto indisponível: ${product.nome}`);
                    }
                }
            }

            // 2. Create Pending Order
            const pendingOrder = await tx.pendingOrder.create({
                data: {
                    customerName,
                    customerPhone,
                    customerEmail,
                    total,
                    garageSaleId,
                    items: {
                        create: items.map((item: any) => ({
                            productId: item.productId,
                            description: item.desc,
                            price: item.price,
                            quantity: item.qty,
                        })),
                    },
                },
                include: {
                    items: true,
                },
            });

            // 3. Update products to reserved status with customer details
            for (const item of items) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: {
                        status: 'reservado',
                        reservedBy: pendingOrder.id,
                        reservedByName: customerName,
                        reservedByEmail: customerEmail,
                        reservedByPhone: customerPhone,
                        reservedAt: new Date()
                    }
                });
            }

            return pendingOrder;
        });

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Error creating pending order:', error);
        const message = error.message || 'Failed to create pending order';

        if (message.includes('indisponível')) {
            return NextResponse.json({ error: message }, { status: 409 }); // Conflict
        }

        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        const body = await req.json().catch(() => ({}));
        const status = body.status || searchParams.get('status') || 'paid';

        if (!id) {
            return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
        }

        const data: { status: string; isPaid?: boolean } = { status };
        if (status === 'paid') {
            data.isPaid = true;
        } else if (status === 'pending' || status === 'processing') {
            data.isPaid = false;
        }

        const updatedOrder = await prisma.pendingOrder.update({
            where: { id },
            data,
            include: {
                items: true,
            },
        });

        return NextResponse.json(updatedOrder);
    } catch (error) {
        console.error('Error updating pending order:', error);
        return NextResponse.json({ error: 'Failed to update pending order' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
        }

        // Release products before deleting
        const orderToDelete = await prisma.pendingOrder.findUnique({
            where: { id },
            include: { items: true }
        });

        if (orderToDelete) {
            await prisma.$transaction(async (tx) => {
                for (const item of orderToDelete.items) {
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
                await tx.pendingOrder.delete({
                    where: { id },
                });
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting pending order:', error);
        return NextResponse.json({ error: 'Failed to delete pending order' }, { status: 500 });
    }
}
