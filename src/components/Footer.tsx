import Link from "next/link";
import { SITE_NAME } from "@/lib/constants";

const COLUMNS = [
  {
    title: "Mercado",
    links: [
      { href: "/guide", label: "Cómo funciona" },
      { href: "/guide#vender", label: "Guía para vender" },
      { href: "/guide#comprar", label: "Guía para comprar" },
      { href: "/guide#envios", label: "Métodos de envío" },
      { href: "/guide#comisiones", label: "Comisiones y pagos" },
      { href: "/brands", label: "Marcas" },
      { href: "/shops", label: "Mercado Shops" },
      { href: "/mypage/shop/new", label: "Vender como negocio" },
    ],
  },
  {
    title: "Ayuda",
    links: [
      { href: "/help", label: "Centro de ayuda" },
      { href: "/help#seguridad", label: "Compra y venta seguras" },
      { href: "/help#problemas", label: "Resolución de incidencias" },
      { href: "/help#contacto", label: "Contactar con el equipo" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/terminos", label: "Términos de uso" },
      { href: "/legal/privacidad", label: "Política de privacidad" },
      { href: "/legal/cookies", label: "Política de cookies" },
      { href: "/legal/prohibidos", label: "Artículos prohibidos" },
      { href: "/legal/shops", label: "Reglas de Mercado Shops" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-10 border-t border-line bg-white pb-24 pt-8 md:pb-8">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <p className="text-xl font-black text-brand">{SITE_NAME}</p>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            El mercado donde todo encuentra una segunda vida. Compra y vende en todo México con
            envíos rastreados y pago protegido.
          </p>
          <div className="mt-3 flex gap-2 text-lg" aria-hidden>
            <span>🤳</span><span>📷</span><span>🐦</span><span>▶️</span>
          </div>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="text-sm font-bold text-ink">{col.title}</p>
            <ul className="mt-3 space-y-2 text-xs text-muted">
              {col.links.map((link) => (
                <li key={link.href + link.label}>
                  <Link href={link.href} className="hover:text-brand-darker">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mx-auto mt-8 max-w-6xl px-4 text-[11px] text-muted">
        © {new Date().getFullYear()} {SITE_NAME} · Proyecto de demostración sin valor comercial.
      </p>
    </footer>
  );
}
