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

    const navItems = [
        { name: "Painel", href: "/admin", icon: "📊" },
        { name: "Garage Sales", href: "/admin/garage-sales", icon: "🏪" },
        { name: "Produtos", href: "/admin/products", icon: "📦" },
        { name: "Vendas", href: "/admin/sales", icon: "💰" },
        { name: "Configurações", href: "/admin/settings", icon: "⚙️" },
    ];

    return (
        <div className="flex h-screen bg-neutral-900 text-white">
            {/* Sidebar */}
            <aside
                className={`${isSidebarOpen ? "w-64" : "w-20"
                    } flex flex-col border-r border-neutral-800 bg-neutral-950 transition-all duration-300`}
            >
                <div className="flex items-center justify-between p-4">
                    {isSidebarOpen && (
                        <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            Gerenciador
                        </span>
                    )}
                    <button
                        onClick={() => setSidebarOpen(!isSidebarOpen)}
                        className="rounded p-1 hover:bg-neutral-800"
                    >
                        {isSidebarOpen ? "◀" : "▶"}
                    </button>
                </div>

                <nav className="flex-1 space-y-2 p-2">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${isActive
                                    ? "bg-purple-600 text-white"
                                    : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
                                    }`}
                            >
                                <span className="text-xl">{item.icon}</span>
                                {isSidebarOpen && <span>{item.name}</span>}
                            </Link>
                        );
                    })}
                </nav>

                <div className="border-t border-neutral-800 p-4 space-y-2">
                    <Link
                        href="/"
                        className="flex items-center gap-3 text-blue-400 hover:text-blue-300"
                    >
                        <span className="text-xl">🏠</span>
                        {isSidebarOpen && <span>Início</span>}
                    </Link>
                    <Link
                        href="/login"
                        className="flex items-center gap-3 text-red-400 hover:text-red-300"
                    >
                        <span className="text-xl">🚪</span>
                        {isSidebarOpen && <span>Sair</span>}
                    </Link>
                </div>
            </aside >

            {/* Main Content */}
            < main className="flex-1 overflow-auto bg-neutral-900 p-8" >
                {children}
            </main >
        </div >
    );
}
