"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { SubmitButton } from "./SubmitButton";
import type { ActionState } from "@/lib/actions";
import { PAYMENT_METHODS, REGIONS } from "@/lib/constants";
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
}) {
  const [state, formAction] = useActionState(action, {});
  const [usePoints, setUsePoints] = useState(0);
  const [couponId, setCouponId] = useState("");
  const [method, setMethod] = useState(cards.length ? "card" : "bizum");
  const [editAddress, setEditAddress] = useState(!address.line);

  const coupon = coupons.find((c) => c.id === couponId);
  const couponAmount = coupon && price >= coupon.min_price ? coupon.amount : 0;
  const gross = price + shippingCost;
  const maxPoints = Math.min(points, Math.max(0, gross - couponAmount));
  const appliedPoints = Math.min(usePoints, maxPoints);
  const total = Math.max(0, gross - couponAmount - appliedPoints);

  return (
    <form action={formAction} className="lg:flex lg:gap-6">
      <input type="hidden" name="item_id" value={itemId} />
      <div className="min-w-0 flex-1 space-y-4">
        {state.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{state.error}</p>
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
                <label className="label" htmlFor="ship_region">Provincia / comunidad *</label>
                <select id="ship_region" name="ship_region" defaultValue={address.region} className="input" required>
                  <option value="">Selecciona…</option>
                  {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="ship_city">Localidad *</label>
                <input id="ship_city" name="ship_city" defaultValue={address.city} className="input" required />
              </div>
              <div>
                <label className="label" htmlFor="ship_phone">Teléfono</label>
                <input id="ship_phone" name="ship_phone" defaultValue={address.phone} className="input" inputMode="tel" />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="ship_line">Dirección (calle, número, piso) *</label>
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
                (p.value === "card" && cards.length === 0) ||
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
                      {p.value === "card" && cards.length > 0
                        ? `${cards[0].brand} ···· ${cards[0].last4} (cad. ${cards[0].exp})`
                        : p.value === "balance"
                          ? `Saldo disponible: ${money(balance)}`
                          : p.hint}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          {cards.length === 0 && (
            <p className="mt-2 text-xs text-muted">
              <Link href="/mypage/payment" className="link font-bold">Añade una tarjeta</Link> para pagar con tarjeta.
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
                    {c.title} (desde {c.min_price} €)
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
              <dt className="text-muted">Artículo</dt>
              <dd>{money(price)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Gastos de envío</dt>
              <dd>{shippingCost ? money(shippingCost) : "Gratis"}</dd>
            </div>
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
