import Link from "next/link";
import NextImage from "next/image";
import { cookies } from "next/headers";
import AuthButton from "@/components/AuthButton";

export default async function Home() {
  const cookieStore = await cookies();
  const isLoggedIn = cookieStore.get("auth")?.value === "true";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black p-4 text-center">
      <div className="absolute top-4 right-4">
        <AuthButton isLoggedIn={isLoggedIn} />
      </div>

      <div className="mb-8 relative w-full max-w-2xl aspect-[16/9] rounded-2xl overflow-hidden shadow-2xl border border-white/10">
        <NextImage
          src="/logo-home.jpg"
          alt="Garage Sale Premium Logo"
          fill
          className="object-contain transition-transform duration-700 hover:scale-105"
          priority
        />
      </div>

      <h1 className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-6xl font-bold text-transparent">
        Garage Sale Premium
      </h1>
      <p className="mt-4 text-xl text-gray-400">Sistema de Gerenciamento Premium de Garage Sales</p>

      <div className="mt-12 flex flex-wrap justify-center gap-6 w-full max-w-5xl">
        {isLoggedIn && (
          <Link
            href="/admin"
            className="group relative overflow-hidden rounded-2xl bg-neutral-900 p-8 transition-all hover:scale-105 hover:bg-neutral-800 w-full sm:w-80"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative z-10">
              <span className="text-4xl">📊</span>
              <h2 className="mt-4 text-2xl font-bold text-white">Gerenciador</h2>
              <p className="mt-2 text-sm text-gray-400">Gerenciar Produtos e Vendas</p>
            </div>
          </Link>
        )}

        <Link
          href="/capture"
          className="group relative overflow-hidden rounded-2xl bg-neutral-900 p-8 transition-all hover:scale-105 hover:bg-neutral-800 w-full sm:w-80"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="relative z-10">
            <span className="text-4xl">🤝</span>
            <h2 className="mt-4 text-2xl font-bold text-white">Amigo Garage</h2>
            <p className="mt-2 text-sm text-gray-400">Consultar Preços e Comprar</p>
          </div>
        </Link>

        {isLoggedIn && (
          <Link
            href="/pos"
            className="group relative overflow-hidden rounded-2xl bg-neutral-900 p-8 transition-all hover:scale-105 hover:bg-neutral-800 w-full sm:w-80"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative z-10">
              <span className="text-4xl">🛒</span>
              <h2 className="mt-4 text-2xl font-bold text-white">PDV</h2>
              <p className="mt-2 text-sm text-gray-400">Processar Transações</p>
            </div>
          </Link>
        )}
      </div>

      <footer className="mt-16 text-sm text-neutral-600">
        &copy; 2026 Garage Sale Premium <span className="mx-2">|</span> v1.1.0
      </footer>
    </div>
  );
}
