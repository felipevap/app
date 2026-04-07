import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Portal Garage", template: "%s | Portal Garage" },
  description:
    "Portal Garage: gestão multi-organização de Garage Sales e vendas — cadastro, checagem de preço no evento, PDV e painel do organizador.",
  icons: {
    icon: "/gestor-garage-mark.svg",
    apple: "/gestor-garage-mark.svg",
  },
};

import { GarageSaleProvider } from "@/contexts/GarageSaleContext";
import SiteHeader from "@/components/SiteHeader";
import { getSessionFromCookies } from "@/lib/session";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSessionFromCookies();
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} font-sans antialiased`}
      >
        <GarageSaleProvider initialAuthenticated={!!session}>
          <SiteHeader />
          <div className="pt-16">{children}</div>
        </GarageSaleProvider>
      </body>
    </html>
  );
}
