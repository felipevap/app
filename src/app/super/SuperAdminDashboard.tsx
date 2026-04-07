"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Building2, CreditCard, KeyRound, Search, Shield, Trash2, UserCog, Users } from "lucide-react";
import { deleteTenantUser, resetTenantUserPassword, setTenantUserActive, startTenantImpersonation, updateTenantBilling } from "@/app/super/actions";
import { formatCurrencyBRLFromCents, getTenantBillingStatusMeta, TENANT_BILLING_STATUSES } from "@/lib/billing";

type TenantUser = { id: string; name: string | null; email: string; role: string; isActive: boolean; createdAt: string; ownerGarageSaleId: string | null };
type TenantItem = {
    id: string; name: string; slug: string; subscriptionStatus: string; subscriptionPlanName: string;
    subscriptionMonthlyPriceCents: number; billingEmail: string | null; subscriptionStartedAt: string | null;
    trialEndsAt: string | null; nextBillingAt: string | null; lastPaymentAt: string | null; createdAt: string;
    users: TenantUser[]; counts: { users: number; garageSales: number; activeUsers: number };
};
type SuperAdminItem = { id: string; name: string | null; email: string; isActive: boolean; createdAt: string };
type Props = { operatorName: string; impersonating: boolean; tenants: TenantItem[]; superAdmins: SuperAdminItem[] };

const toneClasses: Record<string, string> = {
    emerald: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100",
    amber: "border-amber-400/30 bg-amber-500/10 text-amber-100",
    rose: "border-rose-400/30 bg-rose-500/10 text-rose-100",
    orange: "border-orange-400/30 bg-orange-500/10 text-orange-100",
    sky: "border-sky-400/30 bg-sky-500/10 text-sky-100",
};

function formatDate(value: string | null) {
    if (!value) return "—";
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function StatCard({ label, value, helper, className }: { label: string; value: number; helper: string; className?: string }) {
    return (
        <div className={`rounded-3xl border border-white/10 p-5 ${className ?? "bg-slate-950/50"}`}>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
            <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
            <p className="mt-2 text-sm text-slate-400">{helper}</p>
        </div>
    );
}

export default function SuperAdminDashboard({ operatorName, impersonating, tenants, superAdmins }: Props) {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [pendingAction, startTransition] = useTransition();
    const [messages, setMessages] = useState<Record<string, string>>({});
    const [passwords, setPasswords] = useState<Record<string, string>>({});

    const filteredTenants = useMemo(() => {
        const term = query.trim().toLowerCase();
        if (!term) return tenants;
        return tenants.filter((tenant) =>
            [tenant.name, tenant.slug, tenant.billingEmail ?? "", ...tenant.users.map((user) => `${user.name ?? ""} ${user.email}`)]
                .join(" ")
                .toLowerCase()
                .includes(term)
        );
    }, [query, tenants]);

    const metrics = useMemo(
        () =>
            tenants.reduce(
                (acc, tenant) => {
                    acc.tenants += 1;
                    acc.users += tenant.counts.users;
                    if (tenant.subscriptionStatus === "active") acc.active += 1;
                    if (tenant.subscriptionStatus === "trialing") acc.trial += 1;
                    if (tenant.subscriptionStatus === "past_due") acc.pastDue += 1;
                    if (tenant.subscriptionStatus === "canceled") acc.canceled += 1;
                    return acc;
                },
                { tenants: 0, users: 0, active: 0, trial: 0, pastDue: 0, canceled: 0 }
            ),
        [tenants]
    );

    function setMessage(key: string, value: string) {
        setMessages((current) => ({ ...current, [key]: value }));
    }

    function handleImpersonation(tenantId: string) {
        startTransition(async () => {
            const result = await startTenantImpersonation(tenantId);
            if (result.error) return setMessage(`tenant-${tenantId}`, result.error);
            router.push("/administracao");
            router.refresh();
        });
    }

    function handleBillingSave(tenantId: string, formData: FormData) {
        startTransition(async () => {
            const result = await updateTenantBilling({
                tenantId,
                subscriptionStatus: String(formData.get("subscriptionStatus")) as (typeof TENANT_BILLING_STATUSES)[number],
                billingEmail: String(formData.get("billingEmail") ?? ""),
                trialEndsAt: String(formData.get("trialEndsAt") ?? ""),
                nextBillingAt: String(formData.get("nextBillingAt") ?? ""),
                lastPaymentAt: String(formData.get("lastPaymentAt") ?? ""),
            });
            setMessage(`tenant-${tenantId}`, result.error ?? "Cobrança atualizada com sucesso.");
            router.refresh();
        });
    }

    function handleUserActive(userId: string, active: boolean) {
        startTransition(async () => {
            const result = await setTenantUserActive(userId, active);
            setMessage(`user-${userId}`, result.error ?? (active ? "Usuário reativado." : "Usuário inativado."));
            router.refresh();
        });
    }

    function handlePasswordReset(userId: string) {
        startTransition(async () => {
            const result = await resetTenantUserPassword(userId);
            if (result.error) return setMessage(`user-${userId}`, result.error);
            if (result.password) setPasswords((current) => ({ ...current, [userId]: result.password as string }));
            setMessage(`user-${userId}`, "Senha resetada. Entregue a senha temporária ao usuário.");
            router.refresh();
        });
    }

    function handleDeleteUser(userId: string) {
        startTransition(async () => {
            const result = await deleteTenantUser(userId);
            setMessage(`user-${userId}`, result.error ?? "Usuário excluído.");
            router.refresh();
        });
    }

    return (
        <div className="min-h-[calc(100dvh-4rem)] bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.12),_transparent_30%),linear-gradient(180deg,_#071019_0%,_#0b1625_46%,_#111827_100%)] text-white">
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-8">
                    <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-100">
                                <Shield className="h-3.5 w-3.5" />
                                Command Center
                            </div>
                            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                                Controle tenants, cobrança e usuários em um só lugar.
                            </h1>
                            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                                Operador atual: <span className="font-semibold text-white">{operatorName}</span>. Acompanhe trials,
                                ativações, inadimplência, impersonação e usuários sem sair do mesmo painel.
                            </p>
                            {impersonating && (
                                <div className="mt-5 flex items-start gap-3 rounded-2xl border border-sky-400/25 bg-sky-500/10 px-4 py-4 text-sm text-sky-50">
                                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                    <span>Existe uma impersonação ativa nesta sessão. Use o topo do sistema para encerrá-la.</span>
                                </div>
                            )}
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <StatCard label="Tenants" value={metrics.tenants} helper={`${metrics.active} ativos, ${metrics.trial} em trial`} />
                            <StatCard label="Usuários" value={metrics.users} helper={`${superAdmins.length} super admins do sistema`} />
                            <StatCard label="Pendentes" value={metrics.pastDue} helper="Cobranças aguardando regularização" className="bg-amber-500/10" />
                            <StatCard label="Cancelados" value={metrics.canceled} helper="Assinaturas sem renovação" className="bg-rose-500/10" />
                        </div>
                    </div>
                </section>

                <section className="mt-6 grid gap-6 xl:grid-cols-[1.75fr_0.7fr]">
                    <div className="space-y-6">
                        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
                            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
                                <Search className="h-4 w-4 text-slate-400" />
                                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filtrar por tenant, slug, email ou usuário" className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500" />
                            </label>
                        </div>

                        {filteredTenants.map((tenant) => {
                            const statusMeta = getTenantBillingStatusMeta(tenant.subscriptionStatus, tenant.trialEndsAt ? new Date(tenant.trialEndsAt) : null);

                            return (
                                <article key={tenant.id} className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.03] shadow-[0_18px_60px_rgba(0,0,0,0.25)] backdrop-blur-xl">
                                    <div className="border-b border-white/10 px-5 py-5 sm:px-6">
                                        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <h2 className="text-2xl font-semibold text-white">{tenant.name}</h2>
                                                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneClasses[statusMeta.tone] ?? toneClasses.sky}`}>{statusMeta.label}</span>
                                                </div>
                                                <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-300">
                                                    <span className="inline-flex items-center gap-2"><Building2 className="h-4 w-4 text-amber-300" />{tenant.slug}</span>
                                                    <span className="inline-flex items-center gap-2"><Users className="h-4 w-4 text-sky-300" />{tenant.counts.users} usuários</span>
                                                    <span className="inline-flex items-center gap-2"><CreditCard className="h-4 w-4 text-emerald-300" />{formatCurrencyBRLFromCents(tenant.subscriptionMonthlyPriceCents)}/mês</span>
                                                </div>
                                                <p className="mt-3 text-sm text-slate-400">{statusMeta.description}</p>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-3">
                                                <button type="button" onClick={() => handleImpersonation(tenant.id)} className="rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-105">
                                                    Impersonar tenant
                                                </button>
                                                <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-xs text-slate-400">Criado em {formatDate(tenant.createdAt)}</div>
                                            </div>
                                        </div>

                                        {messages[`tenant-${tenant.id}`] && (
                                            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-200">
                                                {messages[`tenant-${tenant.id}`]}
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid gap-6 px-5 py-6 sm:px-6 xl:grid-cols-[0.95fr_1.3fr]">
                                        <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/45 p-5">
                                            <div className="flex items-center gap-3">
                                                <CreditCard className="h-5 w-5 text-amber-300" />
                                                <h3 className="text-lg font-semibold text-white">Cobrança</h3>
                                            </div>
                                            <div className="mt-5 grid gap-3 text-sm text-slate-300">
                                                <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3"><span>Plano</span><span className="font-semibold text-white">{tenant.subscriptionPlanName}</span></div>
                                                <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3"><span>Trial até</span><span className="font-semibold text-white">{formatDate(tenant.trialEndsAt)}</span></div>
                                                <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3"><span>Próxima cobrança</span><span className="font-semibold text-white">{formatDate(tenant.nextBillingAt)}</span></div>
                                                <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3"><span>Último pagamento</span><span className="font-semibold text-white">{formatDate(tenant.lastPaymentAt)}</span></div>
                                            </div>

                                            <form className="mt-5 space-y-3" action={(formData) => handleBillingSave(tenant.id, formData)}>
                                                <label className="block">
                                                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Status</span>
                                                    <select name="subscriptionStatus" defaultValue={tenant.subscriptionStatus} className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none">
                                                        {TENANT_BILLING_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                                                    </select>
                                                </label>
                                                <label className="block">
                                                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Email de cobrança</span>
                                                    <input name="billingEmail" type="email" defaultValue={tenant.billingEmail ?? ""} className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500" />
                                                </label>
                                                <div className="grid gap-3 sm:grid-cols-3">
                                                    <label className="block"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Fim do trial</span><input name="trialEndsAt" type="datetime-local" defaultValue={tenant.trialEndsAt?.slice(0, 16) ?? ""} className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none" /></label>
                                                    <label className="block"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Próxima cobrança</span><input name="nextBillingAt" type="datetime-local" defaultValue={tenant.nextBillingAt?.slice(0, 16) ?? ""} className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none" /></label>
                                                    <label className="block"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Último pagamento</span><input name="lastPaymentAt" type="datetime-local" defaultValue={tenant.lastPaymentAt?.slice(0, 16) ?? ""} className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none" /></label>
                                                </div>
                                                <button type="submit" className="w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">Salvar cobrança</button>
                                            </form>
                                        </div>

                                        <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/45 p-5">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <UserCog className="h-5 w-5 text-sky-300" />
                                                    <h3 className="text-lg font-semibold text-white">Usuários do tenant</h3>
                                                </div>
                                                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">{tenant.counts.activeUsers} ativos</span>
                                            </div>

                                            <div className="mt-5 space-y-3">
                                                {tenant.users.map((user) => (
                                                    <div key={user.id} className="rounded-3xl border border-white/10 bg-white/[0.02] p-4">
                                                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                                            <div>
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <p className="text-base font-semibold text-white">{user.name || "Sem nome"}</p>
                                                                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-300">{user.role}</span>
                                                                    <span className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${user.isActive ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100" : "border-rose-400/25 bg-rose-500/10 text-rose-100"}`}>{user.isActive ? "Ativo" : "Inativo"}</span>
                                                                </div>
                                                                <p className="mt-2 text-sm text-slate-300">{user.email}</p>
                                                                <p className="mt-2 text-xs text-slate-500">Criado em {formatDate(user.createdAt)}{user.ownerGarageSaleId ? " • usuário dono de evento" : ""}</p>
                                                            </div>

                                                            <div className="flex flex-wrap gap-2">
                                                                <button type="button" onClick={() => handleUserActive(user.id, !user.isActive)} className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/[0.08]">{user.isActive ? "Inativar" : "Reativar"}</button>
                                                                <button type="button" onClick={() => handlePasswordReset(user.id)} className="rounded-full border border-amber-300/20 bg-amber-400/10 px-4 py-2 text-xs font-semibold text-amber-50 transition hover:bg-amber-400/15"><KeyRound className="mr-1 inline h-3.5 w-3.5" />Resetar senha</button>
                                                                <button type="button" onClick={() => handleDeleteUser(user.id)} className="rounded-full border border-rose-300/20 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-50 transition hover:bg-rose-500/15"><Trash2 className="mr-1 inline h-3.5 w-3.5" />Excluir</button>
                                                            </div>
                                                        </div>

                                                        {messages[`user-${user.id}`] && <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-200">{messages[`user-${user.id}`]}</div>}
                                                        {passwords[user.id] && <div className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-50">Senha temporária: <span className="font-mono font-semibold">{passwords[user.id]}</span></div>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}

                        {filteredTenants.length === 0 && <div className="rounded-[1.75rem] border border-dashed border-white/15 bg-white/[0.02] px-6 py-12 text-center text-slate-400">Nenhum tenant encontrado para esse filtro.</div>}
                    </div>

                    <aside className="space-y-6">
                        <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
                            <div className="flex items-center gap-3">
                                <Shield className="h-5 w-5 text-amber-300" />
                                <h2 className="text-lg font-semibold text-white">Super admins</h2>
                            </div>
                            <div className="mt-4 space-y-3">
                                {superAdmins.map((admin) => (
                                    <div key={admin.id} className="rounded-3xl border border-white/10 bg-slate-950/45 px-4 py-4">
                                        <p className="font-semibold text-white">{admin.name || "Sem nome"}</p>
                                        <p className="mt-1 text-sm text-slate-300">{admin.email}</p>
                                        <p className="mt-2 text-xs text-slate-500">{admin.isActive ? "Ativo" : "Inativo"} • criado em {formatDate(admin.createdAt)}</p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="rounded-[1.75rem] border border-amber-400/20 bg-amber-400/10 p-5">
                            <h2 className="text-lg font-semibold text-white">Fluxo comercial implantado</h2>
                            <p className="mt-3 text-sm leading-7 text-amber-50/90">
                                Todo novo tenant nasce no Premium Full com 14 dias grátis, email de cobrança e valor mensal já registrados para o financeiro.
                            </p>
                        </section>
                    </aside>
                </section>

                {pendingAction && <div className="pointer-events-none fixed bottom-5 right-5 rounded-full border border-white/10 bg-slate-950/90 px-4 py-2 text-sm text-white shadow-2xl">Processando ação...</div>}
            </div>
        </div>
    );
}
