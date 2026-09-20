import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { ratingSummary, followCounts } from "@/lib/queries";
import { money } from "@/lib/format";

const GROUPS = [
  {
    title: "Mi actividad",
    links: [
      { href: "/mypage/listings", label: "Mis artículos", icon: "🏷️" },
      { href: "/mypage/drafts", label: "Borradores", icon: "📝" },
      { href: "/mypage/purchases", label: "Mis compras", icon: "📦" },
      { href: "/mypage/sales", label: "Mis ventas", icon: "💼" },
      { href: "/mypage/likes", label: "Favoritos", icon: "♥" },
      { href: "/mypage/history", label: "Historial de visitas", icon: "🕘" },
      { href: "/mypage/searches", label: "Búsquedas guardadas", icon: "🔔" },
      { href: "/mypage/follows", label: "Seguidos y seguidores", icon: "👥" },
      { href: "/mypage/reviews", label: "Calificaciones", icon: "⭐" },
    ],
  },
  {
    title: "Mercado Shops",
    links: [
      { href: "/mypage/shop", label: "Mi tienda", icon: "🏪" },
      { href: "/mypage/shop/items", label: "Inventario", icon: "📦" },
      { href: "/mypage/shop/orders", label: "Pedidos de la tienda", icon: "🧾" },
      { href: "/mypage/shops", label: "Tiendas que sigo", icon: "💚" },
    ],
  },
  {
    title: "Dinero",
    links: [
      { href: "/mypage/balance", label: "Saldo y transferencias", icon: "💶" },
      { href: "/mypage/points", label: "Puntos", icon: "🪙" },
      { href: "/mypage/coupons", label: "Cupones", icon: "🎟️" },
      { href: "/mypage/payment", label: "Métodos de pago", icon: "💳" },
    ],
  },
  {
    title: "Cuenta",
    links: [
      { href: "/mypage/profile", label: "Editar perfil", icon: "👤" },
      { href: "/mypage/address", label: "Dirección de envío", icon: "🏠" },
      { href: "/mypage/identity", label: "Verificación de identidad", icon: "🪪" },
      { href: "/mypage/settings", label: "Configuración", icon: "⚙️" },
    ],
  },
];

export default async function MyPageLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login?next=/mypage");
  const rating = ratingSummary(user.id);
  const follows = followCounts(user.id);

  return (
    <div className="md:flex md:gap-6">
      <aside className="md:w-64 md:shrink-0">
        <div className="card p-4">
          <Link href={`/user/${user.handle}`} className="flex items-center gap-3">
            <Avatar seed={user.avatar_seed} name={user.name} size={48} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold">{user.name}</span>
              <span className="block truncate text-xs text-muted">@{user.handle}</span>
            </span>
          </Link>
          <div className="mt-3 flex gap-3 text-[11px] text-muted">
            <span>😊 {rating.good}</span>
            <span>{follows.followers} seguidores</span>
            <span>{follows.following} siguiendo</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center">
            <Link href="/mypage/balance" className="rounded-lg bg-canvas py-2">
              <span className="block text-[10px] font-bold text-muted">Saldo</span>
              <span className="block text-sm font-bold">{money(user.balance)}</span>
            </Link>
            <Link href="/mypage/points" className="rounded-lg bg-canvas py-2">
              <span className="block text-[10px] font-bold text-muted">Puntos</span>
              <span className="block text-sm font-bold">{user.points}</span>
            </Link>
          </div>
        </div>
        <nav className="mt-3 space-y-3">
          {GROUPS.map((group) => (
            <div key={group.title} className="card overflow-hidden">
              <p className="border-b border-line px-4 py-2 text-[11px] font-bold text-muted">{group.title}</p>
              <ul>
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-canvas">
                      <span aria-hidden className="w-4 text-center">{link.icon}</span>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
      <div className="mt-4 min-w-0 flex-1 md:mt-0">{children}</div>
    </div>
  );
}
