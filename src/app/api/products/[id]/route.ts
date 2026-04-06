import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireTenantSession } from "@/lib/require-tenant";
import { garageSaleRelationFilter } from "@/lib/tenant-scope";
import { parseEmbeddingInput } from "@/lib/productEmbeddingValidation";

const UPDATABLE_KEYS = [
    'nome',
    'descricao',
    'preco',
    'imagens',
    'categoria',
    'condicao',
    'tags',
    'garageSaleId',
    'status',
    'deletedAt',
    'embedding',
    'reservedBy',
    'reservedByName',
    'reservedByEmail',
    'reservedByPhone',
    'reservedAt',
] as const;

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const session = await requireTenantSession(req);
    if (session instanceof NextResponse) return session;

    try {
        const params = await props.params;
        const id = params.id;
        const body = await req.json();
        delete body.tenantId;
        delete body.garageSale;

        const existingProduct = await prisma.product.findFirst({
            where: { id, garageSale: garageSaleRelationFilter(session) },
        });

        if (!existingProduct) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        const data: Record<string, unknown> = {};
        for (const key of UPDATABLE_KEYS) {
            if (!(key in body)) continue;
            if (key === 'embedding') {
                const p = parseEmbeddingInput(body.embedding);
                if (p === undefined) continue;
                data.embedding = p === null ? Prisma.JsonNull : p;
                continue;
            }
            if (key === 'preco' && body.preco !== undefined && body.preco !== null) {
                data.preco = typeof body.preco === 'number' ? body.preco : parseFloat(String(body.preco));
                continue;
            }
            if (key === 'deletedAt' && body.deletedAt === null) {
                data.deletedAt = null;
                continue;
            }
            data[key] = body[key];
        }

        const product = await prisma.product.update({
            where: { id },
            data
        });

        return NextResponse.json(product);
    } catch (error) {
        console.error("Error updating product:", error);
        return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const session = await requireTenantSession(req);
    if (session instanceof NextResponse) return session;

    try {
        const params = await props.params;
        const id = params.id;
        const { searchParams } = new URL(req.url);
        const permanent = searchParams.get("permanent") === "true";

        const existingProduct = await prisma.product.findFirst({
            where: { id, garageSale: garageSaleRelationFilter(session) },
        });
        if (!existingProduct) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        if (permanent) {
            await prisma.product.delete({ where: { id } });
        } else {
            await prisma.product.update({
                where: { id },
                data: { deletedAt: new Date() },
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting product:", error);
        return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
    }
}
