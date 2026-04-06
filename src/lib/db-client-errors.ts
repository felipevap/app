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
        const msg = e.message ?? "";
        if (/authentication failed|credentials are not valid|access denied for user/i.test(msg)) {
            return "O MySQL recusou o utilizador ou a palavra-passe em DATABASE_URL. No painel (ex.: Hostinger → Websites → Bases de dados MySQL), confira o utilizador e a palavra-passe do mesmo, copie a connection string correta para as variáveis de ambiente da app Node e reinicie. Se a palavra-passe tiver @, # ou outros caracteres especiais, codifique-os na URL (ex.: @ → %40).";
        }
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
