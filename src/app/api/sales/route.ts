import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/require-tenant";
import { requireStaffSession } from "@/lib/require-staff";
import { garageSaleFindWhere, garageSaleRelationFilter } from "@/lib/tenant-scope";

export async function GET(req: NextRequest) {
    const session = await requireTenantSession(req);
    if (session instanceof NextResponse) return session;

    try {
        const { searchParams } = new URL(req.url);
        const garageSaleId = searchParams.get("garageSaleId");

        const where: Record<string, unknown> = {
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

        const sales = await prisma.sale.findMany({
            where,
            include: {
                items: true,
                payments: true,
            },
            orderBy: { createdAt: "desc" },
        });
        return NextResponse.json(sales);
    } catch (error) {
        console.error("Error fetching sales:", error);
        return NextResponse.json({ error: "Failed to fetch sales" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await requireStaffSession(req);
    if (session instanceof NextResponse) return session;

    try {
        const body = await req.json();
        const { items, payments, totalValue, buyerName, buyerPhone, buyerEmail, garageSaleId, clientSyncId } = body;

        if (typeof clientSyncId === "string" && clientSyncId.length > 0) {
            const existing = await prisma.sale.findUnique({
                where: { clientSyncId },
                include: { items: true, payments: true },
            });
            if (existing) {
                return NextResponse.json(existing);
            }
        }

        if (garageSaleId) {
            const gs = await prisma.garageSale.findFirst({
                where: garageSaleFindWhere(session, garageSaleId),
            });
            if (!gs) {
                return NextResponse.json({ error: "Evento inválido" }, { status: 403 });
            }
        }

        const result = await prisma.$transaction(async (tx) => {
            for (const item of items) {
                if (item.productId) {
                    const p = await tx.product.findFirst({
                        where: { id: item.productId, garageSale: garageSaleRelationFilter(session) },
                    });
                    if (p) {
                        await tx.product.update({
                            where: { id: item.productId },
                            data: { status: "vendido" },
                        });
                    }
                } else if (garageSaleId) {
                    const productPrice = item.originalPrice || item.price;
                    await tx.product.create({
                        data: {
                            nome: item.desc,
                            descricao: "Produto adicionado no PDV",
                            preco: parseFloat(productPrice),
                            status: "vendido",
                            garageSaleId: garageSaleId,
                        },
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
                    ...(typeof clientSyncId === "string" && clientSyncId.length > 0
                        ? { clientSyncId }
                        : {}),
                    items: {
                        create: items.map(
                            (item: {
                                desc: string;
                                price: number;
                                qty?: number;
                                quantity?: number;
                                originalPrice?: number;
                                discountPercent?: number;
                                productId?: string;
                            }) => ({
                                description: item.desc,
                                price: item.price,
                                quantity: item.qty || item.quantity,
                                originalPrice: item.originalPrice,
                                discountPercent: item.discountPercent,
                                productId: item.productId,
                            })
                        ),
                    },
                    payments: {
                        create: payments.map((p: { method: string; amount: number }) => ({
                            method: p.method,
                            amount: p.amount,
                        })),
                    },
                },
                include: {
                    items: true,
                    payments: true,
                },
            });

            return newSale;
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error creating sale:", error);
        return NextResponse.json({ error: "Failed to create sale" }, { status: 500 });
    }
}
