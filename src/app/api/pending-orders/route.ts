import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffSession } from "@/lib/require-staff";
import { garageSaleFindWhere, garageSaleRelationFilter } from "@/lib/tenant-scope";

export async function GET(req: NextRequest) {
    const session = await requireStaffSession(req);
    if (session instanceof NextResponse) return session;

    try {
        const { searchParams } = new URL(req.url);
        const now = Date.now();

        // Expire stale pending orders using each event's configured TTL.
        const scopedSales = await prisma.garageSale.findMany({
            where: garageSaleRelationFilter(session),
            select: { id: true, reservationTTLMinutes: true },
        });
        for (const gs of scopedSales) {
            const cutoff = new Date(now - gs.reservationTTLMinutes * 60 * 1000);
            const expiredOrders = await prisma.pendingOrder.findMany({
                where: {
                    status: "pending",
                    isPaid: false,
                    createdAt: { lt: cutoff },
                    garageSaleId: gs.id,
                },
                include: { items: true },
            });

            for (const order of expiredOrders) {
                await prisma.$transaction(async (tx) => {
                    await tx.pendingOrder.update({
                        where: { id: order.id },
                        data: { status: "expired" },
                    });

                    for (const item of order.items) {
                        await tx.product.updateMany({
                            where: {
                                id: item.productId,
                                garageSaleId: gs.id,
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
                    }
                });
            }
        }

        const garageSaleId = searchParams.get("garageSaleId");
        const customerEmail = searchParams.get("customerEmail");
        const customerPhone = searchParams.get("customerPhone");

        const where: Record<string, unknown> = {
            status: "pending",
            garageSale: garageSaleRelationFilter(session),
        };

        if (garageSaleId) {
            const gs = await prisma.garageSale.findFirst({
                where: garageSaleFindWhere(session, garageSaleId),
            });
            if (!gs) {
                return NextResponse.json([]);
            }
            where.garageSaleId = garageSaleId;
        }

        if (customerEmail) {
            where.customerEmail = customerEmail;
        }

        if (customerPhone) {
            where.customerPhone = customerPhone;
        }

        const pendingOrders = await prisma.pendingOrder.findMany({
            where,
            include: {
                items: true,
            },
            orderBy: {
                createdAt: "asc",
            },
        });

        return NextResponse.json(pendingOrders);
    } catch (error) {
        console.error("Error fetching pending orders:", error);
        return NextResponse.json({ error: "Failed to fetch pending orders" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await requireStaffSession(req);
    if (session instanceof NextResponse) return session;

    try {
        const body = await req.json();
        const { customerName, customerPhone, customerEmail, total, garageSaleId, items } = body;

        const gs = await prisma.garageSale.findFirst({
            where: garageSaleFindWhere(session, garageSaleId),
        });
        if (!gs) {
            return NextResponse.json({ error: "Evento inválido" }, { status: 403 });
        }

        const result = await prisma.$transaction(async (tx) => {
            for (const item of items) {
                const product = await tx.product.findFirst({
                    where: { id: item.productId, garageSale: garageSaleRelationFilter(session) },
                });

                if (!product) {
                    throw new Error(`Produto não encontrado: ${item.desc}`);
                }

                if (product.status !== "disponível") {
                    if (product.status === "reservado" && product.reservedBy === body.clientId) {
                    } else {
                        throw new Error(`Produto indisponível: ${product.nome}`);
                    }
                }
            }

            const pendingOrder = await tx.pendingOrder.create({
                data: {
                    customerName,
                    customerPhone,
                    customerEmail,
                    total,
                    garageSaleId,
                    items: {
                        create: items.map(
                            (item: { productId: string; desc: string; price: number; qty: number }) => ({
                                productId: item.productId,
                                description: item.desc,
                                price: item.price,
                                quantity: item.qty,
                            })
                        ),
                    },
                },
                include: {
                    items: true,
                },
            });

            for (const item of items) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: {
                        status: "reservado",
                        reservedBy: pendingOrder.id,
                        reservedByName: customerName,
                        reservedByEmail: customerEmail,
                        reservedByPhone: customerPhone,
                        reservedAt: new Date(),
                    },
                });
            }

            return pendingOrder;
        });

        return NextResponse.json(result);
    } catch (error: unknown) {
        console.error("Error creating pending order:", error);
        const message = error instanceof Error ? error.message : "Failed to create pending order";

        if (message.includes("indisponível")) {
            return NextResponse.json({ error: message }, { status: 409 });
        }

        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    const session = await requireStaffSession(req);
    if (session instanceof NextResponse) return session;

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        const body = await req.json().catch(() => ({}));
        const status = body.status || searchParams.get("status") || "paid";

        if (!id) {
            return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
        }

        const order = await prisma.pendingOrder.findFirst({
            where: { id, garageSale: garageSaleRelationFilter(session) },
        });
        if (!order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        const data: { status: string; isPaid?: boolean } = { status };
        if (status === "paid") {
            data.isPaid = true;
        } else if (status === "pending" || status === "processing") {
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
        console.error("Error updating pending order:", error);
        return NextResponse.json({ error: "Failed to update pending order" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const session = await requireStaffSession(req);
    if (session instanceof NextResponse) return session;

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
        }

        const orderToDelete = await prisma.pendingOrder.findFirst({
            where: { id, garageSale: garageSaleRelationFilter(session) },
            include: { items: true },
        });

        if (orderToDelete) {
            await prisma.$transaction(async (tx) => {
                for (const item of orderToDelete.items) {
                    await tx.product.updateMany({
                        where: {
                            id: item.productId,
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
                }
                await tx.pendingOrder.delete({
                    where: { id },
                });
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting pending order:", error);
        return NextResponse.json({ error: "Failed to delete pending order" }, { status: 500 });
    }
}
