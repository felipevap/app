
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting concurrency verification...');

    // 1. Create a test product
    const product = await prisma.product.create({
        data: {
            nome: 'Test Concurrent Item',
            descricao: 'Item for testing concurrency',
            preco: 100,
            status: 'disponível',
            garageSaleId: 'test-gs-id' // Assuming this ID exists or isn't strictly checked by FK in this isolated test context? 
            // Wait, garageSaleId is a foreign key. I need a valid GS ID.
            // Let's first get or create a GS.
        }
    }).catch(async (e) => {
        // If we can't create due to FK, let's try to find a GS first
        const gs = await prisma.garageSale.findFirst();
        if (!gs) {
            throw new Error("No GarageSale found to attach product to.");
        }
        return prisma.product.create({
            data: {
                nome: 'Test Concurrent Item',
                descricao: 'Item for testing concurrency',
                preco: 100,
                status: 'disponível',
                garageSaleId: gs.id
            }
        });
    });

    console.log(`Created product: ${product.id}`);

    // 2. Simulate User A creating a pending order
    console.log('User A creating pending order...');
    const orderA = await fetch('http://localhost:3000/api/pending-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            customerName: 'User A',
            customerPhone: '11999999999',
            customerEmail: 'usera@example.com',
            total: 100,
            garageSaleId: product.garageSaleId,
            items: [{
                productId: product.id,
                desc: product.nome,
                price: product.preco,
                qty: 1
            }]
        })
    });

    if (!orderA.ok) {
        console.error('User A failed:', await orderA.text());
    } else {
        console.log('User A success');
    }

    // 3. Verify product status is now 'reservado'
    const productAfterA = await prisma.product.findUnique({ where: { id: product.id } });
    if (productAfterA?.status !== 'reservado') {
        console.error('FAILED: Product status should be reservado, but is', productAfterA?.status);
    } else {
        console.log('PASSED: Product status is reservado');
    }

    // 4. Simulate User B trying to create a pending order for the same item
    console.log('User B trying to create pending order...');
    const orderB = await fetch('http://localhost:3000/api/pending-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            customerName: 'User B',
            customerPhone: '11888888888',
            customerEmail: 'userb@example.com',
            total: 100,
            garageSaleId: product.garageSaleId,
            items: [{
                productId: product.id,
                desc: product.nome,
                price: product.preco,
                qty: 1
            }]
        })
    });

    if (orderB.status === 409) {
        console.log('PASSED: User B was blocked with 409 Conflict');
    } else {
        console.error('FAILED: User B should have received 409, but got', orderB.status, await orderB.text());
    }

    // Cleanup
    await prisma.pendingOrder.deleteMany({ where: { customerEmail: { in: ['usera@example.com', 'userb@example.com'] } } });
    await prisma.product.delete({ where: { id: product.id } });
    console.log('Cleanup done');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
