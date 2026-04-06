"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Package, ScanBarcode, Store, ShieldCheck, Sparkles, Ticket } from "lucide-react";
import PortalGarageLogo from "@/components/PortalGarageLogo";
import HomeAnimatedBackdrop from "@/components/home/HomeAnimatedBackdrop";
import PassaporteForm from "@/components/home/PassaporteForm";

type Props = {
    isLoggedIn: boolean;
    isSuperAdmin: boolean;
};

const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
    }),
};

const cards = [
    {
        icon: Store,
        title: "Eventos e bazares",
        text: "Vários eventos por organização, com dados e regras centralizados para cada venda de garagem ou bazar.",
    },
    {
        icon: Package,
        title: "Catálogo unificado",
        text: "Cadastro de produtos com fotos e preços — a mesma base alimenta checagem no chão e o caixa.",
    },
    {
        icon: ScanBarcode,
        title: "Checagem no evento",
        text: "Consulta rápida de preço e disponibilidade com a câmera, sem planilhas soltas.",
    },
    {
        icon: ShieldCheck,
        title: "Multi-organização",
        text: "Cada associação tem seu ambiente isolado: produtos, vendas e relatórios só do seu grupo.",
    },
];

export default function HomeLanding({ isLoggedIn, isSuperAdmin }: Props) {
    return (
        <div className="relative min-h-[calc(100dvh-4rem)] text-slate-100">
            <HomeAnimatedBackdrop />
            <div className="relative z-10">
                <section className="mx-auto flex max-w-6xl flex-col items-center px-4 pb-20 pt-12 text-center sm:pt-16 md:pt-20">
                    <motion.div custom={0} initial="hidden" animate="visible" variants={fadeUp}>
                        <PortalGarageLogo className="mx-auto h-20 w-20 drop-shadow-[0_0_40px_rgba(251,191,36,0.35)] sm:h-24 sm:w-24" />
                    </motion.div>
                    <motion.p
                        custom={1}
                        initial="hidden"
                        animate="visible"
                        variants={fadeUp}
                        className="mt-6 inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-amber-200/90"
                    >
                        <Sparkles className="h-3.5 w-3.5 text-amber-400" aria-hidden />
                        Gestão premium para garage sales
                    </motion.p>
                    <motion.h1
                        custom={2}
                        initial="hidden"
                        animate="visible"
                        variants={fadeUp}
                        className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-5xl md:text-6xl md:leading-[1.08]"
                    >
                        O sistema que organiza seu bazar do cadastro ao caixa
                    </motion.h1>
                    <motion.p
                        custom={3}
                        initial="hidden"
                        animate="visible"
                        variants={fadeUp}
                        className="mt-6 max-w-2xl text-lg text-slate-400 sm:text-xl"
                    >
                        Portal Garage é a plataforma para associações e equipes que realizam vendas de garagem, bazares
                        solidários e liquidações: um fluxo só, do estoque à conferência de preços no evento e ao PDV.
                    </motion.p>
                    <motion.div
                        custom={4}
                        initial="hidden"
                        animate="visible"
                        variants={fadeUp}
                        className="mt-10 flex flex-wrap items-center justify-center gap-3"
                    >
                        {!isLoggedIn && (
                            <>
                                <a
                                    href="#passaporte"
                                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 px-8 py-3.5 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-500/30 transition hover:brightness-105"
                                >
                                    <Ticket className="h-4 w-4" aria-hidden />
                                    Pedir passaporte
                                </a>
                                <Link
                                    href="/login"
                                    className="rounded-full border border-white/15 bg-white/5 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:border-white/25 hover:bg-white/10"
                                >
                                    Entrar
                                </Link>
                            </>
                        )}
                        {isLoggedIn && (
                            <Link
                                href={isSuperAdmin ? "/super" : "/dashboard"}
                                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 px-8 py-3.5 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-500/30 transition hover:brightness-105"
                            >
                                {isSuperAdmin ? "Super Admin" : "Ir ao painel"}
                            </Link>
                        )}
                    </motion.div>
                    {isLoggedIn && !isSuperAdmin && (
                        <motion.div
                            custom={5}
                            initial="hidden"
                            animate="visible"
                            variants={fadeUp}
                            className="mt-8 flex flex-wrap justify-center gap-3"
                        >
                            <Link
                                href="/admin"
                                className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/10"
                            >
                                Organizador
                            </Link>
                            <Link
                                href="/capture"
                                className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-2.5 text-sm font-medium text-emerald-200 hover:bg-emerald-500/15"
                            >
                                Checagem
                            </Link>
                            <Link
                                href="/pos"
                                className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-5 py-2.5 text-sm font-medium text-rose-200 hover:bg-rose-500/15"
                            >
                                PDV
                            </Link>
                        </motion.div>
                    )}
                </section>

                <section className="mx-auto max-w-6xl px-4 pb-24">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-80px" }}
                        transition={{ duration: 0.5 }}
                        className="text-center"
                    >
                        <h2 className="text-2xl font-semibold text-white sm:text-3xl">Tudo o que o programa entrega</h2>
                        <p className="mx-auto mt-3 max-w-2xl text-slate-400">
                            Uma suíte pensada para quem opera no físico: menos erro de preço, mais agilidade na fila e
                            visão clara para quem organiza.
                        </p>
                    </motion.div>
                    <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {cards.map((c, i) => (
                            <motion.div
                                key={c.title}
                                initial={{ opacity: 0, y: 16 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-40px" }}
                                transition={{ delay: i * 0.06, duration: 0.45 }}
                                className="group rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-md transition hover:border-amber-500/20 hover:bg-white/[0.06]"
                            >
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/20">
                                    <c.icon className="h-5 w-5" aria-hidden />
                                </div>
                                <h3 className="mt-4 font-semibold text-white">{c.title}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-slate-400">{c.text}</p>
                            </motion.div>
                        ))}
                    </div>
                </section>

                <section
                    id="passaporte"
                    className="scroll-mt-24 border-t border-white/[0.06] bg-slate-950/50 py-20 backdrop-blur-sm"
                >
                    <div className="mx-auto grid max-w-6xl gap-12 px-4 lg:grid-cols-2 lg:items-start lg:gap-16">
                        <motion.div
                            initial={{ opacity: 0, x: -12 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5 }}
                        >
                            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/5 px-3 py-1 text-xs font-medium text-amber-200/90">
                                <Ticket className="h-3.5 w-3.5" aria-hidden />
                                Passaporte Portal Garage
                            </div>
                            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                                Faça parte com o seu passaporte
                            </h2>
                            <p className="mt-4 text-slate-400 leading-relaxed">
                                O passaporte é a sua entrada: ao concluir o cadastro, criamos automaticamente a
                                organização (tenant) da sua associação ou equipe e vinculamos sua conta como
                                administradora. Você já entra no painel para cadastrar o primeiro evento e os produtos.
                            </p>
                            <ul className="mt-8 space-y-3 text-sm text-slate-300">
                                <li className="flex gap-3">
                                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-xs text-amber-400">
                                        1
                                    </span>
                                    Preencha os dados da organização e crie sua senha.
                                </li>
                                <li className="flex gap-3">
                                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-xs text-amber-400">
                                        2
                                    </span>
                                    Ambiente exclusivo gerado na hora — dados isolados das demais associações.
                                </li>
                                <li className="flex gap-3">
                                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-xs text-amber-400">
                                        3
                                    </span>
                                    Acesse o painel, o modo captura e o PDV com a mesma conta.
                                </li>
                            </ul>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, x: 12 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5 }}
                            className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/40 backdrop-blur-xl"
                        >
                            {!isLoggedIn ? (
                                <PassaporteForm />
                            ) : (
                                <div className="py-8 text-center">
                                    <p className="text-slate-300">Você já está com sessão ativa.</p>
                                    <Link
                                        href={isSuperAdmin ? "/super" : "/dashboard"}
                                        className="mt-6 inline-flex rounded-xl bg-amber-500 px-6 py-3 text-sm font-semibold text-slate-950"
                                    >
                                        Ir ao painel
                                    </Link>
                                </div>
                            )}
                        </motion.div>
                    </div>
                </section>

                <footer className="border-t border-white/[0.06] py-10 text-center text-sm text-slate-500">
                    <p>
                        &copy; {new Date().getFullYear()} Portal Garage <span className="mx-2 text-slate-600">|</span>{" "}
                        v0.7.0
                    </p>
                </footer>
            </div>
        </div>
    );
}
