import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const garageSaleId = searchParams.get('garageSaleId');
        const includeDeleted = searchParams.get('includeDeleted') === 'true';

        const whereClause: any = {
            deletedAt: includeDeleted ? undefined : null
        };

        if (garageSaleId) {
            whereClause.garageSaleId = garageSaleId;
        }

        // Cleanup expired reservations (older than 30 mins)
        // We do this on GET so the list is always fresh without needing a cron job
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

        await prisma.product.updateMany({
            where: {
                status: 'reservado',
                reservedAt: {
                    lt: thirtyMinutesAgo
                }
            },
            data: {
                status: 'disponível',
                reservedBy: null,
                reservedByName: null,
                reservedByEmail: null,
                reservedByPhone: null,
                reservedAt: null
            }
        });

        const products = await prisma.product.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(products);
    } catch (error) {
        console.error('Error fetching products:', error);
        return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { nome, descricao, preco, imagens, categoria, condicao, tags, garageSaleId } = body;

        const product = await prisma.product.create({
            data: {
                nome,
                descricao,
                preco: parseFloat(preco),
                imagens: imagens || [],
                categoria,
                condicao,
                tags: tags || [],
                garageSaleId
            }
        });

        return NextResponse.json(product);
    } catch (error) {
        console.error('Error creating product:', error);
        return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
    }
}
