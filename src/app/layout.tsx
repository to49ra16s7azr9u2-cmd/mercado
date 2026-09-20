import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/constants";

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} · ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Mercado es el mercado de segunda mano donde puedes comprar y vender de forma fácil, rápida y segura. Envíos con seguimiento y pago protegido.",
};

export const viewport: Viewport = {
  themeColor: "#06c755",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen">
        <Header />
        <main className="mx-auto min-h-[60vh] max-w-6xl px-4 pb-24 pt-4 md:pb-10">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
