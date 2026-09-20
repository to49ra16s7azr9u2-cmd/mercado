import Link from "next/link";
import type { OrderRow } from "@/lib/queries";
import { money, timeAgo } from "@/lib/format";

const STATUS: Record<string, { label: string; className: string }> = {
  paid: { label: "Pago confirmado", className: "bg-brand-soft text-brand-darker" },
  shipped: { label: "Enviado", className: "bg-brand-soft text-brand-darker" },
  received: { label: "Recibido", className: "bg-canvas text-muted" },
  done: { label: "Finalizada", className: "bg-canvas text-muted" },
  cancelled: { label: "Cancelada", className: "bg-red-50 text-red-600" },
};

export function OrderList({ orders, empty }: { orders: OrderRow[]; empty: string }) {
  if (!orders.length) {
    return <p className="card mt-4 p-8 text-center text-sm text-muted">{empty}</p>;
  }
  return (
    <ul className="card mt-4 divide-y divide-line">
      {orders.map((order) => {
        const status = STATUS[order.status] ?? STATUS.paid;
        return (
          <li key={order.id}>
            <Link href={`/transaction/${order.id}`} className="flex items-center gap-3 p-3 hover:bg-canvas">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={order.image ?? ""} alt="" className="h-16 w-16 rounded-lg object-cover" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">
                  {order.title}
                  {order.quantity > 1 ? ` × ${order.quantity}` : ""}
                </span>
                <span className={`mt-1 inline-block rounded px-2 py-0.5 text-[11px] font-bold ${status.className}`}>
                  {status.label}
                </span>
                <span className="mt-1 block text-xs text-muted">{timeAgo(order.created_at)}</span>
              </span>
              <span className="text-sm font-bold">{money(order.price * order.quantity)}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
