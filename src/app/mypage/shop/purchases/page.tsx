import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { shopOfUser, wholesaleOrdersOf } from "@/lib/queries";
import { money, shortDate } from "@/lib/format";

export const metadata = { title: "Mis compras de mayoreo" };

const STATUS: Record<string, string> = {
  paid: "Por enviar", shipped: "En camino", received: "Recibido",
  done: "Finalizado", cancelled: "Cancelado",
};

export default async function ShopPurchasesPage() {
  const user = await requireUser("/mypage/shop/purchases");
  const shop = shopOfUser(user.id);
  if (!shop) redirect("/mypage/shop");
  const orders = wholesaleOrdersOf(shop.id, "buyer");
  const total = orders.reduce((sum, o) => sum + o.price * o.quantity, 0);

  return (
    <>
      <h1 className="text-xl font-bold">Mis compras de mayoreo</h1>
      <p className="mt-1 text-sm text-muted">
        {orders.length} pedidos · {money(total)} surtidos con otras tiendas de Mercado.
      </p>

      {orders.length === 0 ? (
        <p className="card mt-4 p-8 text-center text-sm text-muted">
          Todavía no compras en mayoreo.{" "}
          <Link href="/mayoreo" className="link font-bold">Busca proveedores</Link>
        </p>
      ) : (
        <ul className="card mt-4 divide-y divide-line">
          {orders.map((order) => (
            <li key={order.id}>
              <Link href={`/transaction/${order.id}`} className="flex items-center gap-3 p-3 hover:bg-canvas">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={order.image ?? ""} alt="" className="h-14 w-14 rounded-lg object-cover" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{order.title} × {order.quantity}</span>
                  <span className="block text-xs text-muted">
                    {order.seller_name} · {STATUS[order.status] ?? order.status} · {shortDate(order.created_at)}
                  </span>
                </span>
                <span className="text-sm font-bold">{money(order.price * order.quantity)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
