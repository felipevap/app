import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.SUPER_ADMIN_PASSWORD;
    if (!email || !password) {
        console.error("Defina SUPER_ADMIN_EMAIL e SUPER_ADMIN_PASSWORD no ambiente.");
        process.exit(1);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.upsert({
        where: { email },
        create: {
            email,
            passwordHash,
            isSuperAdmin: true,
            tenantId: null,
        },
        update: {
            passwordHash,
            isSuperAdmin: true,
            tenantId: null,
        },
    });

    console.log("Super admin configurado:", email);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
