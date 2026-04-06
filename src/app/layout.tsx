import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Portal Garage", template: "%s | Portal Garage" },
  description:
    "Portal Garage: gestão multi-organização de bazares e vendas — cadastro, checagem de preço no evento, PDV e painel do organizador.",
  icons: {
    icon: "/portal-garage-mark.svg",
    apple: "/portal-garage-mark.svg",
  },
};

// import { ProductProvider } from "@/contexts/ProductContext";
import { GarageSaleProvider } from "@/contexts/GarageSaleContext";
import SiteHeader from "@/components/SiteHeader";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GarageSaleProvider>
          <SiteHeader />
          <div className="pt-24">{children}</div>
        </GarageSaleProvider>
      </body>
    </html>
  );
}

