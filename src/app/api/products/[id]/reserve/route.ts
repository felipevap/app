import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffSession } from "@/lib/require-staff";
import { garageSaleRelationFilter } from "@/lib/tenant-scope";

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const session = await requireStaffSession(req);
    if (session instanceof NextResponse) return session;

    try {
        const params = await props.params;
        const { id } = params;
        const body = await req.json();
        const { clientId, action } = body;

        if (!clientId || !action) {
            return NextResponse.json({ error: "Missing clientId or action" }, { status: 400 });
        }

        const product = await prisma.product.findFirst({
            where: { id, garageSale: garageSaleRelationFilter(session) },
        });

        if (!product) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        if (action === "reserve") {
            if (product.status === "reservado" && product.reservedBy !== clientId) {
                if (product.reservedAt) {
                    const reservationTime = new Date(product.reservedAt).getTime();
                    const now = new Date().getTime();
                    if (now - reservationTime > 15 * 60 * 1000) {
                    } else {
                        return NextResponse.json(
                            { error: "O produto já está reservado", reservedBy: product.reservedBy },
                            { status: 409 }
                        );
                    }
                } else {
                    return NextResponse.json(
                        { error: "O produto já está reservado", reservedBy: product.reservedBy },
                        { status: 409 }
                    );
                }
            }

            if (product.status === "vendido") {
                return NextResponse.json({ error: "Product is already sold" }, { status: 409 });
            }

            const updatedProduct = await prisma.product.update({
                where: { id },
                data: {
                    status: "reservado",
                    reservedBy: clientId,
                    reservedAt: new Date(),
                },
            });

            return NextResponse.json(updatedProduct);
        }

        if (action === "release") {
            if (product.status === "vendido") {
                return NextResponse.json({ message: "Product already sold, cannot release" });
            }

            if (product.reservedBy === clientId) {
                const updatedProduct = await prisma.product.update({
                    where: { id },
                    data: {
                        status: "disponível",
                        reservedBy: null,
                        reservedAt: null,
                    },
                });
                return NextResponse.json(updatedProduct);
            }

            return NextResponse.json({ message: "Not reserved by you or already released" });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
        console.error("Error reserving product:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
