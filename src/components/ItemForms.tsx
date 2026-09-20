"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "./SubmitButton";
import type { ActionState } from "@/lib/actions";

type Action = (state: ActionState, form: FormData) => Promise<ActionState>;

export function CommentForm({ action, itemId }: { action: Action; itemId: string }) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="mt-3">
      <input type="hidden" name="item_id" value={itemId} />
      <textarea
        name="body"
        rows={3}
        maxLength={1000}
        required
        placeholder="Escribe un comentario público para quien vende…"
        className="input resize-none"
      />
      {state.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
      {state.ok && <p className="mt-1 text-xs text-brand-darker">{state.ok}</p>}
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-[11px] text-muted">
          Los comentarios son públicos. No compartas datos personales.
        </p>
        <SubmitButton className="btn-primary">Comentar</SubmitButton>
      </div>
    </form>
  );
}

export function OfferForm({
  action,
  itemId,
  price,
}: {
  action: Action;
  itemId: string;
  price: number;
}) {
  const [state, formAction] = useActionState(action, {});
  const [open, setOpen] = useState(false);
  const suggestions = [0.9, 0.8, 0.7].map((r) => Math.max(1, Math.round(price * r)));

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-outline w-full">
        💬 Hacer una oferta
      </button>
    );
  }

  return (
    <form action={formAction} className="card space-y-2 p-3">
      <input type="hidden" name="item_id" value={itemId} />
      <p className="text-xs font-bold text-muted">Tu oferta (mínimo el 50 % del precio)</p>
      <div className="flex gap-2">
        {suggestions.map((s) => (
          <label key={s} className="flex-1">
            <input type="radio" name="price" value={s} className="peer sr-only" />
            <span className="block cursor-pointer rounded-lg border border-line py-2 text-center text-sm font-bold peer-checked:border-brand peer-checked:bg-brand-soft peer-checked:text-brand-darker">
              ${s}
            </span>
          </label>
        ))}
      </div>
      <input name="price" type="number" min={1} max={price - 1} placeholder="Otro monto ($)" className="input" />
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state.ok && <p className="text-xs text-brand-darker">{state.ok}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost flex-1">Cancelar</button>
        <SubmitButton className="btn-primary flex-1">Enviar oferta</SubmitButton>
      </div>
    </form>
  );
}

export function PriceEditor({ action, itemId, price }: { action: (f: FormData) => void; itemId: string; price: number }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-outline flex-1">
        Cambiar precio
      </button>
    );
  }
  return (
    <form action={action} className="flex w-full gap-2">
      <input type="hidden" name="id" value={itemId} />
      <input name="price" type="number" defaultValue={price} min={3} className="input" />
      <SubmitButton className="btn-primary">Guardar</SubmitButton>
    </form>
  );
}
