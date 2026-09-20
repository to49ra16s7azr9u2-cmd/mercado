"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { money } from "@/lib/format";

export function BuyPanel({
  itemId,
  price,
  stock,
  variants,
}: {
  itemId: string;
  price: number;
  stock: number;
  variants: { id: number; label: string; stock: number }[];
}) {
  const router = useRouter();
  const [variantId, setVariantId] = useState<number | null>(
    variants.find((v) => v.stock > 0)?.id ?? null,
  );
  const [quantity, setQuantity] = useState(1);

  const variant = variants.find((v) => v.id === variantId);
  const available = variants.length ? (variant?.stock ?? 0) : stock;
  const limit = Math.min(available, 10);
  const soldOut = available <= 0;

  function go() {
    const params = new URLSearchParams({ qty: String(quantity) });
    if (variant) params.set("variant", String(variant.id));
    router.push(`/checkout/${itemId}?${params.toString()}`);
  }

  return (
    <div className="space-y-3">
      {variants.length > 0 && (
        <div>
          <p className="label">Variante</p>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button
                key={v.id}
                type="button"
                disabled={v.stock <= 0}
                onClick={() => { setVariantId(v.id); setQuantity(1); }}
                className={`rounded-lg border px-3 py-2 text-sm font-bold ${
                  v.id === variantId ? "border-brand bg-brand-soft text-brand-darker" : "border-line bg-white"
                } ${v.stock <= 0 ? "cursor-not-allowed text-muted line-through opacity-60" : ""}`}
              >
                {v.label}
                <span className="ml-1.5 text-[11px] font-normal text-muted">
                  {v.stock > 0 ? `(${v.stock})` : "(agotado)"}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-end gap-3">
        <div>
          <label className="label" htmlFor="qty">Cantidad</label>
          <select
            id="qty"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            disabled={soldOut}
            className="input w-24"
          >
            {Array.from({ length: Math.max(1, limit) }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <p className="pb-2.5 text-xs text-muted">
          {soldOut ? "Producto agotado" : `Quedan ${available} piezas`} · Subtotal{" "}
          <span className="font-bold text-ink">{money(price * quantity)}</span>
        </p>
      </div>

      <button type="button" onClick={go} disabled={soldOut} className="btn-primary btn-lg">
        {soldOut ? "Agotado" : "Comprar ahora"}
      </button>
    </div>
  );
}
