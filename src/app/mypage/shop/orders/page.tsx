import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { shopOfUser, shopOrders } from "@/lib/queries";
import { shipOrderAction } from "@/lib/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { money, shortDate } from "@/lib/format";

export const metadata = { title: "Pedidos de la tienda" };

const STATUS: Record<string, { label: string; className: string }> = {
  paid: { label: "Por enviar", className: "bg-brand-soft text-brand-darker" },
  shipped: { label: "Enviado", className: "bg-brand-soft text-brand-darker" },
  received: { label: "Recibido", className: "bg-canvas text-muted" },
  done: { label: "Finalizado", className: "bg-canvas text-muted" },
  cancelled: { label: "Cancelado", className: "bg-red-50 text-red-600" },
};

export default async function ShopOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireUser("/mypage/shop/orders");
  const shop = shopOfUser(user.id);
  if (!shop) redirect("/mypage/shop");
  const { status } = await searchParams;
  const all = shopOrders(shop.id);
  const orders = status ? all.filter((o) => o.status === status) : all;

  return (
    <>
      <h1 className="text-xl font-bold">Pedidos de la tienda</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/mypage/shop/orders" className={`chip ${!status ? "chip-active" : ""}`}>
          Todos ({all.length})
        </Link>
        {Object.entries(STATUS).map(([value, meta]) => (
          <Link
            key={value}
            href={`/mypage/shop/orders?status=${value}`}
            className={`chip ${status === value ? "chip-active" : ""}`}
          >
            {meta.label} ({all.filter((o) => o.status === value).length})
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <p className="card mt-4 p-8 text-center text-sm text-muted">No hay pedidos en este estado.</p>
      ) : (
        <ul className="card mt-4 divide-y divide-line">
          {orders.map((order) => {
            const meta = STATUS[order.status] ?? STATUS.paid;
            return (
              <li key={order.id} className="p-3">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={order.image ?? ""} alt="" className="h-14 w-14 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/transaction/${order.id}`} className="block truncate text-sm font-bold hover:underline">
                      {order.title}
                    </Link>
                    <p className="text-xs text-muted">
                      {order.buyer_name} · {order.quantity} pza
                      {order.variant_label ? ` · ${order.variant_label}` : ""} · {shortDate(order.created_at)}
                    </p>
                    <p className="text-xs text-muted">
                      {order.ship_city}, {order.ship_region} · CP {order.ship_zip}
                      {order.tracking ? ` · guía ${order.tracking}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{money(order.price * order.quantity)}</p>
                    <span className={`mt-1 inline-block rounded px-2 py-0.5 text-[11px] font-bold ${meta.className}`}>
                      {meta.label}
                    </span>
                  </div>
                </div>
                {order.status === "paid" && (
                  <form action={shipOrderAction} className="mt-2 flex gap-2 pl-[68px]">
                    <input type="hidden" name="order_id" value={order.id} />
                    <input name="tracking" className="input py-1.5 text-sm" placeholder="Número de guía (opcional)" />
                    <SubmitButton className="btn-primary whitespace-nowrap px-3 py-1.5 text-xs">
                      Marcar como enviado
                    </SubmitButton>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
