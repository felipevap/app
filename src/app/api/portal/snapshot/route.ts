import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeClosureSummary, type PortalSale } from "@/lib/portal-report";
import { requireOwnerSession } from "@/lib/require-owner";
import { garageSaleFindWhere } from "@/lib/tenant-scope";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
    const session = await requireOwnerSession(req);
    if (session instanceof NextResponse) return session;

    const gid = session.ownerGarageSaleId!;

    try {
        const garageSale = await prisma.garageSale.findFirst({
            where: garageSaleFindWhere(session, gid),
        });
        if (!garageSale) {
            return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
        }

        const products = await prisma.product.findMany({
            where: {
                deletedAt: null,
                garageSaleId: gid,
            },
            orderBy: { createdAt: "desc" },
        });

        const salesRaw = await prisma.sale.findMany({
            where: { garageSaleId: gid },
            include: { items: true, payments: true },
            orderBy: { createdAt: "desc" },
        });

        const sales: PortalSale[] = salesRaw.map((s) => ({
            id: s.id,
            totalValue: s.totalValue,
            date: s.date,
            createdAt: s.createdAt,
            buyerName: s.buyerName,
            items: s.items.map((i) => ({
                description: i.description,
                price: i.price,
                quantity: i.quantity,
                discountPercent: i.discountPercent,
                originalPrice: i.originalPrice,
            })),
            payments: s.payments.map((p) => ({ method: p.method, amount: p.amount })),
        }));

        const summary = computeClosureSummary(sales);

        const totalSold = sales.reduce((acc, x) => acc + x.totalValue, 0);
        const stillToSell = products
            .filter((p) => p.status !== "vendido")
            .reduce((acc, p) => acc + p.preco, 0);

        return NextResponse.json({
            garageSale,
            products,
            sales,
            summary,
            metrics: {
                totalSold,
                stillToSell,
                countDisponivel: products.filter((p) => p.status === "disponível").length,
                countReservado: products.filter((p) => p.status === "reservado").length,
                countVendido: products.filter((p) => p.status === "vendido").length,
            },
        });
    } catch (e) {
        console.error("[portal/snapshot]", e);
        return NextResponse.json({ error: "Falha ao carregar dados" }, { status: 500 });
    }
}
