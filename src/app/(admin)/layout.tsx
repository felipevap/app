"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

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
        { name: "Garage Sales", href: "/admin/garage-sales", icon: "🏪" },
        { name: "Produtos", href: "/admin/products", icon: "📦" },
        { name: "Vendas", href: "/admin/sales", icon: "💰" },
        { name: "Configurações", href: "/admin/settings", icon: "⚙️" },
    ];

    return (
        <div className="flex h-screen bg-neutral-900 text-white overflow-hidden">
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-neutral-950 border-b border-neutral-800 z-40 flex items-center justify-between px-4">
                <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    Gerenciador
                </span>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 text-neutral-400 hover:text-white"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {isMobileMenuOpen ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M3 12h18M3 6h18M3 18h18" />}
                    </svg>
                </button>
            </div>

            {/* Backdrop for mobile */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed md:relative z-50 h-full
                    ${isSidebarOpen ? "w-64" : "w-20"} 
                    bg-neutral-950 border-r border-neutral-800 
                    transition-all duration-300 transform 
                    ${isMobileMenuOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0"}
                    flex flex-col
                `}
            >
                <div className="hidden md:flex items-center justify-between p-4">
                    {isSidebarOpen && (
                        <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            Gerenciador
                        </span>
                    )}
                    <button
                        onClick={() => setSidebarOpen(!isSidebarOpen)}
                        className="rounded p-1 hover:bg-neutral-800 text-neutral-400 hover:text-white"
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
                                    ? "bg-purple-600 text-white"
                                    : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
                                    }`}
                            >
                                <span className="text-xl">{item.icon}</span>
                                {(isSidebarOpen || isMobileMenuOpen) && <span>{item.name}</span>}
                            </Link>
                        );
                    })}
                </nav>

                <div className="border-t border-neutral-800 p-4 space-y-2 mb-safe">
                    <Link
                        href="/"
                        className="flex items-center gap-3 text-blue-400 hover:text-blue-300 px-2 py-1"
                    >
                        <span className="text-xl">🏠</span>
                        {(isSidebarOpen || isMobileMenuOpen) && <span>Início</span>}
                    </Link>
                    <Link
                        href="/login"
                        className="flex items-center gap-3 text-red-400 hover:text-red-300 px-2 py-1"
                    >
                        <span className="text-xl">🚪</span>
                        {(isSidebarOpen || isMobileMenuOpen) && <span>Sair</span>}
                    </Link>
                </div>
            </aside >

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-neutral-900 p-4 md:p-8 pt-20 md:pt-8 w-full">
                {children}
            </main>
        </div >
    );
}
