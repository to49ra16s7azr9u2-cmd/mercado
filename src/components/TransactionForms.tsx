"use client";

import { useActionState } from "react";
import { SubmitButton } from "./SubmitButton";
import type { ActionState } from "@/lib/actions";

type Action = (state: ActionState, form: FormData) => Promise<ActionState>;

export function MessageForm({ action, orderId }: { action: Action; orderId: string }) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="mt-4 flex gap-2" key={state.ok ? Math.random() : "form"}>
      <input type="hidden" name="order_id" value={orderId} />
      <input
        name="body"
        required
        maxLength={1000}
        placeholder="Escribe un mensaje…"
        className="input"
        autoComplete="off"
      />
      <SubmitButton className="btn-primary">Enviar</SubmitButton>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}

const SCORES = [
  { value: "good", label: "Buena", emoji: "😊", hint: "Todo correcto" },
  { value: "normal", label: "Normal", emoji: "😐", hint: "Hubo algún detalle" },
  { value: "bad", label: "Mala", emoji: "😞", hint: "Hubo problemas" },
];

export function RatingForm({
  action,
  orderId,
  title,
  cta,
}: {
  action: Action;
  orderId: string;
  title: string;
  cta: string;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="card p-4">
      <input type="hidden" name="order_id" value={orderId} />
      <h2 className="section-title">{title}</h2>
      {state.error && <p className="mt-2 text-xs text-red-600">{state.error}</p>}
      {state.ok && <p className="mt-2 text-xs text-brand-darker">{state.ok}</p>}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {SCORES.map((s) => (
          <label key={s.value} className="cursor-pointer">
            <input type="radio" name="score" value={s.value} required className="peer sr-only" />
            <span className="block rounded-lg border border-line p-3 text-center peer-checked:border-brand peer-checked:bg-brand-soft">
              <span className="block text-2xl">{s.emoji}</span>
              <span className="block text-sm font-bold">{s.label}</span>
              <span className="block text-[11px] text-muted">{s.hint}</span>
            </span>
          </label>
        ))}
      </div>
      <textarea
        name="body"
        rows={3}
        maxLength={500}
        placeholder="Escribe un comentario para la otra persona (opcional)"
        className="input mt-3 resize-none"
      />
      <SubmitButton className="btn-primary btn-lg mt-3">{cta}</SubmitButton>
    </form>
  );
}
