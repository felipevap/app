import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params;
        const { id } = params;
        const body = await req.json();
        const { clientId, action } = body;

        if (!clientId || !action) {
            return NextResponse.json(
                { error: "Missing clientId or action" },
                { status: 400 }
            );
        }

        const product = await prisma.product.findUnique({
            where: { id },
        }) as any;

        if (!product) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        if (action === "reserve") {
            // Check if already reserved by someone else
            if (
                product.status === "reservado" &&
                product.reservedBy !== clientId
            ) {
                // Optional: Check connection timeout (e.g., if reserved > 10 mins ago, steal it?)
                // For now, strict reservation.
                if (product.reservedAt) {
                    const reservationTime = new Date(product.reservedAt).getTime();
                    const now = new Date().getTime();
                    // simple 15 min timeout check
                    if (now - reservationTime > 15 * 60 * 1000) {
                        // expired, allow steal
                    } else {
                        return NextResponse.json(
                            { error: "Product is already reserved", reservedBy: product.reservedBy },
                            { status: 409 }
                        );
                    }
                } else {
                    return NextResponse.json(
                        { error: "Product is already reserved", reservedBy: product.reservedBy },
                        { status: 409 }
                    );
                }
            }

            // If already sold
            if (product.status === "vendido") {
                return NextResponse.json(
                    { error: "Product is already sold" },
                    { status: 409 }
                );
            }

            // Reserve it
            const updatedProduct = await prisma.product.update({
                where: { id },
                data: {
                    status: "reservado",
                    reservedBy: clientId,
                    reservedAt: new Date(),
                },
            });

            return NextResponse.json(updatedProduct);
        } else if (action === "release") {
            // Prevent releasing if already sold
            if (product.status === "vendido") {
                return NextResponse.json({ message: "Product already sold, cannot release" });
            }

            // Only release if reserved by this client
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
            } else {
                // If not reserved by this client, just ignore or return success (idempotent)
                // Unless it's reserved by someone else, then we shouldn't touch it.
                return NextResponse.json({ message: "Not reserved by you or already released" });
            }
        } else {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }
    } catch (error) {
        console.error("Error reserving product:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
