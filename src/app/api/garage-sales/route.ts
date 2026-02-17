import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const includeDeleted = searchParams.get('includeDeleted') === 'true';

        const where: any = {};
        if (!includeDeleted) {
            where.deletedAt = null;
        }

        const garageSales = await prisma.garageSale.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(garageSales);
    } catch (error) {
        console.error('Error fetching garage sales:', error);
        console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
        return NextResponse.json({
            error: 'Failed to fetch garage sales',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { nome, dataInicio, dataFim, endereco, responsavel, email, regras, banner } = body;

        const garageSale = await prisma.garageSale.create({
            data: {
                nome,
                dataInicio: new Date(dataInicio),
                dataFim: dataFim ? new Date(dataFim) : null,
                endereco,
                responsavel,
                email,
                regras,
                // banner removed
                cep: body.cep,
                cpf: body.cpf,
                pix: body.pix
            }
        });

        return NextResponse.json(garageSale);
    } catch (error) {
        console.error('Error creating garage sale:', error);
        console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
        return NextResponse.json({
            error: 'Failed to create garage sale',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
