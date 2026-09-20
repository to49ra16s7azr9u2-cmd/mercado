import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { shopOfUser, shopStats, shopOrders } from "@/lib/queries";
import { reviewShopAction } from "@/lib/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { SHOP_STATUS } from "@/lib/constants";
import { money, shortDate } from "@/lib/format";

export const metadata = { title: "Mi tienda · Mercado Shops" };

export default async function ShopDashboardPage() {
  const user = await requireUser("/mypage/shop");
  const shop = shopOfUser(user.id);

  if (!shop) {
    return (
      <>
        <h1 className="text-xl font-bold">Mercado Shops</h1>
        <div className="card mt-4 overflow-hidden">
          <div className="bg-gradient-to-br from-brand to-brand-darker p-6 text-white">
            <p className="text-lg font-black">Vende como negocio, con inventario y factura</p>
            <p className="mt-2 text-sm text-white/85">
              Publica productos con varias piezas, variantes de talla o color, y recibe pedidos
              con la misma protección de Mercado. Abrir tu tienda es gratis.
            </p>
          </div>
          <ul className="divide-y divide-line text-sm">
            {[
              ["📦", "Inventario y variantes", "Controla cuántas piezas quedan de cada talla o color."],
              ["🧾", "Datos fiscales públicos", "Publicamos tu información de vendedor conforme a la ley."],
              ["🚚", "Envíos con guía prepagada", "Usa Envío Fácil o Cómodo y gestiona todos tus pedidos juntos."],
              ["💳", "Meses sin intereses", "Tus clientes pueden pagar a 3, 6, 9 o 12 MSI."],
            ].map(([icon, title, body]) => (
              <li key={title} className="flex gap-3 p-4">
                <span className="text-xl" aria-hidden>{icon}</span>
                <span>
                  <span className="block font-bold">{title}</span>
                  <span className="block text-muted">{body}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="p-4">
            <Link href="/mypage/shop/new" className="btn-primary btn-lg">Abrir mi tienda gratis</Link>
          </div>
        </div>
      </>
    );
  }

  const stats = shopStats(shop.id);
  const orders = shopOrders(shop.id).slice(0, 5);
  const status = SHOP_STATUS[shop.status];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">{shop.name}</h1>
        <span className={`rounded px-2 py-1 text-xs font-bold ${status.className}`}>{status.label}</span>
      </div>
      <p className="mt-1 text-sm text-muted">
        {shop.category} · Alta el {shortDate(shop.created_at)} ·{" "}
        <Link href={`/shop/${shop.slug}`} className="link">Ver tienda pública</Link>
      </p>

      {shop.status === "pending" && (
        <div className="card mt-4 p-4">
          <p className="text-sm">
            Tu solicitud está en revisión. En esta demostración puedes simular la aprobación del
            equipo de Mercado Shops para empezar a publicar.
          </p>
          <form action={reviewShopAction} className="mt-3">
            <SubmitButton className="btn-primary">Simular aprobación</SubmitButton>
          </form>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Productos", value: stats.items, href: "/mypage/shop/items" },
          { label: "Piezas", value: stats.stock, href: "/mypage/shop/items" },
          { label: "Pedidos", value: stats.sold, href: "/mypage/shop/orders" },
          { label: "Por enviar", value: stats.pending, href: "/mypage/shop/orders" },
          { label: "Seguidores", value: stats.followers, href: `/shop/${shop.slug}` },
          { label: "Cobrado", value: money(stats.revenue), href: "/mypage/balance" },
        ].map((tile) => (
          <Link key={tile.label} href={tile.href} className="card p-3 text-center hover:border-brand">
            <span className="block text-base font-black">{tile.value}</span>
            <span className="block text-[11px] text-muted">{tile.label}</span>
          </Link>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/mypage/shop/items/new" className="btn-primary">Publicar producto</Link>
        <Link href="/mypage/shop/items" className="btn-outline">Inventario</Link>
        <Link href="/mypage/shop/orders" className="btn-outline">Pedidos</Link>
        <Link href="/mypage/shop/settings" className="btn-outline">Configuración</Link>
      </div>

      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="section-title">Últimos pedidos</h2>
          <Link href="/mypage/shop/orders" className="text-xs font-bold text-brand-darker">Ver todos →</Link>
        </div>
        {orders.length === 0 ? (
          <p className="card p-6 text-center text-sm text-muted">Todavía no tienes pedidos.</p>
        ) : (
          <ul className="card divide-y divide-line">
            {orders.map((order) => (
              <li key={order.id}>
                <Link href={`/transaction/${order.id}`} className="flex items-center gap-3 p-3 hover:bg-canvas">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={order.image ?? ""} alt="" className="h-12 w-12 rounded-lg object-cover" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{order.title}</span>
                    <span className="block text-xs text-muted">
                      {order.buyer_name} · {order.quantity} pza · {shortDate(order.created_at)}
                    </span>
                  </span>
                  <span className="text-sm font-bold">{money(order.price * order.quantity)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
