"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PortalGarageLogo from "@/components/PortalGarageLogo";
import {
    buildClosureReportHtml,
    computeClosureSummary,
    formatPortalCurrency,
    type ClosureSummary,
    type PortalSale,
} from "@/lib/portal-report";
import { clampCommissionPercent } from "@/lib/commission";

type GarageSaleRow = {
    id: string;
    nome: string;
    dataInicio: string;
    dataFim: string | null;
    endereco: string;
    responsavel: string | null;
    email: string | null;
    regras: string | null;
    cep: string | null;
    cpf: string | null;
    pix: string | null;
    commissionPercent?: number | null;
};

type ProductRow = {
    id: string;
    nome: string;
    descricao: string | null;
    preco: number;
    imagens: unknown;
    status: string;
};

type ContractAcceptanceRow = {
    id: string;
    phase: string;
    acceptedAt: string;
    renderedBody: string;
    signaturePng: string;
};

type Snapshot = {
    garageSale: GarageSaleRow;
    products: ProductRow[];
    sales: PortalSale[];
    summary: ClosureSummary;
    metrics: {
        totalSold: number;
        stillToSell: number;
        countDisponivel: number;
        countReservado: number;
        countVendido: number;
    };
    contractAcceptances: ContractAcceptanceRow[];
};

const tabs = [
    { id: "contratos", label: "Contratos" },
    { id: "info", label: "Garage Sale" },
    { id: "produtos", label: "Produtos" },
    { id: "relatorio", label: "Relatório ao vivo" },
    { id: "fechamento", label: "Relatório final" },
    { id: "conta", label: "Conta" },
] as const;

type TabId = (typeof tabs)[number]["id"];

function parseImages(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    return raw.filter((x): x is string => typeof x === "string");
}

function StatusPill({ status }: { status: string }) {
    const cls =
        status === "disponível"
            ? "bg-emerald-100 text-emerald-900"
            : status === "reservado"
              ? "bg-amber-100 text-amber-900"
              : status === "vendido"
                ? "bg-stone-200 text-stone-800"
                : "bg-stone-100 text-stone-700";
    return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${cls}`}>{status}</span>;
}

function phaseLabel(phase: string) {
    if (phase === "onboarding") return "Adesão (primeiro acesso)";
    if (phase === "pre_event") return "Pré-evento";
    return phase;
}

export default function PortalDashboardClient() {
    const [tab, setTab] = useState<TabId>("info");
    const [data, setData] = useState<Snapshot | null>(null);
    const [err, setErr] = useState<string | null>(null);
    const [pwd, setPwd] = useState({ current: "", next: "", next2: "" });
    const [pwdMsg, setPwdMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/portal/snapshot", { cache: "no-store" });
            if (!res.ok) {
                setErr("Não foi possível carregar os dados.");
                return;
            }
            const j = (await res.json()) as Snapshot;
            if (!j.contractAcceptances) j.contractAcceptances = [];
            setData(j);
            setErr(null);
        } catch {
            setErr("Não foi possível carregar os dados.");
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        const t = setInterval(() => void load(), 15000);
        return () => clearInterval(t);
    }, [load]);

    async function logout() {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/login";
    }

    async function submitPassword(e: React.FormEvent) {
        e.preventDefault();
        setPwdMsg(null);
        if (pwd.next !== pwd.next2) {
            setPwdMsg({ type: "err", text: "A nova senha e a confirmação não coincidem." });
            return;
        }
        const res = await fetch("/api/portal/password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ currentPassword: pwd.current, newPassword: pwd.next }),
        });
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
            setPwdMsg({ type: "err", text: j.error ?? "Falha ao alterar senha." });
            return;
        }
        setPwd({ current: "", next: "", next2: "" });
        setPwdMsg({ type: "ok", text: "Senha alterada com sucesso." });
    }

    function downloadClosure() {
        if (!data) return;
        const pct = clampCommissionPercent(Number(data.garageSale.commissionPercent ?? 20));
        const summary = computeClosureSummary(data.sales, pct);
        const html = buildClosureReportHtml(data.sales, summary, null, pct);
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `relatorio-fechamento-${new Date().toISOString().split("T")[0]}.html`;
        a.click();
        URL.revokeObjectURL(url);
    }

    if (err && !data) {
        return (
            <div className="mx-auto max-w-lg p-8 text-center">
                <p className="text-red-700">{err}</p>
                <button type="button" onClick={() => void load()} className="mt-4 text-purple-700 underline">
                    Tentar novamente
                </button>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
            </div>
        );
    }

    const { garageSale, products, sales, summary, metrics, contractAcceptances } = data;
    const closureCommissionPct = clampCommissionPercent(Number(garageSale.commissionPercent ?? 20));

    return (
        <div className="mx-auto max-w-6xl px-4 py-6 pb-16">
            <header className="mb-6 flex flex-col gap-4 border-b border-stone-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <PortalGarageLogo className="h-10 w-10 shrink-0" aria-hidden />
                    <div>
                        <h1 className="text-xl font-bold text-stone-900">Portal do proprietário</h1>
                        <p className="text-sm text-stone-600">{garageSale.nome}</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link
                        href="/"
                        className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 hover:bg-stone-50"
                    >
                        Início
                    </Link>
                    <button
                        type="button"
                        onClick={() => void logout()}
                        className="rounded-lg bg-stone-900 px-3 py-2 text-sm text-white hover:bg-stone-800"
                    >
                        Sair
                    </button>
                </div>
            </header>

            <nav className="mb-6 flex flex-wrap gap-1 rounded-xl border border-stone-200 bg-white p-1 shadow-sm">
                {tabs.map((t) => (
                    <button
                        key={t.id}
                        type="button"
                        onClick={() => setTab(t.id)}
                        className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                            tab === t.id ? "bg-purple-600 text-white shadow" : "text-stone-600 hover:bg-stone-100"
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </nav>

            {tab === "contratos" && (
                <section className="space-y-6">
                    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-stone-900">Contratos assinados</h2>
                        <p className="mt-2 text-sm text-stone-600">
                            Registro do que você aceitou com assinatura. A organização tem a mesma visualização.
                        </p>
                        {contractAcceptances.length === 0 ? (
                            <p className="mt-4 text-sm text-stone-500">Nenhum contrato formal registrado ainda.</p>
                        ) : (
                            <ul className="mt-4 space-y-6">
                                {contractAcceptances.map((c) => (
                                    <li key={c.id} className="rounded-xl border border-stone-100 bg-stone-50/80 p-4">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <h3 className="font-semibold text-stone-900">{phaseLabel(c.phase)}</h3>
                                            <span className="text-xs text-stone-500">
                                                {new Date(c.acceptedAt).toLocaleString("pt-BR")}
                                            </span>
                                        </div>
                                        <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-stone-800">
                                            {c.renderedBody}
                                        </div>
                                        <div className="mt-4">
                                            <p className="text-xs font-medium text-stone-500">Assinatura</p>
                                            <img
                                                src={c.signaturePng}
                                                alt=""
                                                className="mt-1 max-h-32 max-w-full rounded border border-stone-200 bg-white"
                                            />
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-stone-900">Regras e termos (texto livre)</h2>
                        <div className="mt-4 rounded-xl border border-stone-100 bg-stone-50 p-4 text-sm leading-relaxed text-stone-800 whitespace-pre-wrap">
                            {garageSale.regras?.trim()
                                ? garageSale.regras
                                : "Nenhuma regra adicional cadastrada para este evento."}
                        </div>
                    </div>
                </section>
            )}

            {tab === "info" && (
                <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-stone-900">Informações da Garage Sale</h2>
                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                        <div>
                            <dt className="text-stone-500">Nome</dt>
                            <dd className="font-medium text-stone-900">{garageSale.nome}</dd>
                        </div>
                        <div>
                            <dt className="text-stone-500">Período</dt>
                            <dd className="font-medium text-stone-900">
                                {new Date(garageSale.dataInicio).toLocaleDateString("pt-BR")}
                                {garageSale.dataFim
                                    ? ` — ${new Date(garageSale.dataFim).toLocaleDateString("pt-BR")}`
                                    : ""}
                            </dd>
                        </div>
                        <div className="sm:col-span-2">
                            <dt className="text-stone-500">Endereço</dt>
                            <dd className="font-medium text-stone-900">{garageSale.endereco}</dd>
                        </div>
                        {garageSale.cep ? (
                            <div>
                                <dt className="text-stone-500">CEP</dt>
                                <dd className="font-medium text-stone-900">{garageSale.cep}</dd>
                            </div>
                        ) : null}
                        {garageSale.responsavel ? (
                            <div>
                                <dt className="text-stone-500">Responsável</dt>
                                <dd className="font-medium text-stone-900">{garageSale.responsavel}</dd>
                            </div>
                        ) : null}
                        {garageSale.email ? (
                            <div>
                                <dt className="text-stone-500">E-mail</dt>
                                <dd className="font-medium text-stone-900">{garageSale.email}</dd>
                            </div>
                        ) : null}
                        {garageSale.cpf ? (
                            <div>
                                <dt className="text-stone-500">CPF</dt>
                                <dd className="font-medium text-stone-900">{garageSale.cpf}</dd>
                            </div>
                        ) : null}
                        {garageSale.pix ? (
                            <div className="sm:col-span-2">
                                <dt className="text-stone-500">PIX</dt>
                                <dd className="font-medium text-stone-900">{garageSale.pix}</dd>
                            </div>
                        ) : null}
                    </dl>
                </section>
            )}

            {tab === "produtos" && (
                <section>
                    <h2 className="mb-4 text-lg font-semibold text-stone-900">Produtos</h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {products.map((p) => {
                            const imgs = parseImages(p.imagens);
                            return (
                                <article
                                    key={p.id}
                                    className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
                                >
                                    <div className="aspect-[4/3] bg-stone-100">
                                        {imgs[0] ? (
                                            <img src={imgs[0]} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="flex h-full items-center justify-center text-stone-400">
                                                Sem foto
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-2 p-4">
                                        <div className="flex items-start justify-between gap-2">
                                            <h3 className="font-semibold text-stone-900">{p.nome}</h3>
                                            <StatusPill status={p.status} />
                                        </div>
                                        {p.descricao ? (
                                            <p className="line-clamp-2 text-sm text-stone-600">{p.descricao}</p>
                                        ) : null}
                                        <p className="text-lg font-bold text-purple-700">
                                            {formatPortalCurrency(p.preco)}
                                        </p>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                    {products.length === 0 ? (
                        <p className="text-center text-stone-500">Nenhum produto cadastrado ainda.</p>
                    ) : null}
                </section>
            )}

            {tab === "relatorio" && (
                <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-stone-900">Relatório em tempo real</h2>
                    <p className="mt-1 text-sm text-stone-600">Atualiza automaticamente a cada 15 segundos.</p>
                    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 p-4">
                            <p className="text-xs font-medium uppercase tracking-wide text-emerald-800">Vendido</p>
                            <p className="mt-1 text-2xl font-bold text-emerald-900">
                                {formatPortalCurrency(metrics.totalSold)}
                            </p>
                            <p className="text-xs text-emerald-800/80">Soma das vendas registradas</p>
                        </div>
                        <div className="rounded-xl border border-amber-100 bg-amber-50/80 p-4">
                            <p className="text-xs font-medium uppercase tracking-wide text-amber-900">A vender</p>
                            <p className="mt-1 text-2xl font-bold text-amber-950">
                                {formatPortalCurrency(metrics.stillToSell)}
                            </p>
                            <p className="text-xs text-amber-900/80">Preço dos itens ainda não vendidos</p>
                        </div>
                        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                            <p className="text-xs font-medium uppercase tracking-wide text-stone-600">Disponíveis</p>
                            <p className="mt-1 text-2xl font-bold text-stone-900">{metrics.countDisponivel}</p>
                        </div>
                        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                            <p className="text-xs font-medium uppercase tracking-wide text-stone-600">Reserv. / Vend.</p>
                            <p className="mt-1 text-sm font-semibold text-stone-900">
                                {metrics.countReservado} reservados · {metrics.countVendido} vendidos
                            </p>
                        </div>
                    </div>
                </section>
            )}

            {tab === "fechamento" && (
                <section className="space-y-6">
                    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-stone-900">Relatório final (PDV)</h2>
                        <p className="mt-1 text-sm text-stone-600">
                            Mesmo resumo de fechamento do PDV: métodos de pagamento, comissão de {closureCommissionPct}% neste
                            evento e lista de vendas.
                        </p>
                        <button
                            type="button"
                            onClick={downloadClosure}
                            className="mt-4 rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-700"
                        >
                            Baixar relatório HTML
                        </button>
                    </div>
                    <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
                        <table className="w-full min-w-[640px] text-left text-sm">
                            <thead>
                                <tr className="border-b border-stone-200 bg-stone-50">
                                    <th className="p-3 font-semibold text-stone-700">Método</th>
                                    <th className="p-3 font-semibold text-stone-700">Total</th>
                                    <th className="p-3 font-semibold text-stone-700">
                                        Comissão ({closureCommissionPct}%)
                                    </th>
                                    <th className="p-3 font-semibold text-stone-700">Líquido</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-stone-100">
                                    <td className="p-3">PIX</td>
                                    <td className="p-3">{formatPortalCurrency(summary.pix.total)}</td>
                                    <td className="p-3">{formatPortalCurrency(summary.pix.commission)}</td>
                                    <td className="p-3">{formatPortalCurrency(summary.pix.net)}</td>
                                </tr>
                                <tr className="border-b border-stone-100">
                                    <td className="p-3">Dinheiro</td>
                                    <td className="p-3">{formatPortalCurrency(summary.money.total)}</td>
                                    <td className="p-3">{formatPortalCurrency(summary.money.commission)}</td>
                                    <td className="p-3">{formatPortalCurrency(summary.money.net)}</td>
                                </tr>
                                <tr className="border-b border-stone-100">
                                    <td className="p-3">Cartão (cliente)</td>
                                    <td className="p-3">{formatPortalCurrency(summary.cardClient.total)}</td>
                                    <td className="p-3">{formatPortalCurrency(summary.cardClient.commission)}</td>
                                    <td className="p-3">{formatPortalCurrency(summary.cardClient.net)}</td>
                                </tr>
                                <tr className="border-b border-stone-100">
                                    <td className="p-3">Cartão (loja)</td>
                                    <td className="p-3">{formatPortalCurrency(summary.cardGarage.total)}</td>
                                    <td className="p-3">{formatPortalCurrency(summary.cardGarage.commission)}</td>
                                    <td className="p-3">{formatPortalCurrency(summary.cardGarage.net)}</td>
                                </tr>
                                <tr className="bg-stone-100 font-semibold">
                                    <td className="p-3">Total</td>
                                    <td className="p-3">{formatPortalCurrency(summary.grandTotal)}</td>
                                    <td className="p-3">{formatPortalCurrency(summary.totalCommission)}</td>
                                    <td className="p-3">
                                        {formatPortalCurrency(summary.grandTotal - summary.totalCommission)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                        <h3 className="font-semibold text-stone-900">Vendas ({sales.length})</h3>
                        <ul className="mt-3 space-y-3 text-sm">
                            {sales.map((s) => (
                                <li key={s.id} className="rounded-lg border border-stone-100 bg-stone-50/50 p-3">
                                    <span className="font-medium">#{s.id}</span>
                                    <span className="text-stone-500">
                                        {" "}
                                        · {formatPortalCurrency(s.totalValue)} · {s.buyerName || "Balcão"}
                                    </span>
                                </li>
                            ))}
                        </ul>
                        {sales.length === 0 ? <p className="text-stone-500">Nenhuma venda ainda.</p> : null}
                    </div>
                </section>
            )}

            {tab === "conta" && (
                <section className="mx-auto max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-stone-900">Alterar senha</h2>
                    <p className="mt-1 text-sm text-stone-600">A senha inicial é 12345; altere aqui quando quiser.</p>
                    <form onSubmit={submitPassword} className="mt-4 space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-stone-700">Senha atual</label>
                            <input
                                type="password"
                                value={pwd.current}
                                onChange={(e) => setPwd((p) => ({ ...p, current: e.target.value }))}
                                className="mt-1 w-full rounded-lg border border-stone-200 p-2.5 text-stone-900"
                                autoComplete="current-password"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-stone-700">Nova senha (mín. 8)</label>
                            <input
                                type="password"
                                value={pwd.next}
                                onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))}
                                className="mt-1 w-full rounded-lg border border-stone-200 p-2.5 text-stone-900"
                                autoComplete="new-password"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-stone-700">Confirmar nova senha</label>
                            <input
                                type="password"
                                value={pwd.next2}
                                onChange={(e) => setPwd((p) => ({ ...p, next2: e.target.value }))}
                                className="mt-1 w-full rounded-lg border border-stone-200 p-2.5 text-stone-900"
                                autoComplete="new-password"
                            />
                        </div>
                        {pwdMsg ? (
                            <p className={pwdMsg.type === "ok" ? "text-emerald-700" : "text-red-600"}>{pwdMsg.text}</p>
                        ) : null}
                        <button
                            type="submit"
                            className="w-full rounded-xl bg-purple-600 py-3 font-semibold text-white hover:bg-purple-700"
                        >
                            Salvar nova senha
                        </button>
                    </form>
                </section>
            )}
        </div>
    );
}
