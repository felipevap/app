export const PREMIUM_FULL_PLAN = {
    code: "premium-full",
    name: "Premium Full",
    monthlyPriceCents: 19_700,
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
    return !!snapshot.trialEndsAt && snapshot.trialEndsAt.getTime() >= now.getTime();
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
            description: "Cobrança em atraso ou aguardando regularização.",
        };
    }

    if (status === "canceled") {
        return {
            label: "Cancelado",
            tone: "rose",
            description: "Assinatura cancelada e sem renovação automática.",
        };
    }

    if (!trialEndsAt) {
        return {
            label: "Trial sem data",
            tone: "sky",
            description: "Período de teste em andamento, mas sem vencimento informado.",
        };
    }

    if (trialEndsAt.getTime() < now.getTime()) {
        return {
            label: "Trial expirado",
            tone: "orange",
            description: "Teste grátis encerrado e aguardando ativação da cobrança.",
        };
    }

    return {
        label: "Trial ativo",
        tone: "sky",
        description: "Período de teste grátis vigente.",
    };
}

export function getTenantBlockedLoginMessage(snapshot: TenantBillingSnapshot): string | null {
    if (isTenantSubscriptionActive(snapshot)) return null;
    const meta = getTenantBillingStatusMeta(snapshot.subscriptionStatus, snapshot.trialEndsAt);
    return `A assinatura deste tenant está em estado "${meta.label}". Fale com o administrador financeiro para regularizar o acesso.`;
}
