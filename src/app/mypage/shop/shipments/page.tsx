import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { consolidatableOrders, ordersInShipment, shipmentsOf, shopOfUser } from "@/lib/queries";
import { createShipmentAction, pickUpShipmentAction } from "@/lib/actions";
import { ConsolidateForm } from "@/components/NetworkForms";
import { SubmitButton } from "@/components/SubmitButton";
import { SHIPMENT_STATUS, shippingLabel } from "@/lib/constants";
import { money, shortDate } from "@/lib/format";

export const metadata = { title: "Envíos consolidados" };

export default async function ShipmentsPage() {
  const user = await requireUser("/mypage/shop/shipments");
  const shop = shopOfUser(user.id);
  if (!shop) redirect("/mypage/shop");

  const pending = consolidatableOrders(shop.id);
  const shipments = shipmentsOf(shop.id);
  const savedTotal = shipments.reduce((sum, s) => sum + s.saved, 0);

  return (
    <>
      <h1 className="text-xl font-bold">Envíos consolidados</h1>
      <p className="mt-1 text-sm text-muted">
        Agrupa pedidos en una sola recolección. Llevas ahorrados {money(savedTotal)} en guías.
      </p>

      {pending.length >= 2 ? (
        <div className="mt-4">
          <ConsolidateForm
            action={createShipmentAction}
            orders={pending.map((order) => ({
              id: order.id,
              title: order.title,
              region: order.ship_region || "Sin estado",
              city: order.ship_city,
              buyer: order.buyer_name,
              quantity: order.quantity,
            }))}
          />
        </div>
      ) : (
        <p className="card mt-4 p-6 text-center text-sm text-muted">
          Necesitas al menos 2 pedidos pagados sin enviar para consolidar.
        </p>
      )}

      <section className="mt-6">
        <h2 className="section-title">Recolecciones</h2>
        {shipments.length === 0 ? (
          <p className="card mt-2 p-6 text-center text-sm text-muted">Todavía no creas envíos consolidados.</p>
        ) : (
          <ul className="mt-2 space-y-3">
            {shipments.map((shipment) => {
              const status = SHIPMENT_STATUS[shipment.status] ?? SHIPMENT_STATUS.open;
              const orders = ordersInShipment(shipment.id);
              return (
                <li key={shipment.id} className="card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold">
                        {shippingLabel(shipment.method)} · {orders.length} pedidos
                      </p>
                      <p className="text-xs text-muted">
                        {shipment.region} · recolección {shipment.pickup_date || "por definir"} ·
                        creado el {shortDate(shipment.created_at)}
                      </p>
                    </div>
                    <span className={`chip ${status.className}`}>{status.label}</span>
                  </div>

                  <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-canvas py-2">
                      <dt className="text-muted">Costo total</dt>
                      <dd className="text-sm font-bold">{money(shipment.total_cost)}</dd>
                    </div>
                    <div className="rounded-lg bg-canvas py-2">
                      <dt className="text-muted">Por paquete</dt>
                      <dd className="text-sm font-bold">{money(shipment.unit_cost)}</dd>
                    </div>
                    <div className="rounded-lg bg-brand-soft py-2">
                      <dt className="text-brand-darker">Ahorro</dt>
                      <dd className="text-sm font-black text-brand-darker">{money(shipment.saved)}</dd>
                    </div>
                  </dl>

                  <ul className="mt-3 divide-y divide-line text-sm">
                    {orders.map((order) => (
                      <li key={order.id} className="flex items-center gap-2 py-2">
                        <Link href={`/transaction/${order.id}`} className="min-w-0 flex-1 truncate hover:underline">
                          {order.title} × {order.quantity}
                        </Link>
                        <span className="shrink-0 text-xs text-muted">
                          {order.ship_city} {order.tracking ? `· ${order.tracking}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {shipment.status === "open" && (
                    <form action={pickUpShipmentAction} className="mt-3 flex gap-2">
                      <input type="hidden" name="shipment_id" value={shipment.id} />
                      <input name="tracking" className="input py-1.5 text-sm" placeholder="Folio de recolección (opcional)" />
                      <SubmitButton className="btn-primary whitespace-nowrap px-3 py-1.5 text-xs">
                        Marcar como recolectado
                      </SubmitButton>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
