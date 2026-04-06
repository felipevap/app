export type PortalSaleItem = {
    description?: string;
    discountPercent?: number | null;
    originalPrice?: number | null;
    price?: number;
    qty?: number;
    quantity?: number;
};

export type PortalSalePayment = {
    method: string;
    amount: number;
};

export type PortalSale = {
    id: number;
    totalValue: number;
    date?: string | Date | null;
    createdAt?: string | Date | null;
    buyerName?: string | null;
    items?: PortalSaleItem[];
    payments: PortalSalePayment[];
};

export type PaymentMethodSummary = {
    total: number;
    commission: number;
    net: number;
};

import { commissionDecimalRate, DEFAULT_COMMISSION_PERCENT } from "@/lib/commission";

export type ClosureSummary = {
    pix: PaymentMethodSummary;
    money: PaymentMethodSummary;
    cardClient: PaymentMethodSummary;
    cardGarage: PaymentMethodSummary;
    grandTotal: number;
    totalCommission: number;
    totalDiscount: number;
};

export function computeClosureSummary(
    sales: PortalSale[],
    commissionPercent: number = DEFAULT_COMMISSION_PERCENT
): ClosureSummary {
    const rate = commissionDecimalRate(commissionPercent);
    const summary: ClosureSummary = {
        pix: { total: 0, commission: 0, net: 0 },
        money: { total: 0, commission: 0, net: 0 },
        cardClient: { total: 0, commission: 0, net: 0 },
        cardGarage: { total: 0, commission: 0, net: 0 },
        grandTotal: 0,
        totalCommission: 0,
        totalDiscount: 0,
    };

    for (const sale of sales) {
        if (sale.items) {
            for (const item of sale.items) {
                const qty = item.qty ?? item.quantity ?? 1;
                const price = item.price ?? 0;
                const original = item.originalPrice ?? price;
                const disc = item.discountPercent ?? 0;
                if (disc > 0 && original > price) {
                    summary.totalDiscount += (original - price) * qty;
                }
            }
        }

        for (const p of sale.payments) {
            const commission = p.amount * rate;
            const net = p.amount - commission;
            summary.grandTotal += p.amount;
            summary.totalCommission += commission;

            if (p.method === "pix") {
                summary.pix.total += p.amount;
                summary.pix.commission += commission;
                summary.pix.net += net;
            } else if (p.method === "money") {
                summary.money.total += p.amount;
                summary.money.commission += commission;
                summary.money.net += net;
            } else if (p.method === "card_client") {
                summary.cardClient.total += p.amount;
                summary.cardClient.commission += commission;
                summary.cardClient.net += net;
            } else if (p.method === "card_garage") {
                summary.cardGarage.total += p.amount;
                summary.cardGarage.commission += commission;
                summary.cardGarage.net += net;
            }
        }
    }

    return summary;
}

export function formatPortalCurrency(value: number): string {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function formatPortalDate(d: Date | string): string {
    const x = typeof d === "string" ? new Date(d) : d;
    return x.toLocaleDateString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function buildClosureReportHtml(
    sales: PortalSale[],
    summary: ClosureSummary,
    signatureDataUrl: string | null,
    commissionPercent: number = DEFAULT_COMMISSION_PERCENT
): string {
    const commissionCol = `Comissão (${commissionPercent}%)`;
    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Relatório de Fechamento</title>`;
    html += `<style>body{font-family:sans-serif;padding:20px;max-width:800px;margin:0 auto;}`;
    html += `table{width:100%;border-collapse:collapse;margin:20px 0;}`;
    html += `th,td{border:1px solid #ddd;padding:8px;text-align:left;}`;
    html += `th{background:#4CAF50;color:white;}</style></head><body>`;
    html += `<h1 style="text-align:center;">RELATÓRIO DE FECHAMENTO</h1>`;
    html += `<p><strong>Data:</strong> ${formatPortalDate(new Date())}</p>`;
    html += `<h2>Resumo financeiro</h2>`;
    html += `<table><tr><th>Método</th><th>Total</th><th>${commissionCol}</th><th>Líquido</th></tr>`;
    html += `<tr><td>PIX</td><td>${formatPortalCurrency(summary.pix.total)}</td><td>${formatPortalCurrency(summary.pix.commission)}</td><td>${formatPortalCurrency(summary.pix.net)}</td></tr>`;
    html += `<tr><td>Dinheiro</td><td>${formatPortalCurrency(summary.money.total)}</td><td>${formatPortalCurrency(summary.money.commission)}</td><td>${formatPortalCurrency(summary.money.net)}</td></tr>`;
    html += `<tr><td>Cartão (Cli)</td><td>${formatPortalCurrency(summary.cardClient.total)}</td><td>${formatPortalCurrency(summary.cardClient.commission)}</td><td>${formatPortalCurrency(summary.cardClient.net)}</td></tr>`;
    html += `<tr><td>Cartão (Loja)</td><td>${formatPortalCurrency(summary.cardGarage.total)}</td><td>${formatPortalCurrency(summary.cardGarage.commission)}</td><td>${formatPortalCurrency(summary.cardGarage.net)}</td></tr>`;
    html += `<tr style="font-weight:bold;border-top:2px solid #000;"><td>TOTAL</td><td>${formatPortalCurrency(summary.grandTotal)}</td><td>${formatPortalCurrency(summary.totalCommission)}</td><td>${formatPortalCurrency(summary.grandTotal - summary.totalCommission)}</td></tr>`;
    if (summary.totalDiscount > 0) {
        html += `<tr><td colspan="4" style="color:red;text-align:right;">Descontos concedidos: ${formatPortalCurrency(summary.totalDiscount)}</td></tr>`;
    }
    html += `</table>`;
    html += `<h2>Lista de vendas</h2>`;
    for (const sale of sales) {
        const when = sale.date ?? sale.createdAt ?? new Date();
        html += `<div style="border:1px solid #ddd;padding:10px;margin:10px 0;">`;
        html += `<strong>Venda #${sale.id}</strong> — ${formatPortalDate(when)}<br>`;
        html += `Cliente: ${sale.buyerName || "Balcão"}<br>`;
        html += `Itens:<ul>`;
        for (const i of sale.items ?? []) {
            const qty = i.qty ?? i.quantity ?? 1;
            const desc = i.description ?? "";
            const disc = i.discountPercent && i.discountPercent > 0 ? ` (Desc. ${i.discountPercent}%)` : "";
            html += `<li>${qty}x ${desc}${disc}</li>`;
        }
        html += `</ul>`;
        html += `Total: ${formatPortalCurrency(sale.totalValue)}`;
        html += `</div>`;
    }
    if (signatureDataUrl) {
        html += `<div style="margin-top:30px;"><h3>Assinatura</h3><img src="${signatureDataUrl}" style="border:1px solid #000;max-width:400px;"></div>`;
    }
    html += `</body></html>`;
    return html;
}
