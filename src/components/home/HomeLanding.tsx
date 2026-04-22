"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Check, Package, ScanBarcode, ShieldCheck, Sparkles, Store, UserPlus } from "lucide-react";
import PortalGarageLogo from "@/components/PortalGarageLogo";
import HomeAnimatedBackdrop from "@/components/home/HomeAnimatedBackdrop";
import CadastroOrganizacaoForm from "@/components/home/CadastroOrganizacaoForm";
import { formatCurrencyBRLFromCents, PREMIUM_FULL_PLAN } from "@/lib/billing";

type Props = {
    isLoggedIn: boolean;
};

const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
    }),
};

const features = [
    { icon: Store, title: "Operação por empresa", text: "Cada empresa opera com ambiente isolado, usuários próprios, eventos separados e visão limpa para o time." },
    { icon: Package, title: "Estoque vivo", text: "Catálogo de produtos com fotos, preços, disponibilidade e base única para cadastro, checagem e venda." },
    { icon: ScanBarcode, title: "Checagem no evento", text: "Consulta rápida com câmera para reduzir fila, dúvida de preço e retrabalho da equipe no salão." },
    { icon: ShieldCheck, title: "Controle premium", text: "Painel do organizador, gestão administrativa e super admin para controlar toda a operação comercial." },
];

const benefits = [
    "14 dias grátis para validar o processo inteiro com sua equipe",
    "Plano único Premium Full com tudo liberado desde o primeiro login",
    "Empresa criada já com cobrança, trial e acesso administrativo configurados",
];

export default function HomeLanding({ isLoggedIn }: Props) {
    return (
        <div className="relative min-h-[calc(100dvh-4rem)] overflow-hidden bg-[#070b11] text-stone-100">
            <HomeAnimatedBackdrop />
            <div className="relative z-10">
                <section className="mx-auto max-w-7xl px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:px-8 lg:pt-20">
                    <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
                        <div>
                            <motion.div custom={0} initial="hidden" animate="visible" variants={fadeUp}>
                                <Link href="/" className="inline-flex rounded-3xl outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200/80">
                                    <PortalGarageLogo className="h-20 w-20 drop-shadow-[0_0_40px_rgba(251,191,36,0.35)] sm:h-24 sm:w-24" />
                                </Link>
                            </motion.div>

                            <motion.div custom={1} initial="hidden" animate="visible" variants={fadeUp} className="mt-6 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-100">
                                <Sparkles className="h-3.5 w-3.5" />
                                Premium SaaS para Garage Sales
                            </motion.div>

                            <motion.h1 custom={2} initial="hidden" animate="visible" variants={fadeUp} className="mt-6 max-w-4xl text-5xl leading-[0.95] text-white sm:text-6xl lg:text-7xl font-[family:var(--font-display)]">
                                Venda a operação inteira, não só o cadastro.
                            </motion.h1>

                            <motion.p custom={3} initial="hidden" animate="visible" variants={fadeUp} className="mt-6 max-w-2xl text-lg leading-8 text-stone-300">
                                O Portal Garage foi feito para associações e equipes que precisam vender com organização: catálogo, checagem no salão e PDV em uma jornada premium, multiempresa e pronta para escalar.
                            </motion.p>

                            <motion.div custom={4} initial="hidden" animate="visible" variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
                                {!isLoggedIn ? (
                                    <>
                                        <a href="#planos" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-300 via-yellow-200 to-stone-50 px-7 py-3.5 text-sm font-semibold text-slate-950 shadow-[0_18px_50px_rgba(251,191,36,0.3)] transition hover:brightness-105">
                                            Começar 14 dias grátis
                                            <ArrowRight className="h-4 w-4" />
                                        </a>
                                        <Link href="/login" className="rounded-full border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:border-white/25 hover:bg-white/10">
                                            Entrar
                                        </Link>
                                    </>
                                ) : (
                                    <Link href="/administracao" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-300 via-yellow-200 to-stone-50 px-7 py-3.5 text-sm font-semibold text-slate-950 shadow-[0_18px_50px_rgba(251,191,36,0.3)] transition hover:brightness-105">
                                        Ir para minha página
                                    </Link>
                                )}
                            </motion.div>

                            <motion.div custom={5} initial="hidden" animate="visible" variants={fadeUp} className="mt-8 grid gap-3 sm:grid-cols-3">
                                {benefits.map((item) => (
                                    <div key={item} className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-stone-200 backdrop-blur-sm">
                                        <div className="flex items-start gap-3">
                                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" />
                                            <span>{item}</span>
                                        </div>
                                    </div>
                                ))}
                            </motion.div>

                        </div>

                        <motion.div custom={4} initial="hidden" animate="visible" variants={fadeUp} className="relative">
                            <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-amber-300/20 via-transparent to-sky-400/10 blur-3xl" />
                            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-8">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.2em] text-amber-100/70">Plano disponível</p>
                                        <h2 className="mt-2 text-3xl text-white font-[family:var(--font-display)]">{PREMIUM_FULL_PLAN.name}</h2>
                                    </div>
                                    <div className="rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-3 text-right">
                                        <p className="text-xs uppercase tracking-[0.18em] text-stone-400">Mensal</p>
                                        <p className="mt-1 text-3xl font-semibold text-white">{formatCurrencyBRLFromCents(PREMIUM_FULL_PLAN.monthlyPriceCents)}</p>
                                    </div>
                                </div>
                                <div className="mt-6 rounded-[1.5rem] border border-amber-300/20 bg-amber-300/10 p-5">
                                    <p className="text-xs uppercase tracking-[0.2em] text-amber-100/80">Ativação comercial</p>
                                    <p className="mt-2 text-2xl font-semibold text-white">14 dias grátis antes da primeira cobrança</p>
                                    <p className="mt-3 text-sm leading-7 text-amber-50/85">
                                        A empresa é ativada após a assinatura. Ao iniciar o teste, o sistema já registra a cobrança, cria o ambiente da organização e libera acesso administrativo imediato.
                                    </p>
                                </div>
                                <div className="mt-6 rounded-[1.3rem] border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-stone-300">
                                    Jornada comercial premium com gestão centralizada da empresa, controle de assinatura, trial e histórico financeiro em um único lugar.
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </section>

                <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {features.map((feature, index) => (
                            <motion.div key={feature.title} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.45, delay: index * 0.06 }} className="rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-200 ring-1 ring-amber-300/20">
                                    <feature.icon className="h-5 w-5" />
                                </div>
                                <h3 className="mt-5 text-lg font-semibold text-white">{feature.title}</h3>
                                <p className="mt-3 text-sm leading-7 text-stone-400">{feature.text}</p>
                            </motion.div>
                        ))}
                    </div>
                </section>

                <section id="planos" className="scroll-mt-24 border-t border-white/10 bg-black/20 py-20">
                    <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:items-start">
                        <motion.div initial={{ opacity: 0, x: -18 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
                            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-100">
                                <UserPlus className="h-3.5 w-3.5" />
                                Assinatura e ativação
                            </div>
                            <h2 className="mt-5 text-4xl text-white sm:text-5xl font-[family:var(--font-display)]">Ative o Premium Full e já entre operando.</h2>
                            <p className="mt-5 max-w-xl text-base leading-8 text-stone-300">
                                Esta etapa substitui o cadastro simples. Você assina o plano, inicia o trial de 14 dias e já entra com sua empresa pronta para cadastrar eventos, produtos, preços e vendas.
                            </p>
                            <div className="mt-8 rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
                                <p className="text-xs uppercase tracking-[0.2em] text-stone-400">O que está incluso</p>
                                <div className="mt-4 space-y-3">
                                    {[
                                        "Administração da organização com múltiplos eventos",
                                        "Captura e consulta rápida no salão",
                                        "PDV integrado com o mesmo estoque do cadastro",
                                        "Super admin para controle de empresas, billing e usuários",
                                    ].map((line) => (
                                        <div key={line} className="flex gap-3 text-sm text-stone-200">
                                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" />
                                            <span>{line}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, x: 18 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.4)] backdrop-blur-2xl sm:p-8">
                            {!isLoggedIn ? (
                                <CadastroOrganizacaoForm />
                            ) : (
                                <div className="py-10 text-center">
                                    <p className="text-stone-300">Você já está com sessão ativa.</p>
                                    <Link href="/administracao" className="mt-6 inline-flex rounded-full bg-gradient-to-r from-amber-300 via-yellow-200 to-stone-50 px-7 py-3.5 text-sm font-semibold text-slate-950">
                                        Ir para minha página
                                    </Link>
                                </div>
                            )}
                        </motion.div>
                    </div>
                </section>

                <footer className="border-t border-white/10 py-10 text-center text-sm text-stone-500">
                    <p>&copy; {new Date().getFullYear()} Portal Garage</p>
                    <nav className="mt-3 flex flex-wrap items-center justify-center gap-4 text-xs">
                        <Link href="/politica-privacidade" className="hover:text-stone-200">
                            Política de Privacidade
                        </Link>
                        <span aria-hidden>·</span>
                        <Link href="/termos" className="hover:text-stone-200">
                            Termos de Uso
                        </Link>
                    </nav>
                </footer>
            </div>
        </div>
    );
}
