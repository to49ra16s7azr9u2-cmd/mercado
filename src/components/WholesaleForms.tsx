"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "./SubmitButton";
import type { ActionState } from "@/lib/actions";
import { B2B_MIN_QTY } from "@/lib/constants";
import { money } from "@/lib/format";

type Action = (state: ActionState, form: FormData) => Promise<ActionState>;

export function PartnerRequestForm({
  action,
  supplierShopId,
  supplierName,
}: {
  action: Action;
  supplierShopId: string;
  supplierName: string;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="card space-y-3 p-4">
      <input type="hidden" name="supplier_shop_id" value={supplierShopId} />
      <h2 className="section-title">Solicitar acceso a mayoreo</h2>
      <p className="text-xs text-muted">
        {supplierName} revisará tu tienda antes de mostrarte sus precios por volumen.
      </p>
      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state.ok && <p className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand-darker">{state.ok}</p>}
      <textarea
        name="note"
        rows={3}
        maxLength={400}
        className="input resize-none"
        placeholder="Cuéntales qué vendes, dónde estás y qué volumen manejas."
      />
      <SubmitButton className="btn-primary w-full">Enviar solicitud</SubmitButton>
    </form>
  );
}

export function B2bPriceForm({
  action,
  itemId,
  retailPrice,
  tiers,
}: {
  action: Action;
  itemId: string;
  retailPrice: number;
  tiers: { min_qty: number; price: number }[];
}) {
  const [state, formAction] = useActionState(action, {});
  const [rows, setRows] = useState(
    tiers.length ? tiers.map((t) => ({ qty: String(t.min_qty), price: String(t.price) })) : [{ qty: "", price: "" }],
  );

  return (
    <form action={formAction} className="mt-2 space-y-2 rounded-lg bg-canvas p-3">
      <input type="hidden" name="item_id" value={itemId} />
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state.ok && <p className="text-xs text-brand-darker">{state.ok}</p>}
      {rows.map((row, index) => {
        const price = Number(row.price) || 0;
        const off = price && retailPrice ? Math.round((1 - price / retailPrice) * 100) : 0;
        return (
          <div key={index} className="flex items-center gap-2">
            <span className="text-xs text-muted">Desde</span>
            <input
              name="tier_qty"
              value={row.qty}
              onChange={(e) => setRows((prev) => prev.map((r, i) => i === index ? { ...r, qty: e.target.value.replace(/\D/g, "") } : r))}
              inputMode="numeric"
              className="input w-20 py-1.5 text-sm"
              placeholder={String(B2B_MIN_QTY)}
            />
            <span className="text-xs text-muted">pza a</span>
            <input
              name="tier_price"
              value={row.price}
              onChange={(e) => setRows((prev) => prev.map((r, i) => i === index ? { ...r, price: e.target.value.replace(/\D/g, "") } : r))}
              inputMode="numeric"
              className="input w-24 py-1.5 text-sm"
              placeholder="$"
            />
            <span className="text-xs text-muted">{off > 0 ? `−${off} %` : ""}</span>
            <button
              type="button"
              onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
              className="btn-ghost px-2 py-1 text-xs"
              aria-label="Quitar escalón"
            >
              ✕
            </button>
          </div>
        );
      })}
      <div className="flex gap-2">
        <button type="button" onClick={() => setRows((prev) => [...prev, { qty: "", price: "" }])} className="btn-outline px-3 py-1.5 text-xs">
          ＋ Escalón
        </button>
        <SubmitButton className="btn-primary px-3 py-1.5 text-xs">Guardar mayoreo</SubmitButton>
      </div>
    </form>
  );
}

export function WholesaleOrderForm({
  action,
  itemId,
  title,
  stock,
  tiers,
  balance,
  hasCard,
}: {
  action: Action;
  itemId: string;
  title: string;
  stock: number;
  tiers: { min_qty: number; price: number }[];
  balance: number;
  hasCard: boolean;
}) {
  const [state, formAction] = useActionState(action, {});
  const minQty = tiers.length ? tiers[0].min_qty : 1;
  const [quantity, setQuantity] = useState(minQty);
  const [method, setMethod] = useState(balance > 0 ? "balance" : "card");

  const tier = [...tiers].reverse().find((t) => t.min_qty <= quantity);
  const unit = tier?.price ?? 0;
  const total = unit * quantity;

  return (
    <form action={formAction} className="card space-y-3 p-4">
      <input type="hidden" name="item_id" value={itemId} />
      <h3 className="text-sm font-bold">Pedido de mayoreo · {title}</h3>
      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="label" htmlFor={`qty-${itemId}`}>Piezas (mínimo {minQty})</label>
          <input
            id={`qty-${itemId}`}
            name="quantity"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Math.min(stock, Number(e.target.value.replace(/\D/g, "")) || 0)))}
            inputMode="numeric"
            className="input w-28"
          />
        </div>
        <div>
          <label className="label" htmlFor={`pay-${itemId}`}>Pago</label>
          <select
            id={`pay-${itemId}`}
            name="payment_method"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="input w-48"
          >
            <option value="balance">Saldo de Mercado ({money(balance)})</option>
            <option value="card" disabled={!hasCard}>Tarjeta{hasCard ? "" : " (agrega una)"}</option>
            <option value="spei">Transferencia SPEI</option>
          </select>
        </div>
        <p className="pb-2.5 text-xs text-muted">
          {tier ? (
            <>
              Precio unitario <span className="font-bold text-ink">{money(unit)}</span> · Total{" "}
              <span className="font-bold text-ink">{money(total)}</span>
            </>
          ) : (
            `El pedido mínimo es de ${minQty} piezas`
          )}
        </p>
      </div>
      <p className="text-[11px] text-muted">
        Inventario disponible: {stock} piezas · Comisión de Mercado en mayoreo: 5 % (la paga quien vende).
      </p>
      <SubmitButton className="btn-primary" disabled={!tier || quantity > stock}>
        Hacer pedido de mayoreo
      </SubmitButton>
    </form>
  );
}
