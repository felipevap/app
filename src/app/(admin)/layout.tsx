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
        { name: "Painel", href: "/admin", icon: "📊" },
        { name: "Eventos", href: "/admin/garage-sales", icon: "🏪" },
        { name: "Produtos", href: "/admin/products", icon: "📦" },
        { name: "Vendas", href: "/admin/sales", icon: "💰" },
        { name: "Configurações", href: "/admin/settings", icon: "⚙️" },
    ];

    return (
        <div className="flex h-[calc(100dvh-7rem)] min-h-0 bg-stone-100 text-stone-900 overflow-hidden">
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-stone-200 z-40 flex items-center justify-between px-4 shadow-sm">
                <span className="flex min-w-0 items-center gap-2 text-lg font-bold tracking-tight text-stone-900">
                    <PortalGarageLogo className="h-8 w-8 shrink-0" aria-hidden />
                    <span className="truncate">Portal Garage</span>
                </span>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 text-stone-500 hover:text-stone-900"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {isMobileMenuOpen ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M3 12h18M3 6h18M3 18h18" />}
                    </svg>
                </button>
            </div>

            {/* Backdrop for mobile */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-stone-900/20 z-40 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed md:relative z-50 h-full
                    ${isSidebarOpen ? "w-64" : "w-20"} 
                    bg-white border-r border-stone-200 shadow-sm
                    transition-all duration-300 transform 
                    ${isMobileMenuOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0"}
                    flex flex-col
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

                <nav className="flex-1 space-y-2 p-2 mt-16 md:mt-0 overflow-y-auto">
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
            </aside >

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-stone-50 p-4 md:p-8 pt-28 md:pt-8 w-full">
                {children}
            </main>
        </div >
    );
}
