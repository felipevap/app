"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookies } from "@/lib/session";
import { isTenantAdministrator } from "@/lib/panel-routes";

const MAX_DATA_URL_LEN = 900_000;
const ALLOWED_PREFIXES = ["data:image/jpeg;base64,", "data:image/png;base64,", "data:image/webp;base64,"];

export async function saveTenantAdminLogo(dataUrl: string): Promise<{ error?: string; ok?: boolean }> {
    const session = await getSessionFromCookies();
    if (!session || !isTenantAdministrator(session) || !session.tenantId) {
        return { error: "Sem permissão" };
    }
    const trimmed = dataUrl.trim();
    if (!trimmed || trimmed.length > MAX_DATA_URL_LEN) {
        return { error: "Imagem muito grande. Use até ~600 KB." };
    }
    if (!ALLOWED_PREFIXES.some((p) => trimmed.startsWith(p))) {
        return { error: "Use JPEG, PNG ou WebP." };
    }
    try {
        await prisma.tenant.update({
            where: { id: session.tenantId },
            data: { adminLogoDataUrl: trimmed },
        });
    } catch (e) {
        console.error("[saveTenantAdminLogo]", e);
        return { error: "Não foi possível salvar." };
    }
    revalidatePath("/administracao");
    revalidatePath("/admin/settings");
    return { ok: true };
}

export async function clearTenantAdminLogo(): Promise<{ error?: string; ok?: boolean }> {
    const session = await getSessionFromCookies();
    if (!session || !isTenantAdministrator(session) || !session.tenantId) {
        return { error: "Sem permissão" };
    }
    try {
        await prisma.tenant.update({
            where: { id: session.tenantId },
            data: { adminLogoDataUrl: null },
        });
    } catch (e) {
        console.error("[clearTenantAdminLogo]", e);
        return { error: "Não foi possível remover." };
    }
    revalidatePath("/administracao");
    revalidatePath("/admin/settings");
    return { ok: true };
}
