export const PREMIUM_FULL_PLAN = {
    code: "premium-full",
    name: "Premium Full",
    monthlyPriceCents: 12_999,
    trialDays: 14,
} as const;

export const TENANT_BILLING_STATUSES = ["trialing", "active", "past_due", "canceled"] as const;

export type TenantBillingStatus = (typeof TENANT_BILLING_STATUSES)[number];

export type TenantBillingSnapshot = {
    subscriptionStatus: string;
    trialEndsAt: Date | null;
};

export function formatCurrencyBRLFromCents(value: number): string {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(value / 100);
}

export function addDays(base: Date, days: number): Date {
    const date = new Date(base);
    date.setDate(date.getDate() + days);
    return date;
}

export function isTenantSubscriptionActive(snapshot: TenantBillingSnapshot, now = new Date()): boolean {
    if (snapshot.subscriptionStatus === "active") return true;
    if (snapshot.subscriptionStatus !== "trialing") return false;

    // Legacy tenants created before billing rollout may not have a trial date yet.
    // Keep them unblocked until finance reviews the record explicitly.
    if (!snapshot.trialEndsAt) return true;

    return snapshot.trialEndsAt.getTime() >= now.getTime();
}

export function getTenantBillingStatusMeta(
    status: string,
    trialEndsAt: Date | null,
    now = new Date()
): { label: string; tone: string; description: string } {
    if (status === "active") {
        return {
            label: "Ativo",
            tone: "emerald",
            description: "Assinatura ativa e liberada para uso.",
        };
    }

    if (status === "past_due") {
        return {
            label: "Pagamento pendente",
            tone: "amber",
            description: "Cobranca em atraso ou aguardando regularizacao.",
        };
    }

    if (status === "canceled") {
        return {
            label: "Cancelado",
            tone: "rose",
            description: "Assinatura cancelada e sem renovacao automatica.",
        };
    }

    if (!trialEndsAt) {
        return {
            label: "Trial legado",
            tone: "sky",
            description: "Tenant legado sem data de trial definida. Acesso mantido ate revisao financeira.",
        };
    }

    if (trialEndsAt.getTime() < now.getTime()) {
        return {
            label: "Trial expirado",
            tone: "orange",
            description: "Teste gratis encerrado e aguardando ativacao da cobranca.",
        };
    }

    return {
        label: "Trial ativo",
        tone: "sky",
        description: "Periodo de teste gratis vigente.",
    };
}

export function getTenantBlockedLoginMessage(snapshot: TenantBillingSnapshot): string | null {
    if (isTenantSubscriptionActive(snapshot)) return null;
    const meta = getTenantBillingStatusMeta(snapshot.subscriptionStatus, snapshot.trialEndsAt);
    return `A assinatura deste tenant esta em estado "${meta.label}". Fale com o administrador financeiro para regularizar o acesso.`;
}
