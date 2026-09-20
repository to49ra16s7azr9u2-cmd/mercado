"use client";

import { useActionState, useMemo, useState } from "react";
import { SubmitButton } from "./SubmitButton";
import type { ActionState } from "@/lib/actions";
import {
  CONDITIONS, FEE_RATE, REGIONS, SHIPPING_METHODS, SHIPPING_PAYERS, SHIP_DAYS, SIZES,
} from "@/lib/constants";

export type CatNode = { id: number; name: string; children: CatNode[] };

export type ItemDraft = {
  id: string;
  title: string;
  description: string;
  price: number;
  category_id: number | null;
  brand_id: number | null;
  size: string;
  color: string;
  condition: number;
  shipping_payer: string;
  shipping_method: string;
  ship_from: string;
  ship_days: number;
  offers_enabled: number;
  images: { id: number; url: string }[];
};

const EMOJIS = ["👕", "👗", "👟", "👜", "📱", "💻", "🎮", "📚", "🪑", "🧸", "⚽", "💄", "🎸", "📦"];

export function SellForm({
  action,
  categories,
  brands,
  item,
  defaultRegion,
}: {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  categories: CatNode[];
  brands: { id: number; name: string }[];
  item?: ItemDraft;
  defaultRegion?: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const [previews, setPreviews] = useState<string[]>([]);
  const [keptImages, setKeptImages] = useState(item?.images ?? []);
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [price, setPrice] = useState(item?.price ? String(item.price) : "");
  const [title, setTitle] = useState(item?.title ?? "");

  const initialPath = useMemo(() => {
    const path: number[] = [];
    const walk = (nodes: CatNode[], trail: number[]): boolean => {
      for (const node of nodes) {
        const next = [...trail, node.id];
        if (node.id === item?.category_id) {
          path.push(...next);
          return true;
        }
        if (node.children.length && walk(node.children, next)) return true;
      }
      return false;
    };
    if (item?.category_id) walk(categories, []);
    return path;
  }, [categories, item?.category_id]);

  const [l1, setL1] = useState<number | null>(initialPath[0] ?? null);
  const [l2, setL2] = useState<number | null>(initialPath[1] ?? null);
  const [l3, setL3] = useState<number | null>(initialPath[2] ?? null);

  const level2 = categories.find((c) => c.id === l1)?.children ?? [];
  const level3 = level2.find((c) => c.id === l2)?.children ?? [];
  const categoryId = l3 ?? l2 ?? l1 ?? "";

  const priceNumber = Number(price) || 0;
  const fee = Math.round(priceNumber * FEE_RATE);
  const payout = Math.max(0, priceNumber - fee);

  return (
    <form action={formAction} className="space-y-6">
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
        <h2 className="section-title">Fotos <span className="text-xs font-normal text-muted">(hasta 10)</span></h2>
        <p className="mt-1 text-xs text-muted">
          La primera foto será la principal. Usa luz natural y enseña las etiquetas y los defectos.
        </p>
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
            .map((img) => (
              <input key={img.id} type="hidden" name="remove_image" value={img.id} />
            ))}
          {previews.map((src) => (
            <div key={src} className="h-24 w-24 overflow-hidden rounded-lg border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
            </div>
          ))}
          <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-line text-xs text-muted hover:border-brand hover:text-brand-darker">
            <span className="text-xl">＋</span> Agregar
            <input
              type="file"
              name="photos"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                setPreviews(files.map((f) => URL.createObjectURL(f)));
              }}
            />
          </label>
        </div>
        <div className="mt-3 rounded-lg bg-canvas p-3">
          <p className="text-xs font-bold text-muted">¿Sin fotos a mano? Elige un icono provisional</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                className={`h-9 w-9 rounded-lg border text-lg ${emoji === e ? "border-brand bg-brand-soft" : "border-line bg-white"}`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="card space-y-4 p-4">
        <h2 className="section-title">Detalles del artículo</h2>
        <div>
          <label className="label" htmlFor="title">Título *</label>
          <input
            id="title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            className="input"
            placeholder="Ej.: Vaqueros Levi's 501 talla 40 azul oscuro"
          />
          <p className="mt-1 text-right text-[11px] text-muted">{title.length}/80</p>
        </div>
        <div>
          <label className="label" htmlFor="description">Descripción</label>
          <textarea
            id="description"
            name="description"
            rows={6}
            maxLength={2000}
            defaultValue={item?.description}
            className="input resize-none"
            placeholder={"Cuenta el estado, las medidas, el motivo de la venta…\n\nEj.: Los usé dos veranos, están impecables. Medidas: cintura 40 cm, largo 100 cm."}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="cat1">Categoría *</label>
            <select
              id="cat1"
              className="input"
              value={l1 ?? ""}
              onChange={(e) => { setL1(Number(e.target.value) || null); setL2(null); setL3(null); }}
            >
              <option value="">Selecciona…</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="cat2">Subcategoría</label>
            <select
              id="cat2"
              className="input"
              value={l2 ?? ""}
              disabled={!level2.length}
              onChange={(e) => { setL2(Number(e.target.value) || null); setL3(null); }}
            >
              <option value="">Selecciona…</option>
              {level2.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="cat3">Tipo</label>
            <select
              id="cat3"
              className="input"
              value={l3 ?? ""}
              disabled={!level3.length}
              onChange={(e) => setL3(Number(e.target.value) || null)}
            >
              <option value="">Selecciona…</option>
              {level3.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <input type="hidden" name="category_id" value={categoryId} />

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="brand_id">Marca</label>
            <select id="brand_id" name="brand_id" defaultValue={item?.brand_id ?? ""} className="input">
              <option value="">Sin marca</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="size">Talla</label>
            <select id="size" name="size" defaultValue={item?.size ?? ""} className="input">
              <option value="">Sin talla</option>
              {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="color">Color</label>
            <input id="color" name="color" defaultValue={item?.color} className="input" placeholder="Ej.: Azul marino" />
          </div>
        </div>

        <fieldset>
          <legend className="label">Estado del artículo *</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {CONDITIONS.map((c) => (
              <label key={c.value} className="flex cursor-pointer items-start gap-2 rounded-lg border border-line p-2.5 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand-soft">
                <input
                  type="radio"
                  name="condition"
                  value={c.value}
                  defaultChecked={(item?.condition ?? 1) === c.value}
                  className="mt-0.5 accent-[#06c755]"
                />
                <span>
                  <span className="block font-bold">{c.label}</span>
                  <span className="block text-[11px] text-muted">{c.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="card space-y-4 p-4">
        <h2 className="section-title">Envío</h2>
        <fieldset>
          <legend className="label">¿Quién paga el envío? *</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {SHIPPING_PAYERS.map((s) => (
              <label key={s.value} className="flex cursor-pointer items-center gap-2 rounded-lg border border-line p-2.5 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand-soft">
                <input
                  type="radio"
                  name="shipping_payer"
                  value={s.value}
                  defaultChecked={(item?.shipping_payer ?? "seller") === s.value}
                  className="accent-[#06c755]"
                />
                {s.label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="shipping_method">Método de envío</label>
            <select id="shipping_method" name="shipping_method" defaultValue={item?.shipping_method ?? "facil"} className="input">
              {SHIPPING_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="ship_from">Se envía desde</label>
            <select id="ship_from" name="ship_from" defaultValue={item?.ship_from ?? defaultRegion ?? ""} className="input">
              <option value="">Selecciona…</option>
              {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="ship_days">Plazo de envío</label>
            <select id="ship_days" name="ship_days" defaultValue={item?.ship_days ?? 1} className="input">
              {SHIP_DAYS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
        </div>
      </section>

      <section className="card space-y-4 p-4">
        <h2 className="section-title">Precio</h2>
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <input
              name="price"
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ""))}
              inputMode="numeric"
              className="input pl-7 text-lg font-bold"
              placeholder="0"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted">$</span>
          </div>
        </div>
        <dl className="divide-y divide-line rounded-lg bg-canvas px-3 text-sm">
          <div className="flex justify-between py-2">
            <dt className="text-muted">Comisión de venta (10 %)</dt>
            <dd className="font-bold">− ${fee}</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-muted">Recibirás</dt>
            <dd className="text-base font-black text-brand-darker">${payout}</dd>
          </div>
        </dl>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="offers_enabled"
            defaultChecked={(item?.offers_enabled ?? 1) === 1}
            className="accent-[#06c755]"
          />
          Aceptar ofertas de quien compra
        </label>
      </section>

      <div className="sticky bottom-16 z-20 flex gap-2 rounded-xl border border-line bg-white/95 p-3 backdrop-blur md:bottom-2">
        <SubmitButton name="intent" value="draft" formNoValidate className="btn-outline flex-1" pendingText="Guardando…">
          Guardar borrador
        </SubmitButton>
        <SubmitButton name="intent" value="publish" className="btn-primary flex-[2]" pendingText="Publicando…">
          Publicar artículo
        </SubmitButton>
      </div>
    </form>
  );
}
