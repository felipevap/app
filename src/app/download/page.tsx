import type { Metadata } from "next";
import Link from "next/link";
import { parseDesktopReleasesFromEnv } from "@/lib/desktop-releases";

export const metadata: Metadata = {
    title: "App desktop",
    description: "Download do Portal Garage para Windows e macOS.",
};

export default function DownloadPage() {
    const rel = parseDesktopReleasesFromEnv();

    return (
        <div className="mx-auto max-w-2xl px-4 py-16">
            <h1 className="text-2xl font-semibold text-white">App desktop Portal Garage</h1>
            <p className="mt-3 text-sm text-slate-400">
                Instaladores para <strong className="text-slate-200">Windows</strong> (.exe / NSIS) e{" "}
                <strong className="text-slate-200">macOS</strong> (.dmg). Use a versão correspondente ao seu
                sistema.
            </p>

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                <p className="text-xs font-medium uppercase tracking-wider text-amber-400/90">Versão</p>
                <p className="mt-1 text-lg font-semibold text-white">{rel.version}</p>
                {rel.updatedAt && <p className="mt-1 text-sm text-slate-500">Atualizado em {rel.updatedAt}</p>}
                {rel.notes && <p className="mt-4 text-sm text-slate-400">{rel.notes}</p>}

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
                        <p className="text-sm font-medium text-white">Windows</p>
                        <p className="mt-1 text-xs text-slate-500">Windows 10 ou superior (64 bits)</p>
                        {rel.windowsUrl ? (
                            <a
                                href={rel.windowsUrl}
                                className="mt-4 inline-flex w-full justify-center rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:brightness-105"
                            >
                                Baixar para Windows
                            </a>
                        ) : (
                            <p className="mt-4 text-sm text-slate-500">Link em breve</p>
                        )}
                        {rel.windowsSha256 && (
                            <p className="mt-2 break-all font-mono text-[10px] text-slate-600">SHA256: {rel.windowsSha256}</p>
                        )}
                    </div>
                    <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
                        <p className="text-sm font-medium text-white">macOS</p>
                        <p className="mt-1 text-xs text-slate-500">macOS 12 ou superior (Apple Silicon ou Intel)</p>
                        {rel.macUrl ? (
                            <a
                                href={rel.macUrl}
                                className="mt-4 inline-flex w-full justify-center rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:brightness-105"
                            >
                                Baixar para macOS
                            </a>
                        ) : (
                            <p className="mt-4 text-sm text-slate-500">Link em breve</p>
                        )}
                        {rel.macSha256 && (
                            <p className="mt-2 break-all font-mono text-[10px] text-slate-600">SHA256: {rel.macSha256}</p>
                        )}
                    </div>
                </div>
            </div>

            <p className="mt-8 text-sm text-slate-500">
                Requisitos: conexão com a internet para o primeiro login. O PDV em modo feira pode funcionar offline após
                preparação, conforme documentação do app.
            </p>
            <p className="mt-4 text-center text-sm">
                <Link href="/politica-privacidade" className="text-amber-400/90 hover:text-amber-300">
                    Política de Privacidade
                </Link>
                <span className="mx-2 text-slate-600">·</span>
                <Link href="/" className="text-slate-400 hover:text-slate-200">
                    Voltar ao início
                </Link>
            </p>
        </div>
    );
}
