import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
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

        const pendingOrder = await prisma.pendingOrder.create({
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

        return NextResponse.json(pendingOrder);
    } catch (error) {
        console.error('Error creating pending order:', error);
        return NextResponse.json({ error: 'Failed to create pending order' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
        }

        const updatedOrder = await prisma.pendingOrder.update({
            where: { id },
            data: {
                isPaid: true,
                status: 'paid'
            },
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

        await prisma.pendingOrder.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting pending order:', error);
        return NextResponse.json({ error: 'Failed to delete pending order' }, { status: 500 });
    }
}
