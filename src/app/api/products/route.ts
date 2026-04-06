import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/require-tenant";
import { garageSaleFindWhere, garageSaleRelationFilter } from "@/lib/tenant-scope";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
    const session = await requireTenantSession(req);
    if (session instanceof NextResponse) return session;

    try {
        const { searchParams } = new URL(req.url);
        const garageSaleId = searchParams.get("garageSaleId");
        const includeDeleted = searchParams.get("includeDeleted") === "true";

        const pageParam = searchParams.get("page");
        const limitParam = searchParams.get("limit");
        const shouldPaginate = pageParam !== null;
        const page = parseInt(pageParam || "1");
        const limit = parseInt(limitParam || "10");
        const skip = (page - 1) * limit;

        const search = searchParams.get("search") || "";
        const category = searchParams.get("category") || "";
        const condition = searchParams.get("condition") || "";

        const garageSaleFilter: Record<string, unknown> = {
            ...garageSaleRelationFilter(session),
            ...(includeDeleted ? {} : { deletedAt: null }),
        };
        if (garageSaleId) {
            garageSaleFilter.id = garageSaleId;
        }

        const whereClause: Record<string, unknown> = {
            deletedAt: includeDeleted ? undefined : null,
            garageSale: garageSaleFilter,
            AND: [
                search
                    ? {
                          OR: [
                              { nome: { contains: search } },
                              { descricao: { contains: search } },
                          ],
                      }
                    : {},
                category ? { categoria: category } : {},
                condition ? { condicao: condition } : {},
            ],
        };

        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

        await prisma.product.updateMany({
            where: {
                status: "reservado",
                reservedAt: { lt: thirtyMinutesAgo },
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

        if (shouldPaginate) {
            const [products, total] = await prisma.$transaction([
                prisma.product.findMany({
                    where: whereClause,
                    orderBy: { createdAt: "desc" },
                    skip,
                    take: limit,
                }),
                prisma.product.count({ where: whereClause }),
            ]);

            return NextResponse.json({
                data: products,
                meta: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            });
        }

        const products = await prisma.product.findMany({
            where: whereClause,
            orderBy: { createdAt: "desc" },
        });
        return NextResponse.json(products);
    } catch (error) {
        console.error("Error fetching products:", error);
        return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await requireTenantSession(req);
    if (session instanceof NextResponse) return session;

    try {
        const body = await req.json();
        const { nome, descricao, preco, imagens, categoria, condicao, tags, garageSaleId } = body;

        const gs = await prisma.garageSale.findFirst({
            where: garageSaleFindWhere(session, garageSaleId),
        });
        if (!gs) {
            return NextResponse.json({ error: "Evento inválido" }, { status: 403 });
        }

        const product = await prisma.product.create({
            data: {
                nome,
                descricao,
                preco: parseFloat(preco),
                imagens: imagens || [],
                categoria,
                condicao,
                tags: tags || [],
                garageSaleId,
            },
        });

        return NextResponse.json(product);
    } catch (error) {
        console.error("Error creating product:", error);
        return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
    }
}
