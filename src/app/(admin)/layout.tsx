"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import PortalGarageLogo from "@/components/PortalGarageLogo";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const navItems = [
        { name: "Central", href: "/administracao", icon: "🏠" },
        { name: "Resumo", href: "/admin", icon: "📊" },
        { name: "Eventos", href: "/admin/garage-sales", icon: "🏪" },
        { name: "Produtos", href: "/admin/products", icon: "📦" },
        { name: "Vendas", href: "/admin/sales", icon: "💰" },
        { name: "Modelos de Contrato", href: "/admin/contract-templates", icon: "📄" },
        { name: "Configurações", href: "/admin/settings", icon: "⚙️" },
    ];

    return (
        <div className="flex h-[calc(100dvh-4rem)] min-h-0 bg-stone-100 text-stone-900 overflow-hidden">
            <div className="md:hidden fixed top-16 left-0 right-0 z-[99] flex h-16 items-center justify-between border-b border-stone-200 bg-white px-4 shadow-sm">
                <Link
                    href="/"
                    className="flex min-w-0 items-center gap-2 text-lg font-bold tracking-tight text-stone-900 outline-offset-4 focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-600"
                >
                    <PortalGarageLogo className="h-8 w-8 shrink-0" aria-hidden />
                    <span className="truncate">Portal Garage</span>
                </Link>
                <button
                    type="button"
                    aria-expanded={isMobileMenuOpen}
                    aria-label={isMobileMenuOpen ? "Fechar menu" : "Abrir menu"}
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 text-stone-500 hover:text-stone-900"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {isMobileMenuOpen ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M3 12h18M3 6h18M3 18h18" />}
                    </svg>
                </button>
            </div>

            {isMobileMenuOpen && (
                <div
                    className="fixed top-32 right-0 bottom-0 left-0 z-[90] bg-stone-900/20 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                    aria-hidden
                />
            )}

            <aside
                className={`
                    fixed z-[95] flex h-[calc(100dvh-8rem)] flex-col border-r border-stone-200 bg-white shadow-sm transition-transform duration-300 max-md:top-32 md:relative md:top-auto md:z-50 md:h-full
                    ${isSidebarOpen ? "w-64" : "w-20"}
                    ${isMobileMenuOpen ? "w-64 translate-x-0" : "-translate-x-full md:translate-x-0"}
                `}
            >
                <div className="hidden md:flex items-center justify-between gap-2 p-4">
                    <Link href="/" className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                        <PortalGarageLogo className="h-8 w-8 shrink-0" aria-hidden />
                        {isSidebarOpen && (
                            <span className="truncate text-lg font-bold tracking-tight text-stone-900">Portal Garage</span>
                        )}
                    </Link>
                    <button
                        onClick={() => setSidebarOpen(!isSidebarOpen)}
                        className="shrink-0 rounded p-1 hover:bg-stone-100 text-stone-500 hover:text-stone-900"
                    >
                        {isSidebarOpen ? "◀" : "▶"}
                    </button>
                </div>

                <nav className="mt-0 flex-1 space-y-2 overflow-y-auto p-2 md:mt-0">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${isActive
                                    ? "bg-purple-600 text-white shadow-sm"
                                    : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                                    }`}
                            >
                                <span className="text-xl">{item.icon}</span>
                                {(isSidebarOpen || isMobileMenuOpen) && <span>{item.name}</span>}
                            </Link>
                        );
                    })}
                </nav>

                <div className="border-t border-stone-200 p-4 space-y-2 mb-safe">
                    <Link
                        href="/"
                        className="flex items-center gap-3 text-blue-700 hover:text-blue-800 px-2 py-1"
                    >
                        <span className="text-xl">🏠</span>
                        {(isSidebarOpen || isMobileMenuOpen) && <span>Início</span>}
                    </Link>
                    <Link
                        href="/login"
                        className="flex items-center gap-3 text-red-700 hover:text-red-800 px-2 py-1"
                    >
                        <span className="text-xl">🚪</span>
                        {(isSidebarOpen || isMobileMenuOpen) && <span>Sair</span>}
                    </Link>
                </div>
            </aside>

            <main className="w-full flex-1 overflow-auto bg-stone-50 p-4 pt-16 md:p-8 md:pt-8">
                {children}
            </main>
        </div>
    );
}
