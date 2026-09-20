import Link from "next/link";
import { requireUser } from "@/lib/auth";
import {
  couponsOf, draftsOf, likedItems, listingsOf, openOrdersOf, purchasesOf, salesOf, unreadCount,
} from "@/lib/queries";
import { ItemRow } from "@/components/ItemCard";
import { money, timeAgo } from "@/lib/format";

export const metadata = { title: "Mi cuenta" };

const STATUS_LABEL: Record<string, string> = {
  paid: "Pago confirmado",
  shipped: "Enviado",
  received: "Recibido",
  done: "Finalizada",
  cancelled: "Cancelada",
};

export default async function MyPage() {
  const user = await requireUser("/mypage");
  const open = openOrdersOf(user.id);
  const listings = listingsOf(user.id, ["on_sale", "stopped"]);
  const drafts = draftsOf(user.id);
  const likes = likedItems(user.id);
  const purchases = purchasesOf(user.id);
  const sales = salesOf(user.id);
  const coupons = couponsOf(user.id).filter((c) => !c.used_at && new Date(c.expires_at) > new Date());
  const unread = unreadCount(user.id);

  const tiles = [
    { href: "/mypage/listings", label: "En venta", value: listings.length },
    { href: "/mypage/sales", label: "Ventas", value: sales.length },
    { href: "/mypage/purchases", label: "Compras", value: purchases.length },
    { href: "/mypage/likes", label: "Favoritos", value: likes.length },
    { href: "/mypage/drafts", label: "Borradores", value: drafts.length },
    { href: "/mypage/coupons", label: "Cupones", value: coupons.length },
    { href: "/notifications", label: "Avisos sin leer", value: unread },
  ];

  return (
    <>
      <h1 className="text-xl font-bold">Hola, {user.name.split(" ")[0]} 👋</h1>

      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {tiles.map((tile) => (
          <Link key={tile.href + tile.label} href={tile.href} className="card p-3 text-center hover:border-brand">
            <span className="block text-lg font-black">{tile.value}</span>
            <span className="block text-[11px] text-muted">{tile.label}</span>
          </Link>
        ))}
      </div>

      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="section-title">Transacciones en curso</h2>
          <Link href="/mypage/purchases" className="text-xs font-bold text-brand-darker">Ver todas →</Link>
        </div>
        {open.length === 0 ? (
          <p className="card p-6 text-center text-sm text-muted">No tienes transacciones abiertas.</p>
        ) : (
          <ul className="card divide-y divide-line">
            {open.map((order) => (
              <li key={order.id}>
                <Link href={`/transaction/${order.id}`} className="flex items-center gap-3 p-3 hover:bg-canvas">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={order.image ?? ""} alt="" className="h-14 w-14 rounded-lg object-cover" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{order.title}</span>
                    <span className="block text-xs text-muted">
                      {order.buyer_id === user.id ? "Compra" : "Venta"} · {STATUS_LABEL[order.status]} ·{" "}
                      {timeAgo(order.created_at)}
                    </span>
                  </span>
                  <span className="text-sm font-bold">{money(order.price)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {listings.length > 0 && (
        <section className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="section-title">Tus artículos en venta</h2>
            <Link href="/mypage/listings" className="text-xs font-bold text-brand-darker">Ver todos →</Link>
          </div>
          <ItemRow items={listings} />
        </section>
      )}

      {likes.length > 0 && (
        <section className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="section-title">Tus favoritos</h2>
            <Link href="/mypage/likes" className="text-xs font-bold text-brand-darker">Ver todos →</Link>
          </div>
          <ItemRow items={likes} />
        </section>
      )}
    </>
  );
}
