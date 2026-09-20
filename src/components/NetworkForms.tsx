"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "./SubmitButton";
import type { ActionState } from "@/lib/actions";
import {
  ADVANCE_MIN, CONSOLIDATED_UNIT_COST, CSV_TEMPLATE_EXAMPLE, REGIONS, SHIPPING_METHODS,
} from "@/lib/constants";
import { money } from "@/lib/format";

type Action = (state: ActionState, form: FormData) => Promise<ActionState>;

function Feedback({ state }: { state: ActionState }) {
  return (
    <>
      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{state.error}</p>}
      {state.ok && <p className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand-darker">{state.ok}</p>}
    </>
  );
}

/* ------------------------------ consolidación ----------------------------- */

export function ConsolidateForm({
  action,
  orders,
}: {
  action: Action;
  orders: { id: string; title: string; region: string; city: string; buyer: string; quantity: number }[];
}) {
  const [state, formAction] = useActionState(action, {});
  const [selected, setSelected] = useState<string[]>([]);
  const [method, setMethod] = useState("comodo");

  const unit = CONSOLIDATED_UNIT_COST[method] ?? 65;
  const individual = SHIPPING_METHODS.find((m) => m.value === method)?.cost[0]?.price ?? unit;
  const saved = Math.max(0, Math.round((individual - unit) * selected.length));

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const byRegion = orders.reduce<Record<string, typeof orders>>((acc, order) => {
    (acc[order.region] ||= []).push(order);
    return acc;
  }, {});

  return (
    <form action={formAction} className="card p-4">
      <Feedback state={state} />
      <h2 className="section-title mt-1">Nuevo envío consolidado</h2>
      <p className="mt-1 text-xs text-muted">
        Junta varios pedidos en una sola recolección y paga tarifa por paquete en vez de guía individual.
      </p>

      <div className="mt-3 space-y-3">
        {Object.entries(byRegion).map(([region, list]) => (
          <div key={region}>
            <p className="mb-1 text-[11px] font-bold text-muted">{region}</p>
            <ul className="divide-y divide-line rounded-lg border border-line">
              {list.map((order) => (
                <li key={order.id}>
                  <label className="flex cursor-pointer items-center gap-3 p-2.5 text-sm hover:bg-canvas">
                    <input
                      type="checkbox"
                      name="order_id"
                      value={order.id}
                      checked={selected.includes(order.id)}
                      onChange={() => toggle(order.id)}
                      className="accent-[#06c755]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{order.title}</span>
                      <span className="block text-xs text-muted">
                        {order.buyer} · {order.quantity} pza · {order.city}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="method">Método de recolección</label>
          <select id="method" name="method" value={method} onChange={(e) => setMethod(e.target.value)} className="input">
            <option value="comodo">Envío Cómodo Mercado (recolección a domicilio)</option>
            <option value="facil">Envío Fácil Mercado (punto de entrega)</option>
            <option value="paqueteria">Paquetería de tu elección</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="pickup_date">Fecha de recolección</label>
          <input id="pickup_date" name="pickup_date" type="date" className="input" />
        </div>
      </div>

      <dl className="mt-3 divide-y divide-line rounded-lg bg-canvas px-3 text-sm">
        <div className="flex justify-between py-2">
          <dt className="text-muted">Pedidos seleccionados</dt>
          <dd className="font-bold">{selected.length}</dd>
        </div>
        <div className="flex justify-between py-2">
          <dt className="text-muted">Costo por paquete consolidado</dt>
          <dd className="font-bold">{money(unit)}</dd>
        </div>
        <div className="flex justify-between py-2">
          <dt className="text-muted">Ahorro estimado</dt>
          <dd className="font-black text-brand-darker">{money(saved)}</dd>
        </div>
      </dl>

      <SubmitButton className="btn-primary mt-3 w-full" disabled={selected.length < 2}>
        Crear envío consolidado
      </SubmitButton>
    </form>
  );
}

/* --------------------------------- importar -------------------------------- */

export function ImportForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, {});
  const [filename, setFilename] = useState("");

  return (
    <form action={formAction} className="card space-y-3 p-4">
      <Feedback state={state} />
      <h2 className="section-title">Importar catálogo (CSV)</h2>
      <p className="text-xs text-muted">
        Columnas: <code>sku, titulo, descripcion, precio, inventario, categoria, marca, talla, color, variantes</code>.
        Las variantes se escriben como <code>Talla M:8|Talla G:4</code>. Los productos se identifican por
        su SKU: si ya existe, se actualiza.
      </p>
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line p-6 text-sm text-muted hover:border-brand">
        <span>📄 {filename || "Selecciona un archivo .csv"}</span>
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e) => setFilename(e.target.files?.[0]?.name ?? "")}
        />
      </label>
      <details className="text-xs text-muted">
        <summary className="cursor-pointer font-bold">O pega el contenido del CSV</summary>
        <textarea name="csv" rows={6} className="input mt-2 resize-none font-mono text-[11px]"
          placeholder={CSV_TEMPLATE_EXAMPLE} />
      </details>
      <div className="flex gap-2">
        <SubmitButton className="btn-primary">Importar</SubmitButton>
        <a href="/api/shop/export?plantilla=1" className="btn-outline">Descargar plantilla</a>
        <a href="/api/shop/export" className="btn-outline">Exportar mi catálogo</a>
      </div>
    </form>
  );
}

/* -------------------------------- colectivo -------------------------------- */

const COLLECTIVE_EMOJIS = ["🏛️", "🛖", "🏪", "🌮", "🧵", "🎨", "🌿", "⚙️"];

export function CollectiveForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, {});
  const [emoji, setEmoji] = useState(COLLECTIVE_EMOJIS[0]);
  return (
    <form action={formAction} className="card space-y-3 p-4">
      <Feedback state={state} />
      <h2 className="section-title">Crear colectivo</h2>
      <p className="text-xs text-muted">
        Un colectivo agrupa tiendas de un mercado, un corredor comercial o una alianza de oficio.
      </p>
      <input type="hidden" name="emoji" value={emoji} />
      <div className="flex flex-wrap gap-1.5">
        {COLLECTIVE_EMOJIS.map((e) => (
          <button key={e} type="button" onClick={() => setEmoji(e)}
            className={`h-10 w-10 rounded-lg border text-lg ${emoji === e ? "border-brand bg-brand-soft" : "border-line bg-white"}`}>
            {e}
          </button>
        ))}
      </div>
      <div>
        <label className="label" htmlFor="name">Nombre *</label>
        <input id="name" name="name" className="input" required placeholder="Ej.: Mercado de Artesanas de Puebla" />
      </div>
      <div>
        <label className="label" htmlFor="region">Estado</label>
        <select id="region" name="region" className="input">
          <option value="">Todo México</option>
          {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="description">Descripción</label>
        <textarea id="description" name="description" rows={3} className="input resize-none"
          placeholder="Quiénes son, qué venden y qué los une." />
      </div>
      <SubmitButton className="btn-primary">Crear colectivo</SubmitButton>
    </form>
  );
}

/* ---------------------------------- paquete -------------------------------- */

export function BundleForm({
  action,
  myItems,
  partnerItems,
}: {
  action: Action;
  myItems: { id: string; title: string; price: number }[];
  partnerItems: { id: string; title: string; price: number; shop: string }[];
}) {
  const [state, formAction] = useActionState(action, {});
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <form action={formAction} className="card space-y-3 p-4">
      <Feedback state={state} />
      <h2 className="section-title">Nuevo paquete cruzado</h2>
      <p className="text-xs text-muted">
        Elige productos tuyos y de otras tiendas. Quien compre cualquiera de ellos recibirá un cupón
        para gastar en los demás negocios del paquete.
      </p>
      <div>
        <label className="label" htmlFor="title">Nombre del paquete *</label>
        <input id="title" name="title" className="input" required placeholder="Ej.: Ritual de café y cerámica" />
      </div>
      <div>
        <label className="label" htmlFor="description">Descripción</label>
        <input id="description" name="description" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="discount">Cupón cruzado (en pesos) *</label>
        <input id="discount" name="discount" defaultValue={100} inputMode="numeric" className="input w-32" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <fieldset>
          <legend className="label">Tus productos</legend>
          <ul className="max-h-56 divide-y divide-line overflow-y-auto rounded-lg border border-line">
            {myItems.map((item) => (
              <li key={item.id}>
                <label className="flex cursor-pointer items-center gap-2 p-2 text-sm hover:bg-canvas">
                  <input type="checkbox" name="item_id" value={item.id} checked={selected.includes(item.id)}
                    onChange={() => toggle(item.id)} className="accent-[#06c755]" />
                  <span className="min-w-0 flex-1 truncate">{item.title}</span>
                  <span className="shrink-0 text-xs text-muted">{money(item.price)}</span>
                </label>
              </li>
            ))}
            {myItems.length === 0 && <li className="p-3 text-xs text-muted">Publica productos primero.</li>}
          </ul>
        </fieldset>
        <fieldset>
          <legend className="label">Productos de tiendas aliadas</legend>
          <ul className="max-h-56 divide-y divide-line overflow-y-auto rounded-lg border border-line">
            {partnerItems.map((item) => (
              <li key={item.id}>
                <label className="flex cursor-pointer items-center gap-2 p-2 text-sm hover:bg-canvas">
                  <input type="checkbox" name="item_id" value={item.id} checked={selected.includes(item.id)}
                    onChange={() => toggle(item.id)} className="accent-[#06c755]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{item.title}</span>
                    <span className="block truncate text-[11px] text-muted">{item.shop}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted">{money(item.price)}</span>
                </label>
              </li>
            ))}
            {partnerItems.length === 0 && (
              <li className="p-3 text-xs text-muted">
                Únete a un colectivo o aprueba socios de mayoreo para ver sus productos.
              </li>
            )}
          </ul>
        </fieldset>
      </div>

      <SubmitButton className="btn-primary" disabled={selected.length < 2}>Crear paquete</SubmitButton>
    </form>
  );
}

/* --------------------------------- adelanto -------------------------------- */

export function AdvanceForm({
  action,
  pending,
  limit,
  apr,
  feeRate,
  horizonDays,
  tierLabel,
  dueDays,
}: {
  action: Action;
  pending: number;
  limit: number;
  apr: number;
  feeRate: number;
  horizonDays: number;
  tierLabel: string;
  dueDays: number;
}) {
  const [state, formAction] = useActionState(action, {});
  const [amount, setAmount] = useState(
    Math.min(limit, Math.max(ADVANCE_MIN, Math.round(limit / 2 / 100) * 100)),
  );
  const fee = Math.round(amount * feeRate);

  return (
    <form action={formAction} className="card space-y-3 p-4">
      <Feedback state={state} />
      <h2 className="section-title">Solicitar adelanto</h2>
      <p className="text-xs text-muted">
        Nivel <b>{tierLabel}</b>: puedes adelantar hasta {money(limit)} de tus {money(pending)} en
        ventas en curso. Tus ventas tardan en promedio {horizonDays} días en cerrarse.
      </p>

      <div>
        <label className="label" htmlFor="amount">Monto (entre {money(ADVANCE_MIN)} y {money(limit)})</label>
        <input
          id="amount"
          name="amount"
          type="range"
          min={ADVANCE_MIN}
          max={Math.max(ADVANCE_MIN, limit)}
          step={100}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-full accent-[#06c755]"
        />
      </div>

      <dl className="divide-y divide-line rounded-lg bg-canvas px-3 text-sm">
        <div className="flex justify-between py-2">
          <dt className="text-muted">Recibes hoy</dt>
          <dd className="font-black text-brand-darker">{money(amount)}</dd>
        </div>
        <div className="flex justify-between py-2">
          <dt className="text-muted">Comisión ({Math.round(feeRate * 100)} % del monto)</dt>
          <dd className="font-bold">{money(fee)}</dd>
        </div>
        <div className="flex justify-between py-2">
          <dt className="text-muted">Total a descontar de tus ventas</dt>
          <dd className="font-bold">{money(amount + fee)}</dd>
        </div>
        <div className="flex justify-between py-2">
          <dt className="text-muted">
            <b>CAT aproximado</b> (costo anual total, sin IVA)
          </dt>
          <dd className="font-black">{apr} %</dd>
        </div>
        <div className="flex justify-between py-2">
          <dt className="text-muted">Plazo máximo</dt>
          <dd className="font-bold">{dueDays} días</dd>
        </div>
      </dl>

      <div className="rounded-lg border border-line bg-white p-3 text-[11px] leading-relaxed text-muted">
        El <b>CAT</b> te permite comparar este adelanto con un crédito bancario: aunque la comisión
        es del {Math.round(feeRate * 100)} %, al cobrarse en un plazo corto equivale a un costo anual
        de <b>{apr} %</b>. Si tus ventas no se completan antes de {dueDays} días, el adelanto se marca
        como vencido y no podrás solicitar otro hasta liquidarlo. Esto no es un producto financiero
        real: es una demostración.
      </div>

      <label className="flex items-start gap-2 text-xs">
        <input type="checkbox" name="acepta_costo" required className="mt-0.5 accent-[#06c755]" />
        <span>
          Entiendo que pagaré {money(fee)} de comisión (CAT aproximado {apr} %) y que el monto se
          descontará automáticamente de mis ventas.
        </span>
      </label>

      <SubmitButton className="btn-primary w-full">Solicitar adelanto</SubmitButton>
    </form>
  );
}

export function AdvanceRequirements({
  checks,
}: {
  checks: { label: string; ok: boolean; detail: string }[];
}) {
  return (
    <ul className="card divide-y divide-line text-sm">
      {checks.map((check) => (
        <li key={check.label} className="flex items-center gap-3 p-3">
          <span aria-hidden className={check.ok ? "text-brand" : "text-muted"}>
            {check.ok ? "✅" : "⬜"}
          </span>
          <span className="min-w-0 flex-1">{check.label}</span>
          <span className="shrink-0 text-xs text-muted">{check.detail}</span>
        </li>
      ))}
    </ul>
  );
}

/* --------------------- publicar producto surtido (reventa) ------------------ */

export function SourcedListingForm({
  action,
  order,
}: {
  action: Action;
  order: { id: string; title: string; cost: number; quantity: number; supplier: string };
}) {
  const [state, formAction] = useActionState(action, {});
  const [price, setPrice] = useState(Math.round(order.cost * 1.6));
  const margin = price - order.cost;
  const marginPct = order.cost ? Math.round((margin / order.cost) * 100) : 0;

  return (
    <form action={formAction} className="mt-2 space-y-2 rounded-lg bg-canvas p-3">
      <input type="hidden" name="order_id" value={order.id} />
      <Feedback state={state} />
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={`title-${order.id}`}>Título en tu tienda</label>
          <input id={`title-${order.id}`} name="title" defaultValue={order.title} className="input py-1.5 text-sm" />
        </div>
        <div className="flex gap-2">
          <div>
            <label className="label" htmlFor={`price-${order.id}`}>Precio de venta</label>
            <input
              id={`price-${order.id}`}
              name="price"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value.replace(/\D/g, "")) || 0)}
              inputMode="numeric"
              className="input w-28 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="label" htmlFor={`stock-${order.id}`}>Piezas</label>
            <input id={`stock-${order.id}`} name="stock" defaultValue={order.quantity} inputMode="numeric"
              className="input w-20 py-1.5 text-sm" />
          </div>
        </div>
      </div>
      <p className="text-[11px] text-muted">
        Costo por pieza {money(order.cost)} · margen {money(margin)} ({marginPct} %) · el crédito de
        elaboración queda para {order.supplier}.
      </p>
      <SubmitButton className="btn-primary px-3 py-1.5 text-xs" disabled={price <= order.cost}>
        Publicar en mi tienda
      </SubmitButton>
    </form>
  );
}
