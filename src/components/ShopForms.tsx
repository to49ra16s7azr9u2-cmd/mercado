"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "./SubmitButton";
import type { ActionState } from "@/lib/actions";
import {
  BUSINESS_TYPES, REGIONS, RETURN_POLICIES, SHOP_CATEGORIES,
} from "@/lib/constants";

type Action = (state: ActionState, form: FormData) => Promise<ActionState>;

const EMOJIS = ["🛍️", "👗", "👟", "💄", "📱", "🎮", "🪑", "🧸", "🌮", "📚", "🐕", "🧵"];

export function ShopForm({
  action,
  shop,
  cta,
}: {
  action: Action;
  cta: string;
  shop?: {
    name: string; description: string; category: string; cover_emoji: string; logo_seed: string;
    business_type: string; legal_name: string; rfc: string; legal_address: string;
    legal_phone: string; legal_email: string; return_policy: string; delivery_note: string;
    ship_from: string;
  };
}) {
  const [state, formAction] = useActionState(action, {});
  const [emoji, setEmoji] = useState(shop?.cover_emoji ?? EMOJIS[0]);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{state.error}</p>
      )}
      {state.ok && (
        <p className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand-darker">{state.ok}</p>
      )}
      <input type="hidden" name="cover_emoji" value={emoji} />
      <input type="hidden" name="logo_seed" value={shop?.logo_seed ?? "3"} />

      <section className="card space-y-4 p-4">
        <h2 className="section-title">Datos de la tienda</h2>
        <div>
          <p className="label">Imagen de la tienda</p>
          <div className="flex flex-wrap gap-1.5">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                className={`h-11 w-11 rounded-xl border text-xl ${
                  emoji === e ? "border-brand bg-brand-soft" : "border-line bg-white"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label" htmlFor="name">Nombre de la tienda *</label>
          <input id="name" name="name" defaultValue={shop?.name} className="input" required
            placeholder="Ej.: Boutique Xanath" />
        </div>
        <div>
          <label className="label" htmlFor="category">Giro *</label>
          <select id="category" name="category" defaultValue={shop?.category ?? ""} className="input" required>
            <option value="">Selecciona…</option>
            {SHOP_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="description">Descripción</label>
          <textarea id="description" name="description" rows={4} maxLength={800}
            defaultValue={shop?.description} className="input resize-none"
            placeholder="Cuenta qué vendes, cómo trabajas y en cuánto tiempo entregas." />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="ship_from">Envíos desde *</label>
            <select id="ship_from" name="ship_from" defaultValue={shop?.ship_from ?? ""} className="input" required>
              <option value="">Selecciona…</option>
              {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="delivery_note">Tiempo de entrega</label>
            <input id="delivery_note" name="delivery_note" defaultValue={shop?.delivery_note}
              className="input" placeholder="De 2 a 5 días hábiles" />
          </div>
        </div>
      </section>

      <section className="card space-y-4 p-4">
        <h2 className="section-title">Información del vendedor</h2>
        <p className="text-xs text-muted">
          Estos datos se publican en tu tienda conforme a la Ley Federal de Protección al Consumidor.
        </p>
        <fieldset>
          <legend className="label">Tipo de vendedor *</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {BUSINESS_TYPES.map((type) => (
              <label key={type.value} className="flex cursor-pointer items-center gap-2 rounded-lg border border-line p-2.5 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand-soft">
                <input type="radio" name="business_type" value={type.value}
                  defaultChecked={(shop?.business_type ?? "persona_fisica") === type.value}
                  className="accent-[#06c755]" />
                {type.label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="legal_name">Nombre o razón social *</label>
            <input id="legal_name" name="legal_name" defaultValue={shop?.legal_name} className="input" required />
          </div>
          <div>
            <label className="label" htmlFor="rfc">RFC *</label>
            <input id="rfc" name="rfc" defaultValue={shop?.rfc} className="input" required
              placeholder="XAXX010101000" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="legal_address">Domicilio fiscal o comercial *</label>
            <input id="legal_address" name="legal_address" defaultValue={shop?.legal_address} className="input" required
              placeholder="Calle, número, colonia, municipio, estado y C.P." />
          </div>
          <div>
            <label className="label" htmlFor="legal_phone">Teléfono de atención (10 dígitos) *</label>
            <input id="legal_phone" name="legal_phone" defaultValue={shop?.legal_phone} className="input"
              inputMode="tel" required placeholder="5512345678" />
          </div>
          <div>
            <label className="label" htmlFor="legal_email">Correo de atención *</label>
            <input id="legal_email" name="legal_email" type="email" defaultValue={shop?.legal_email}
              className="input" required placeholder="contacto@mitienda.mx" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="return_policy">Política de devoluciones</label>
          <select id="return_policy" name="return_policy" defaultValue={shop?.return_policy ?? RETURN_POLICIES[0]} className="input">
            {RETURN_POLICIES.map((policy) => <option key={policy} value={policy}>{policy}</option>)}
          </select>
        </div>
      </section>

      <SubmitButton className="btn-primary btn-lg" pendingText="Guardando…">{cta}</SubmitButton>
    </form>
  );
}

type VariantRow = { label: string; stock: number; sku: string };

export function ShopItemForm({
  action,
  categories,
  brands,
  defaultRegion,
  item,
}: {
  action: Action;
  categories: { id: number; name: string; children: { id: number; name: string; children: { id: number; name: string }[] }[] }[];
  brands: { id: number; name: string }[];
  defaultRegion: string;
  item?: {
    id: string; title: string; description: string; price: number; category_id: number | null;
    brand_id: number | null; size: string; color: string; stock: number;
    shipping_payer: string; shipping_method: string; ship_from: string; ship_days: number;
    images: { id: number; url: string }[];
    variants: VariantRow[];
  };
}) {
  const [state, formAction] = useActionState(action, {});
  const [title, setTitle] = useState(item?.title ?? "");
  const [price, setPrice] = useState(item?.price ? String(item.price) : "");
  const [emoji, setEmoji] = useState("🛍️");
  const [previews, setPreviews] = useState<string[]>([]);
  const [keptImages, setKeptImages] = useState(item?.images ?? []);
  const [useVariants, setUseVariants] = useState((item?.variants.length ?? 0) > 0);
  const [variants, setVariants] = useState<VariantRow[]>(
    item?.variants.length ? item.variants : [{ label: "", stock: 0, sku: "" }],
  );

  const findPath = () => {
    for (const l1 of categories) {
      if (l1.id === item?.category_id) return [l1.id, null, null] as const;
      for (const l2 of l1.children) {
        if (l2.id === item?.category_id) return [l1.id, l2.id, null] as const;
        for (const l3 of l2.children) {
          if (l3.id === item?.category_id) return [l1.id, l2.id, l3.id] as const;
        }
      }
    }
    return [null, null, null] as const;
  };
  const initial = findPath();
  const [l1, setL1] = useState<number | null>(initial[0]);
  const [l2, setL2] = useState<number | null>(initial[1]);
  const [l3, setL3] = useState<number | null>(initial[2]);
  const level2 = categories.find((c) => c.id === l1)?.children ?? [];
  const level3 = level2.find((c) => c.id === l2)?.children ?? [];

  const priceNumber = Number(price) || 0;
  const fee = Math.round(priceNumber * 0.1);
  const totalStock = useVariants
    ? variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0)
    : 0;

  return (
    <form action={formAction} className="space-y-5">
      {item?.id && <input type="hidden" name="id" value={item.id} />}
      <input
        type="hidden"
        name="generated_image"
        value={`/api/photo?seed=${encodeURIComponent((item?.id ?? "nuevo") + title)}&e=${encodeURIComponent(emoji)}&t=${encodeURIComponent(title.slice(0, 32))}`}
      />
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{state.error}</p>
      )}

      <section className="card p-4">
        <h2 className="section-title">Fotos del producto</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {keptImages.map((img) => (
            <div key={img.id} className="relative h-24 w-24 overflow-hidden rounded-lg border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                aria-label="Quitar foto"
                onClick={() => setKeptImages((prev) => prev.filter((p) => p.id !== img.id))}
                className="absolute right-1 top-1 h-6 w-6 rounded-full bg-black/60 text-xs text-white"
              >
                ✕
              </button>
            </div>
          ))}
          {(item?.images ?? [])
            .filter((img) => !keptImages.some((k) => k.id === img.id))
            .map((img) => <input key={img.id} type="hidden" name="remove_image" value={img.id} />)}
          {previews.map((src) => (
            <div key={src} className="h-24 w-24 overflow-hidden rounded-lg border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
            </div>
          ))}
          <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-line text-xs text-muted hover:border-brand">
            <span className="text-xl">＋</span> Agregar
            <input type="file" name="photos" accept="image/*" multiple className="sr-only"
              onChange={(e) => setPreviews(Array.from(e.target.files ?? []).map((f) => URL.createObjectURL(f)))} />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {EMOJIS.map((e) => (
            <button key={e} type="button" onClick={() => setEmoji(e)}
              className={`h-9 w-9 rounded-lg border text-lg ${emoji === e ? "border-brand bg-brand-soft" : "border-line bg-white"}`}>
              {e}
            </button>
          ))}
        </div>
      </section>

      <section className="card space-y-4 p-4">
        <h2 className="section-title">Información del producto</h2>
        <div>
          <label className="label" htmlFor="title">Título *</label>
          <input id="title" name="title" value={title} onChange={(e) => setTitle(e.target.value)}
            maxLength={80} className="input" placeholder="Ej.: Playera de algodón orgánico unisex" />
        </div>
        <div>
          <label className="label" htmlFor="description">Descripción</label>
          <textarea id="description" name="description" rows={5} maxLength={2000}
            defaultValue={item?.description} className="input resize-none"
            placeholder="Materiales, medidas, guía de tallas, cuidados…" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="cat1">Categoría *</label>
            <select id="cat1" className="input" value={l1 ?? ""}
              onChange={(e) => { setL1(Number(e.target.value) || null); setL2(null); setL3(null); }}>
              <option value="">Selecciona…</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="cat2">Subcategoría</label>
            <select id="cat2" className="input" value={l2 ?? ""} disabled={!level2.length}
              onChange={(e) => { setL2(Number(e.target.value) || null); setL3(null); }}>
              <option value="">Selecciona…</option>
              {level2.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="cat3">Tipo</label>
            <select id="cat3" className="input" value={l3 ?? ""} disabled={!level3.length}
              onChange={(e) => setL3(Number(e.target.value) || null)}>
              <option value="">Selecciona…</option>
              {level3.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <input type="hidden" name="category_id" value={l3 ?? l2 ?? l1 ?? ""} />
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="brand_id">Marca</label>
            <select id="brand_id" name="brand_id" defaultValue={item?.brand_id ?? ""} className="input">
              <option value="">Sin marca</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="size">Talla o medida</label>
            <input id="size" name="size" defaultValue={item?.size} className="input" placeholder="Ej.: M / 28 cm" />
          </div>
          <div>
            <label className="label" htmlFor="color">Color</label>
            <input id="color" name="color" defaultValue={item?.color} className="input" />
          </div>
        </div>
      </section>

      <section className="card space-y-4 p-4">
        <h2 className="section-title">Inventario</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={useVariants} onChange={(e) => setUseVariants(e.target.checked)}
            className="accent-[#06c755]" />
          Este producto tiene variantes (talla, color, sabor…)
        </label>

        {useVariants ? (
          <div className="space-y-2">
            {variants.map((variant, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
                <input
                  name="variant_label"
                  value={variant.label}
                  onChange={(e) => setVariants((prev) => prev.map((v, i) => i === index ? { ...v, label: e.target.value } : v))}
                  className="input"
                  placeholder="Variante (ej.: Talla M · Negro)"
                />
                <input
                  name="variant_stock"
                  value={variant.stock}
                  onChange={(e) => setVariants((prev) => prev.map((v, i) => i === index ? { ...v, stock: Number(e.target.value.replace(/\D/g, "")) || 0 } : v))}
                  inputMode="numeric"
                  className="input"
                  placeholder="Piezas"
                />
                <input
                  name="variant_sku"
                  value={variant.sku}
                  onChange={(e) => setVariants((prev) => prev.map((v, i) => i === index ? { ...v, sku: e.target.value } : v))}
                  className="input"
                  placeholder="SKU (opcional)"
                />
                <button
                  type="button"
                  onClick={() => setVariants((prev) => prev.filter((_, i) => i !== index))}
                  className="btn-ghost px-3"
                  aria-label="Quitar variante"
                >
                  ✕
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setVariants((prev) => [...prev, { label: "", stock: 0, sku: "" }])}
              className="btn-outline">
              ＋ Agregar variante
            </button>
            <p className="text-xs text-muted">Inventario total: <span className="font-bold text-ink">{totalStock}</span> piezas</p>
          </div>
        ) : (
          <div className="sm:w-48">
            <label className="label" htmlFor="stock">Piezas disponibles *</label>
            <input id="stock" name="stock" defaultValue={item?.stock ?? 1} inputMode="numeric" className="input" />
          </div>
        )}
      </section>

      <section className="card space-y-4 p-4">
        <h2 className="section-title">Envío</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="shipping_payer">Costo de envío</label>
            <select id="shipping_payer" name="shipping_payer" defaultValue={item?.shipping_payer ?? "seller"} className="input">
              <option value="seller">Envío gratis (lo absorbe la tienda)</option>
              <option value="buyer">Lo paga quien compra</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="shipping_method">Método de envío</label>
            <select id="shipping_method" name="shipping_method" defaultValue={item?.shipping_method ?? "comodo"} className="input">
              <option value="facil">Envío Fácil Mercado</option>
              <option value="comodo">Envío Cómodo Mercado</option>
              <option value="paqueteria">Paquetería de tu elección</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="ship_from">Se envía desde</label>
            <select id="ship_from" name="ship_from" defaultValue={item?.ship_from ?? defaultRegion} className="input">
              {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="ship_days">Plazo de envío</label>
            <select id="ship_days" name="ship_days" defaultValue={item?.ship_days ?? 1} className="input">
              <option value={1}>En 1 o 2 días hábiles</option>
              <option value={2}>En 2 o 3 días hábiles</option>
              <option value={3}>En 4 a 7 días hábiles</option>
            </select>
          </div>
        </div>
      </section>

      <section className="card space-y-3 p-4">
        <h2 className="section-title">Precio</h2>
        <div className="relative sm:w-56">
          <input name="price" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ""))}
            inputMode="numeric" className="input pl-7 text-lg font-bold" placeholder="0" />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted">$</span>
        </div>
        <dl className="divide-y divide-line rounded-lg bg-canvas px-3 text-sm">
          <div className="flex justify-between py-2">
            <dt className="text-muted">Comisión por venta (10 %)</dt>
            <dd className="font-bold">− ${fee}</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-muted">Recibes por pieza</dt>
            <dd className="text-base font-black text-brand-darker">${Math.max(0, priceNumber - fee)}</dd>
          </div>
        </dl>
      </section>

      <div className="sticky bottom-16 z-20 flex gap-2 rounded-xl border border-line bg-white/95 p-3 backdrop-blur md:bottom-2">
        <SubmitButton name="intent" value="draft" formNoValidate className="btn-outline flex-1" pendingText="Guardando…">
          Guardar borrador
        </SubmitButton>
        <SubmitButton name="intent" value="publish" className="btn-primary flex-[2]" pendingText="Publicando…">
          Publicar producto
        </SubmitButton>
      </div>
    </form>
  );
}
