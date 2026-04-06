import {
    PrismaClientInitializationError,
    PrismaClientKnownRequestError,
} from "@prisma/client/runtime/library";

export function mysqlDatabaseUrlProblem(): string | null {
    const raw = process.env.DATABASE_URL?.trim();
    if (!raw) {
        return "Defina DATABASE_URL no .env (connection string MySQL).";
    }
    if (!/^mysql:/i.test(raw)) {
        return "DATABASE_URL tem de ser MySQL (começar por mysql://). Não use postgresql:// neste projeto.";
    }
    return null;
}

export function prismaErrorUserMessage(e: unknown): string | null {
    if (e instanceof PrismaClientInitializationError) {
        return "Não foi possível ligar ao MySQL. Confirme DATABASE_URL, rede/firewall e se o servidor MySQL está a correr. Rode npx prisma migrate deploy se ainda não aplicou as migrations.";
    }
    if (e instanceof PrismaClientKnownRequestError) {
        if (e.code === "P2021" || e.code === "P2010") {
            return "Tabelas em falta ou desatualizadas. Execute: npx prisma migrate deploy";
        }
        if (e.code === "P2002") {
            return "Este email ou o identificador da organização já está em uso. Tente outro email ou outro nome.";
        }
    }
    return null;
}
