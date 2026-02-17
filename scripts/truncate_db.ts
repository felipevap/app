import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting database truncation...');

    try {
        // 1. Delete Sales (cascades to SaleItems and Payments)
        console.log('Deleting Sales...');
        await prisma.sale.deleteMany({});

        // 2. Delete PendingOrders (cascades to PendingOrderItems)
        console.log('Deleting PendingOrders...');
        await prisma.pendingOrder.deleteMany({});

        // 3. Delete Products
        console.log('Deleting Products...');
        await prisma.product.deleteMany({});

        // 4. Delete GarageSales
        console.log('Deleting GarageSales...');
        await prisma.garageSale.deleteMany({});

        console.log('Database truncated successfully.');
    } catch (error) {
        console.error('Error truncating database:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
