import Link from "next/link";
import { getSessionFromCookies } from "@/lib/session";
import GestorGarageLogo from "@/components/GestorGarageLogo";

export default async function Home() {
    const session = await getSessionFromCookies();
    const isLoggedIn = !!session;

    return (
        <div className="flex min-h-[calc(100dvh-6rem)] flex-col items-center justify-center bg-gradient-to-b from-stone-50 to-stone-100 p-4 text-center">
            <GestorGarageLogo className="h-20 w-20 drop-shadow-md sm:h-24 sm:w-24" />
            <h1 className="mt-6 text-5xl font-bold tracking-tight text-stone-900 sm:text-6xl">Gestor Garage</h1>
            <p className="mt-3 max-w-xl text-lg text-amber-800 sm:text-xl">
                O portal do seu bazar: cadastro de itens, checagem de preço no evento e PDV — multi-organização, cada
                conta isolada.
            </p>
            <p className="mt-4 max-w-2xl text-stone-600">
                Ideal para quem organiza vendas de garagem, bazares solidários ou liquidações com equipe no chão e caixa
                integrado.
            </p>

            <div className="mt-10 flex flex-wrap justify-center gap-4">
                {!isLoggedIn && (
                    <>
                        <Link
                            href="/associacao"
                            className="rounded-full bg-amber-600 px-8 py-3 text-sm font-semibold text-black transition-colors hover:bg-amber-500"
                        >
                            Associação
                        </Link>
                        <Link
                            href="/login"
                            className="rounded-full border border-stone-300 px-8 py-3 text-sm font-semibold text-stone-800 hover:bg-stone-100"
                        >
                            Entrar
                        </Link>
                    </>
                )}
                {isLoggedIn && (
                    <Link
                        href={session?.superAdmin ? "/super" : "/dashboard"}
                        className="rounded-full bg-amber-600 px-8 py-3 text-sm font-semibold text-black transition-colors hover:bg-amber-500"
                    >
                        {session?.superAdmin ? "Super Admin" : "Ir ao painel"}
                    </Link>
                )}
            </div>

            <div className="mt-14 grid w-full max-w-4xl gap-4 text-left sm:grid-cols-3">
                <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                    <h2 className="font-semibold text-stone-900">Eventos</h2>
                    <p className="mt-2 text-sm text-stone-600">Vários bazares por organização, com regras e dados do evento.</p>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                    <h2 className="font-semibold text-stone-900">Operação</h2>
                    <p className="mt-2 text-sm text-stone-600">Checagem de preço e PDV alinhados ao mesmo catálogo.</p>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                    <h2 className="font-semibold text-stone-900">Isolamento</h2>
                    <p className="mt-2 text-sm text-stone-600">Cada organização vê só seus produtos e vendas.</p>
                </div>
            </div>

            {isLoggedIn && !session?.superAdmin && (
                <div className="mt-12 flex flex-wrap justify-center gap-4">
                    <Link
                        href="/admin"
                        className="rounded-xl bg-stone-800 px-6 py-3 text-sm text-white hover:bg-stone-700"
                    >
                        Organizador
                    </Link>
                    <Link
                        href="/capture"
                        className="rounded-xl bg-emerald-600 px-6 py-3 text-sm text-white hover:bg-emerald-700"
                    >
                        Checagem de preço
                    </Link>
                    <Link href="/pos" className="rounded-xl bg-rose-600 px-6 py-3 text-sm text-white hover:bg-rose-700">
                        PDV
                    </Link>
                </div>
            )}

            <footer className="mt-16 text-sm text-stone-500">
                &copy; {new Date().getFullYear()} Gestor Garage <span className="mx-2">|</span> v0.7.0
            </footer>
        </div>
    );
}
