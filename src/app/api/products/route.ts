import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/require-tenant";
import { requireStaffSession } from "@/lib/require-staff";
import { garageSaleFindWhere, garageSaleRelationFilter } from "@/lib/tenant-scope";
import { parseEmbeddingInput } from "@/lib/productEmbeddingValidation";

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
        const indexingFilter = searchParams.get("indexing") || ""; // "missing" | "indexed" | ""
        const imagesFilter = searchParams.get("images") || ""; // "missing" | "present" | ""

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
                indexingFilter === "missing" ? { embedding: { equals: Prisma.JsonNull } } : {},
                indexingFilter === "indexed" ? { NOT: { embedding: { equals: Prisma.JsonNull } } } : {},
                imagesFilter === "missing" ? { imagens: { equals: [] } } : {},
            ],
        };

        // Expire stale reservations using each event's configured TTL.
        const scopedSales = await prisma.garageSale.findMany({
            where: garageSaleRelationFilter(session),
            select: { id: true, reservationTTLMinutes: true },
        });
        const now = Date.now();
        for (const gs of scopedSales) {
            const cutoff = new Date(now - gs.reservationTTLMinutes * 60 * 1000);
            await prisma.product.updateMany({
                where: {
                    status: "reservado",
                    reservedAt: { lt: cutoff },
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
    const session = await requireStaffSession(req);
    if (session instanceof NextResponse) return session;

    try {
        const body = await req.json();
        const { nome, descricao, preco, imagens, categoria, condicao, tags, garageSaleId } = body;
        let embeddingPayload: number[] | null | undefined = undefined;
        if (Object.prototype.hasOwnProperty.call(body, 'embedding')) {
            const p = parseEmbeddingInput(body.embedding);
            if (p === undefined && body.embedding !== null) {
                return NextResponse.json({ error: 'Invalid embedding' }, { status: 400 });
            }
            embeddingPayload = p === undefined ? undefined : p;
        }

        const embeddingForDb =
            embeddingPayload === undefined
                ? undefined
                : embeddingPayload === null
                  ? Prisma.JsonNull
                  : embeddingPayload;

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
                ...(embeddingForDb !== undefined ? { embedding: embeddingForDb } : {}),
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
