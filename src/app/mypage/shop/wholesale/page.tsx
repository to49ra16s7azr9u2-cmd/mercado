import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { b2bPricesOf, partnerRequestsFor, shopItems, shopOfUser, wholesaleOrdersOf } from "@/lib/queries";
import { decidePartnerAction, saveB2bPricesAction } from "@/lib/actions";
import { B2bPriceForm } from "@/components/WholesaleForms";
import { SubmitButton } from "@/components/SubmitButton";
import { PARTNER_STATUS } from "@/lib/constants";
import { money, timeAgo } from "@/lib/format";

export const metadata = { title: "Mayoreo de mi tienda" };

export default async function WholesaleAdminPage() {
  const user = await requireUser("/mypage/shop/wholesale");
  const shop = shopOfUser(user.id);
  if (!shop) redirect("/mypage/shop");

  const requests = partnerRequestsFor(shop.id);
  const items = shopItems(shop.id, ["on_sale", "stopped"]);
  const orders = wholesaleOrdersOf(shop.id, "supplier");
  const approved = requests.filter((r) => r.status === "approved").length;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Mayoreo (soy proveedora)</h1>
        <Link href={`/mayoreo/${shop.slug}`} className="btn-outline">Ver mi catálogo público</Link>
      </div>
      <p className="mt-1 text-sm text-muted">
        Define precios por volumen y aprueba a las tiendas que quieren surtirse contigo.
        Mercado cobra 5 % en las ventas de mayoreo.
      </p>

      <section className="mt-5">
        <h2 className="section-title">Solicitudes de compradoras ({approved} aprobadas)</h2>
        {requests.length === 0 ? (
          <p className="card mt-2 p-6 text-center text-sm text-muted">Todavía no recibes solicitudes.</p>
        ) : (
          <ul className="card mt-2 divide-y divide-line">
            {requests.map((request) => (
              <li key={request.id} className="flex items-start gap-3 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-lg">
                  {request.shop_emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <Link href={`/shop/${request.shop_slug}`} className="block truncate text-sm font-bold hover:underline">
                    {request.shop_name}
                  </Link>
                  <p className="text-xs text-muted">
                    {request.shop_category} · {request.shop_region} · {timeAgo(request.created_at)}
                  </p>
                  {request.note && <p className="mt-1 text-sm text-muted">«{request.note}»</p>}
                </div>
                {request.status === "pending" ? (
                  <div className="flex shrink-0 gap-1.5">
                    <form action={decidePartnerAction}>
                      <input type="hidden" name="id" value={request.id} />
                      <input type="hidden" name="decision" value="approve" />
                      <SubmitButton className="btn-primary px-3 py-1.5 text-xs">Aprobar</SubmitButton>
                    </form>
                    <form action={decidePartnerAction}>
                      <input type="hidden" name="id" value={request.id} />
                      <input type="hidden" name="decision" value="reject" />
                      <SubmitButton className="btn-ghost px-3 py-1.5 text-xs">Rechazar</SubmitButton>
                    </form>
                  </div>
                ) : (
                  <span className={`chip shrink-0 ${PARTNER_STATUS[request.status].className}`}>
                    {PARTNER_STATUS[request.status].label}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <h2 className="section-title">Precios por volumen</h2>
        {items.length === 0 ? (
          <p className="card mt-2 p-6 text-center text-sm text-muted">Publica productos para ofrecer mayoreo.</p>
        ) : (
          <ul className="card mt-2 divide-y divide-line">
            {items.map((item) => (
              <li key={item.id} className="p-4">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image ?? ""} alt="" className="h-12 w-12 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{item.title}</p>
                    <p className="text-xs text-muted">
                      Menudeo {money(item.price)} · {item.stock} piezas
                    </p>
                  </div>
                </div>
                <B2bPriceForm
                  action={saveB2bPricesAction}
                  itemId={item.id}
                  retailPrice={item.price}
                  tiers={b2bPricesOf(item.id).map((t) => ({ min_qty: t.min_qty, price: t.price }))}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <h2 className="section-title">Pedidos de mayoreo recibidos</h2>
        {orders.length === 0 ? (
          <p className="card mt-2 p-6 text-center text-sm text-muted">Todavía no tienes pedidos de mayoreo.</p>
        ) : (
          <ul className="card mt-2 divide-y divide-line">
            {orders.map((order) => (
              <li key={order.id}>
                <Link href={`/transaction/${order.id}`} className="flex items-center gap-3 p-3 hover:bg-canvas">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{order.title} × {order.quantity}</span>
                    <span className="block text-xs text-muted">{order.buyer_name} · {timeAgo(order.created_at)}</span>
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
