import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { itemById, orderById, orderMessages, orderReviews, userById } from "@/lib/queries";
import {
  cancelOrderAction, confirmReceiptAction, rateBuyerAction, sendMessageAction, shipOrderAction,
} from "@/lib/actions";
import { MessageForm, RatingForm } from "@/components/TransactionForms";
import { Avatar } from "@/components/Avatar";
import { SubmitButton } from "@/components/SubmitButton";
import { ORDER_STEPS, paymentLabel, shippingLabel } from "@/lib/constants";
import { longDate, money, timeAgo } from "@/lib/format";

export const metadata = { title: "Detalle de la transacción" };

const SCORE_LABEL: Record<string, string> = { good: "😊 Buena", normal: "😐 Normal", bad: "😞 Mala" };

export default async function TransactionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const { id } = await params;
  const { new: isNew } = await searchParams;
  const user = await currentUser();
  if (!user) redirect(`/login?next=/transaction/${id}`);
  const order = orderById(id);
  if (!order) notFound();
  if (order.buyer_id !== user.id && order.seller_id !== user.id) redirect("/mypage");

  const isBuyer = order.buyer_id === user.id;
  const other = userById(isBuyer ? order.seller_id : order.buyer_id)!;
  const item = itemById(order.item_id);
  const messages = orderMessages(order.id);
  const reviews = orderReviews(order.id);
  const myReview = reviews.find((r) => r.rater_id === user.id);
  const theirReview = reviews.find((r) => r.ratee_id === user.id);
  const cancelled = order.status === "cancelled";
  const stepIndex = ORDER_STEPS.findIndex((s) => s.value === order.status);

  return (
    <div className="mx-auto max-w-3xl">
      {isNew && (
        <p className="mb-3 rounded-lg bg-brand-soft px-4 py-3 text-sm font-bold text-brand-darker">
          ✅ ¡Compra confirmada! Habla con quien vende desde esta misma pantalla.
        </p>
      )}
      <nav className="mb-2 text-xs text-muted">
        <Link href="/mypage" className="link">Mi cuenta</Link> /{" "}
        <Link href={isBuyer ? "/mypage/purchases" : "/mypage/sales"} className="link">
          {isBuyer ? "Mis compras" : "Mis ventas"}
        </Link>
      </nav>
      <h1 className="text-xl font-bold">
        {isBuyer ? "Compra" : "Venta"} · {order.title}
        {order.shop_id && (
          <span className="ml-2 rounded bg-brand-soft px-1.5 py-0.5 align-middle text-[11px] font-bold text-brand-darker">
            Shops
          </span>
        )}
      </h1>

      <ol className="card mt-4 flex overflow-hidden text-center text-[11px]">
        {ORDER_STEPS.map((step, i) => {
          const done = !cancelled && i <= stepIndex;
          return (
            <li key={step.value} className={`flex-1 border-r border-line px-2 py-3 last:border-r-0 ${done ? "bg-brand-soft" : ""}`}>
              <span className={`mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                done ? "bg-brand text-white" : "bg-canvas text-muted"
              }`}>
                {i + 1}
              </span>
              <span className={done ? "font-bold text-brand-darker" : "text-muted"}>{step.label}</span>
            </li>
          );
        })}
      </ol>
      {cancelled && (
        <p className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          Esta transacción se ha cancelado y el monto se ha devuelto.
        </p>
      )}

      <div className="card mt-4 flex gap-3 p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={order.image ?? ""} alt="" className="h-20 w-20 rounded-lg object-cover" />
        <div className="min-w-0 flex-1">
          <Link href={`/item/${order.item_id}`} className="line-clamp-2 text-sm font-bold hover:underline">
            {order.title}
          </Link>
          <p className="mt-1 text-xs text-muted">
            {order.quantity > 1 ? `${order.quantity} piezas · ` : ""}
            {order.variant_label ? `${order.variant_label} · ` : ""}
            Pedido {order.id} · {longDate(order.created_at)}
          </p>
          {order.tracking && (
            <p className="mt-1 text-xs text-muted">
              Seguimiento: <span className="font-bold text-ink">{order.tracking}</span> ·{" "}
              {shippingLabel(item?.shipping_method ?? "")}
            </p>
          )}
        </div>
        <p className="text-base font-black">{money(order.price * order.quantity)}</p>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <section className="card p-4">
          <h2 className="section-title">{isBuyer ? "Resumen del pago" : "Resumen del cobro"}</h2>
          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Precio{order.quantity > 1 ? ` × ${order.quantity}` : ""}</dt>
              <dd>{money(order.price * order.quantity)}</dd>
            </div>
            <div className="flex justify-between"><dt className="text-muted">Envío</dt><dd>{order.shipping_cost ? money(order.shipping_cost) : "Gratis"}</dd></div>
            {isBuyer ? (
              <>
                {order.coupon_amount > 0 && (
                  <div className="flex justify-between text-brand-darker"><dt>Cupón</dt><dd>− {money(order.coupon_amount)}</dd></div>
                )}
                {order.points_used > 0 && (
                  <div className="flex justify-between text-brand-darker"><dt>Puntos</dt><dd>− {money(order.points_used)}</dd></div>
                )}
                <div className="flex justify-between border-t border-line pt-1.5 font-bold">
                  <dt>Total pagado</dt><dd>{money(order.charged)}</dd>
                </div>
                <div className="flex justify-between text-xs text-muted">
                  <dt>Método</dt><dd>{paymentLabel(order.payment_method)}</dd>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between"><dt className="text-muted">Comisión (10 %)</dt><dd>− {money(order.fee)}</dd></div>
                <div className="flex justify-between border-t border-line pt-1.5 font-bold">
                  <dt>Recibirás</dt><dd className="text-brand-darker">{money(order.payout)}</dd>
                </div>
                <p className="text-[11px] text-muted">
                  El monto se agrega a tu saldo cuando la transacción se completa.
                </p>
              </>
            )}
          </dl>
        </section>

        <section className="card p-4">
          <h2 className="section-title">{isBuyer ? "Tu dirección de envío" : "Dirección de entrega"}</h2>
          <div className="mt-3 text-sm">
            <p className="font-bold">{order.ship_name}</p>
            <p className="text-muted">{order.ship_line}</p>
            <p className="text-muted">{order.ship_zip} · {order.ship_city} ({order.ship_region})</p>
            {order.ship_phone && <p className="text-muted">Tel. {order.ship_phone}</p>}
          </div>
          <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
            <Avatar seed={other.avatar_seed} name={other.name} size={32} />
            <div className="min-w-0">
              <Link href={`/user/${other.handle}`} className="block truncate text-sm font-bold hover:underline">
                {other.name}
              </Link>
              <p className="text-[11px] text-muted">{isBuyer ? "Vendedor/a" : "Comprador/a"}</p>
            </div>
          </div>
        </section>
      </div>

      {!cancelled && (
        <div className="mt-4 space-y-4">
          {!isBuyer && order.status === "paid" && (
            <form action={shipOrderAction} className="card p-4">
              <input type="hidden" name="order_id" value={order.id} />
              <h2 className="section-title">Registrar el envío</h2>
              <p className="mt-1 text-xs text-muted">
                Envía el paquete y anota aquí el número de seguimiento. Si lo dejas en blanco generaremos uno.
              </p>
              <div className="mt-3 flex gap-2">
                <input name="tracking" className="input" placeholder="Nº de seguimiento (opcional)" />
                <SubmitButton className="btn-primary whitespace-nowrap">Marcar como enviado</SubmitButton>
              </div>
            </form>
          )}

          {isBuyer && order.status === "paid" && (
            <p className="card p-4 text-sm text-muted">
              Quien vende está preparando tu pedido. Te avisaremos en cuanto lo envíe.
            </p>
          )}

          {isBuyer && order.status === "shipped" && (
            <RatingForm
              action={confirmReceiptAction}
              orderId={order.id}
              title="Confirma la recepción y valora"
              cta="Confirmar recepción y enviar calificación"
            />
          )}

          {!isBuyer && order.status === "shipped" && (
            <p className="card p-4 text-sm text-muted">
              Paquete enviado. Cuando confirmen la recepción podrás calificar y recibirás el monto.
            </p>
          )}

          {!isBuyer && order.status === "received" && (
            <RatingForm
              action={rateBuyerAction}
              orderId={order.id}
              title="Califica a quien te ha comprado"
              cta="Enviar calificación y finalizar"
            />
          )}

          {isBuyer && order.status === "received" && (
            <p className="card p-4 text-sm text-muted">
              ¡Gracias! Falta que quien vende envíe su calificación para cerrar la transacción.
            </p>
          )}

          {order.status === "paid" && (
            <form action={cancelOrderAction}>
              <input type="hidden" name="order_id" value={order.id} />
              <SubmitButton className="btn-danger w-full">Solicitar la cancelación</SubmitButton>
            </form>
          )}
        </div>
      )}

      {(myReview || theirReview) && (
        <section className="card mt-4 p-4">
          <h2 className="section-title">Calificaciones</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {theirReview && (
              <li className="rounded-lg bg-canvas p-3">
                <p className="text-xs text-muted">{other.name} te ha calificado</p>
                <p className="mt-1 font-bold">{SCORE_LABEL[theirReview.score]}</p>
                {theirReview.body && <p className="mt-1 text-muted">{theirReview.body}</p>}
              </li>
            )}
            {myReview && (
              <li className="rounded-lg bg-canvas p-3">
                <p className="text-xs text-muted">Tu calificación</p>
                <p className="mt-1 font-bold">{SCORE_LABEL[myReview.score]}</p>
                {myReview.body && <p className="mt-1 text-muted">{myReview.body}</p>}
              </li>
            )}
          </ul>
        </section>
      )}

      <section className="card mt-4 p-4">
        <h2 className="section-title">Mensajes de la transacción</h2>
        <p className="mt-1 text-[11px] text-muted">
          Solo os veis tú y la otra persona. No compartas datos bancarios ni contactos externos.
        </p>
        <ul className="mt-4 space-y-3">
          {messages.map((message) => {
            const mine = message.user_id === user.id;
            return (
              <li key={message.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                <Avatar seed={message.avatar_seed} name={message.name} size={32} />
                <div className={`max-w-[75%] ${mine ? "text-right" : ""}`}>
                  <p className={`inline-block whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                    mine ? "bg-brand text-white" : "bg-canvas text-ink"
                  }`}>
                    {message.body}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted">{timeAgo(message.created_at)}</p>
                </div>
              </li>
            );
          })}
        </ul>
        {!cancelled && <MessageForm action={sendMessageAction} orderId={order.id} />}
      </section>
    </div>
  );
}
