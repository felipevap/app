import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: paramId } = await params;
        const garageSale = await prisma.garageSale.findUnique({
            where: { id: paramId }
        });

        if (!garageSale) {
            return NextResponse.json({ error: 'Garage sale not found' }, { status: 404 });
        }

        return NextResponse.json(garageSale);
    } catch (error) {
        console.error('Error fetching garage sale:', error);
        return NextResponse.json({ error: 'Failed to fetch garage sale' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: paramId } = await params;
        const body = await req.json();

        // Handle restore or update
        // If restoring, body might contain { deletedAt: null } or explicit action

        const garageSale = await prisma.garageSale.update({
            where: { id: paramId },
            data: body
        });

        return NextResponse.json(garageSale);
    } catch (error) {
        console.error('Error updating garage sale:', error);
        return NextResponse.json({ error: 'Failed to update garage sale' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: paramId } = await params;

        // Soft delete
        const garageSale = await prisma.garageSale.update({
            where: { id: paramId },
            data: { deletedAt: new Date() }
        });

        return NextResponse.json(garageSale);
    } catch (error) {
        console.error('Error deleting garage sale:', error);
        return NextResponse.json({ error: 'Failed to delete garage sale' }, { status: 500 });
    }
}
