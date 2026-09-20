"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { SubmitButton } from "./SubmitButton";
import type { ActionState } from "@/lib/actions";
import { CASH_FEE, MSI_MIN, MSI_PLANS, PAYMENT_METHODS, REGIONS } from "@/lib/constants";
import { money } from "@/lib/format";

export function CheckoutForm({
  action,
  itemId,
  price,
  shippingCost,
  points,
  balance,
  coupons,
  cards,
  address,
  maxQuantity = 1,
  initialQuantity = 1,
  variant,
}: {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  itemId: string;
  price: number;
  shippingCost: number;
  points: number;
  balance: number;
  coupons: { id: string; title: string; amount: number; min_price: number }[];
  cards: { id: string; brand: string; last4: string; exp: string }[];
  address: {
    name: string; zip: string; region: string; city: string; line: string; phone: string;
  };
  maxQuantity?: number;
  initialQuantity?: number;
  variant?: { id: number; label: string } | null;
}) {
  const [state, formAction] = useActionState(action, {});
  const [usePoints, setUsePoints] = useState(0);
  const [couponId, setCouponId] = useState("");
  const [method, setMethod] = useState(cards.length ? "card" : "spei");
  const [editAddress, setEditAddress] = useState(!address.line);
  const [quantity, setQuantity] = useState(Math.min(initialQuantity, maxQuantity));
  const [msi, setMsi] = useState<number>(3);

  const subtotal = price * quantity;
  const coupon = coupons.find((c) => c.id === couponId);
  const couponAmount = coupon && subtotal >= coupon.min_price ? coupon.amount : 0;
  const cashFee = method === "cash" ? CASH_FEE : 0;
  const gross = subtotal + shippingCost + cashFee;
  const maxPoints = Math.min(points, Math.max(0, gross - couponAmount));
  const appliedPoints = Math.min(usePoints, maxPoints);
  const total = Math.max(0, gross - couponAmount - appliedPoints);

  return (
    <form action={formAction} className="lg:flex lg:gap-6">
      <input type="hidden" name="item_id" value={itemId} />
      <input type="hidden" name="quantity" value={quantity} />
      {variant && <input type="hidden" name="variant_id" value={variant.id} />}
      {method === "msi" && <input type="hidden" name="msi_plan" value={msi} />}
      <div className="min-w-0 flex-1 space-y-4">
        {state.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{state.error}</p>
        )}

        {(maxQuantity > 1 || variant) && (
          <section className="card p-4">
            <h2 className="section-title">Producto</h2>
            <div className="mt-3 flex flex-wrap items-end gap-4">
              {variant && (
                <p className="text-sm">
                  <span className="block text-xs font-bold text-muted">Variante</span>
                  {variant.label}
                </p>
              )}
              <div>
                <label className="label" htmlFor="quantity">Cantidad</label>
                <select
                  id="quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="input w-24"
                >
                  {Array.from({ length: Math.max(1, Math.min(maxQuantity, 10)) }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <p className="pb-2.5 text-xs text-muted">Precio unitario: {money(price)}</p>
            </div>
          </section>
        )}

        <section className="card p-4">
          <div className="flex items-center justify-between">
            <h2 className="section-title">Dirección de envío</h2>
            <button type="button" onClick={() => setEditAddress((v) => !v)} className="text-xs font-bold text-brand-darker">
              {editAddress ? "Usar la guardada" : "Cambiar"}
            </button>
          </div>
          {editAddress ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label" htmlFor="ship_name">Nombre y apellidos *</label>
                <input id="ship_name" name="ship_name" defaultValue={address.name} className="input" required />
              </div>
              <div>
                <label className="label" htmlFor="ship_zip">Código postal *</label>
                <input id="ship_zip" name="ship_zip" defaultValue={address.zip} className="input" inputMode="numeric" required />
              </div>
              <div>
                <label className="label" htmlFor="ship_region">Estado *</label>
                <select id="ship_region" name="ship_region" defaultValue={address.region} className="input" required>
                  <option value="">Selecciona…</option>
                  {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="ship_city">Municipio o alcaldía *</label>
                <input id="ship_city" name="ship_city" defaultValue={address.city} className="input" required />
              </div>
              <div>
                <label className="label" htmlFor="ship_phone">Teléfono</label>
                <input id="ship_phone" name="ship_phone" defaultValue={address.phone} className="input" inputMode="tel" />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="ship_line">Dirección (calle, número, colonia) *</label>
                <input id="ship_line" name="ship_line" defaultValue={address.line} className="input" required />
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded-lg bg-canvas p-3 text-sm">
              <p className="font-bold">{address.name}</p>
              <p className="text-muted">{address.line}</p>
              <p className="text-muted">{address.zip} · {address.city} ({address.region})</p>
              {address.phone && <p className="text-muted">Tel. {address.phone}</p>}
              <input type="hidden" name="ship_name" value={address.name} />
              <input type="hidden" name="ship_zip" value={address.zip} />
              <input type="hidden" name="ship_region" value={address.region} />
              <input type="hidden" name="ship_city" value={address.city} />
              <input type="hidden" name="ship_line" value={address.line} />
              <input type="hidden" name="ship_phone" value={address.phone} />
            </div>
          )}
          <p className="mt-2 text-[11px] text-muted">
            🔒 Con los envíos de Mercado tu dirección permanece oculta para la otra persona.
          </p>
        </section>

        <section className="card p-4">
          <h2 className="section-title">Método de pago</h2>
          <div className="mt-3 space-y-2">
            {PAYMENT_METHODS.map((p) => {
              const disabled =
                ((p.value === "card" || p.value === "msi") && cards.length === 0) ||
                (p.value === "msi" && gross < MSI_MIN) ||
                (p.value === "balance" && balance < total);
              return (
                <label
                  key={p.value}
                  className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${
                    method === p.value ? "border-brand bg-brand-soft" : "border-line"
                  } ${disabled ? "opacity-50" : ""}`}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value={p.value}
                    checked={method === p.value}
                    disabled={disabled}
                    onChange={() => setMethod(p.value)}
                    className="mt-0.5 accent-[#06c755]"
                  />
                  <span className="min-w-0">
                    <span className="block font-bold">{p.label}</span>
                    <span className="block text-[11px] text-muted">
                      {(p.value === "card" || p.value === "msi") && cards.length > 0
                        ? `${cards[0].brand} ···· ${cards[0].last4} (vence ${cards[0].exp})`
                        : p.value === "balance"
                          ? `Saldo disponible: ${money(balance)} · ${points} puntos`
                          : p.hint}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          {method === "msi" && (
            <div className="mt-3 rounded-lg bg-canvas p-3">
              <p className="label">Plan de meses sin intereses</p>
              <div className="flex flex-wrap gap-2">
                {MSI_PLANS.map((plan) => (
                  <button
                    key={plan}
                    type="button"
                    onClick={() => setMsi(plan)}
                    className={`rounded-lg border px-3 py-2 text-xs font-bold ${
                      msi === plan ? "border-brand bg-brand-soft text-brand-darker" : "border-line bg-white"
                    }`}
                  >
                    {plan} MSI · {money(Math.round(total / plan))}/mes
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-muted">
                Aplica en compras desde {money(MSI_MIN)} con tarjetas participantes.
              </p>
            </div>
          )}
          {cards.length === 0 && (
            <p className="mt-2 text-xs text-muted">
              <Link href="/mypage/payment" className="link font-bold">Agrega una tarjeta</Link> para pagar con tarjeta o MSI.
            </p>
          )}
        </section>

        <section className="card p-4">
          <h2 className="section-title">Puntos y cupones</h2>
          <div className="mt-3 space-y-3">
            <div>
              <label className="label" htmlFor="points_used">
                Usar puntos (tienes {points}; máximo aplicable {maxPoints})
              </label>
              <div className="flex gap-2">
                <input
                  id="points_used"
                  name="points_used"
                  type="number"
                  min={0}
                  max={maxPoints}
                  value={usePoints}
                  onChange={(e) => setUsePoints(Math.max(0, Math.min(maxPoints, Number(e.target.value) || 0)))}
                  className="input"
                />
                <button type="button" onClick={() => setUsePoints(maxPoints)} className="btn-outline whitespace-nowrap">
                  Usar todos
                </button>
              </div>
            </div>
            <div>
              <label className="label" htmlFor="coupon_id">Cupón</label>
              <select
                id="coupon_id"
                name="coupon_id"
                value={couponId}
                onChange={(e) => setCouponId(e.target.value)}
                className="input"
              >
                <option value="">No usar ningún cupón</option>
                {coupons.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} (desde {money(c.min_price)})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>
      </div>

      <aside className="mt-4 lg:mt-0 lg:w-80 lg:shrink-0">
        <div className="card sticky top-28 p-4">
          <h2 className="section-title">Resumen del pedido</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">
                Producto{quantity > 1 ? ` × ${quantity}` : ""}
              </dt>
              <dd>{money(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Costo de envío</dt>
              <dd>{shippingCost ? money(shippingCost) : "Gratis"}</dd>
            </div>
            {cashFee > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted">Comisión por pago en efectivo</dt>
                <dd>{money(cashFee)}</dd>
              </div>
            )}
            {couponAmount > 0 && (
              <div className="flex justify-between text-brand-darker">
                <dt>Cupón</dt>
                <dd>− {money(couponAmount)}</dd>
              </div>
            )}
            {appliedPoints > 0 && (
              <div className="flex justify-between text-brand-darker">
                <dt>Puntos</dt>
                <dd>− {money(appliedPoints)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-line pt-2 text-base font-black">
              <dt>Total a pagar</dt>
              <dd>{money(total)}</dd>
            </div>
          </dl>
          <SubmitButton className="btn-primary btn-lg mt-4" pendingText="Procesando el pago…">
            Confirmar la compra
          </SubmitButton>
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            Al confirmar aceptas los <Link href="/legal/terminos" className="link">términos de uso</Link>. El dinero
            queda retenido por Mercado y solo se abona a quien vende cuando confirmas que has recibido el artículo.
          </p>
        </div>
      </aside>
    </form>
  );
}
