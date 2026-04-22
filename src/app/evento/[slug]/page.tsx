import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

type EventPortalPageProps = {
    params: Promise<{ slug: string }>;
    searchParams?: Promise<{
        q?: string;
        categoria?: string;
        condicao?: string;
    }>;
};

function formatDate(date: Date): string {
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(date);
}

function mapEmbedUrl(address: string): string {
    return `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
}

function productImage(product: { imagens: unknown }): string | null {
    if (!Array.isArray(product.imagens)) return null;
    const first = product.imagens.find((entry) => typeof entry === "string" && entry.trim().length > 0);
    return typeof first === "string" ? first : null;
}

export default async function EventPortalPage({ params, searchParams }: EventPortalPageProps) {
    const { slug } = await params;
    const queryParams = (await searchParams) ?? {};
    const q = (queryParams.q || "").trim();
    const categoria = (queryParams.categoria || "").trim();
    const condicao = (queryParams.condicao || "").trim();

    const garageSale = await prisma.garageSale.findFirst({
        where: {
            slug,
            deletedAt: null,
        },
        select: {
            id: true,
            nome: true,
            slug: true,
            endereco: true,
            dataInicio: true,
            dataFim: true,
            horarioInicio: true,
            horarioFim: true,
            regras: true,
            tenant: {
                select: {
                    name: true,
                    adminLogoDataUrl: true,
                },
            },
        },
    });

    if (!garageSale) notFound();

    const products = await prisma.product.findMany({
        where: {
            garageSaleId: garageSale.id,
            deletedAt: null,
            status: { in: ["disponível", "reservado"] },
            ...(q
                ? {
                      OR: [
                          { nome: { contains: q } },
                          { descricao: { contains: q } },
                      ],
                  }
                : {}),
            ...(categoria ? { categoria } : {}),
            ...(condicao ? { condicao } : {}),
        },
        select: {
            id: true,
            nome: true,
            descricao: true,
            preco: true,
            categoria: true,
            condicao: true,
            imagens: true,
        },
        orderBy: [{ categoria: "asc" }, { createdAt: "desc" }],
    });

    const categories = await prisma.product.findMany({
        where: { garageSaleId: garageSale.id, deletedAt: null },
        select: { categoria: true },
        distinct: ["categoria"],
    });

    const conditions = await prisma.product.findMany({
        where: { garageSaleId: garageSale.id, deletedAt: null },
        select: { condicao: true },
        distinct: ["condicao"],
    });

    const categoryOptions = categories.map((entry) => entry.categoria).filter((value): value is string => !!value);
    const conditionOptions = conditions.map((entry) => entry.condicao).filter((value): value is string => !!value);
    const mapUrl = mapEmbedUrl(garageSale.endereco);

    return (
        <main className="min-h-screen bg-stone-50 text-stone-900">
            <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
                <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm md:p-8">
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            {garageSale.tenant.adminLogoDataUrl ? (
                                <img
                                    src={garageSale.tenant.adminLogoDataUrl}
                                    alt={garageSale.tenant.name}
                                    className="h-16 w-16 rounded-xl border border-stone-200 object-cover"
                                />
                            ) : null}
                            <div>
                                <p className="text-sm font-semibold text-stone-500">{garageSale.tenant.name}</p>
                                <h1 className="text-2xl font-bold md:text-3xl">{garageSale.nome}</h1>
                            </div>
                        </div>
                    </div>
                    <div className="grid gap-4 text-sm md:grid-cols-3">
                        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                            <p className="font-semibold">Endereço</p>
                            <p className="mt-1 text-stone-700">{garageSale.endereco}</p>
                        </div>
                        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                            <p className="font-semibold">Datas</p>
                            <p className="mt-1 text-stone-700">
                                {formatDate(garageSale.dataInicio)}
                                {garageSale.dataFim ? ` - ${formatDate(garageSale.dataFim)}` : ""}
                            </p>
                        </div>
                        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                            <p className="font-semibold">Horários</p>
                            <p className="mt-1 text-stone-700">
                                {garageSale.horarioInicio || "A definir"}
                                {garageSale.horarioFim ? ` - ${garageSale.horarioFim}` : ""}
                            </p>
                        </div>
                    </div>
                    {garageSale.regras ? <p className="mt-4 text-sm text-stone-600">{garageSale.regras}</p> : null}
                </div>

                <section className="mb-8 grid gap-6 lg:grid-cols-[1fr_380px]">
                    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                        <h2 className="mb-4 text-xl font-bold">Prévia de Itens</h2>
                        <form className="grid gap-3 md:grid-cols-3">
                            <input
                                type="text"
                                name="q"
                                defaultValue={q}
                                placeholder="Buscar item"
                                className="rounded-lg border border-stone-300 bg-white p-3 text-sm"
                            />
                            <select name="categoria" defaultValue={categoria} className="rounded-lg border border-stone-300 bg-white p-3 text-sm">
                                <option value="">Todas as categorias</option>
                                {categoryOptions.map((option) => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                            <select name="condicao" defaultValue={condicao} className="rounded-lg border border-stone-300 bg-white p-3 text-sm">
                                <option value="">Todas as condições</option>
                                {conditionOptions.map((option) => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                            <button
                                type="submit"
                                className="md:col-span-3 rounded-lg bg-stone-900 px-4 py-3 text-sm font-semibold text-white"
                            >
                                Aplicar filtros
                            </button>
                        </form>
                        <p className="mt-4 text-sm text-stone-500">{products.length} itens encontrados</p>
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                            {products.map((product) => {
                                const image = productImage(product);
                                return (
                                    <article key={product.id} className="overflow-hidden rounded-xl border border-stone-200 bg-white">
                                        <div className="aspect-[4/3] w-full bg-stone-100">
                                            {image ? (
                                                <img src={image} alt={product.nome} className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="flex h-full items-center justify-center text-sm text-stone-500">
                                                    Sem imagem
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-2 p-4">
                                            <h3 className="font-semibold">{product.nome}</h3>
                                            <p className="text-sm text-stone-600">{product.descricao || "Sem descrição"}</p>
                                            <div className="flex flex-wrap gap-2 text-xs">
                                                {product.categoria ? <span className="rounded-full bg-stone-100 px-2 py-1">{product.categoria}</span> : null}
                                                {product.condicao ? <span className="rounded-full bg-stone-100 px-2 py-1">{product.condicao}</span> : null}
                                            </div>
                                            <p className="text-sm font-bold text-stone-800">
                                                R$ {product.preco.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                    <aside className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                        <h2 className="mb-4 text-xl font-bold">Mapa do Evento</h2>
                        <div className="overflow-hidden rounded-xl border border-stone-200">
                            <iframe
                                title={`Mapa ${garageSale.nome}`}
                                src={mapUrl}
                                width="100%"
                                height="360"
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                            />
                        </div>
                    </aside>
                </section>
            </div>
        </main>
    );
}
