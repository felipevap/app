import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const garageSales = await prisma.garageSale.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(garageSales);
    } catch (error) {
        console.error('Error fetching garage sales:', error);
        return NextResponse.json({ error: 'Failed to fetch garage sales' }, { status: 500 });
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
                banner
            }
        });

        return NextResponse.json(garageSale);
    } catch (error) {
        console.error('Error creating garage sale:', error);
        return NextResponse.json({ error: 'Failed to create garage sale' }, { status: 500 });
    }
}
