"use client";

import { useActionState } from "react";
import { SubmitButton } from "./SubmitButton";
import type { ActionState } from "@/lib/actions";

const REASONS = [
  "Artículo prohibido o ilegal",
  "Producto falsificado",
  "Contenido ofensivo o spam",
  "Intento de pago fuera de la plataforma",
  "Posible estafa",
  "Otro motivo",
];

export function ReportForm({
  action,
  target,
  targetId,
}: {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  target: string;
  targetId: string;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="card space-y-3 p-4">
      <input type="hidden" name="target" value={target} />
      <input type="hidden" name="target_id" value={targetId} />
      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state.ok && <p className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand-darker">{state.ok}</p>}
      <fieldset>
        <legend className="label">Motivo</legend>
        <div className="space-y-1.5">
          {REASONS.map((reason) => (
            <label key={reason} className="flex items-center gap-2 text-sm">
              <input type="radio" name="reason" value={reason} required className="accent-[#06c755]" />
              {reason}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label className="label" htmlFor="body">Detalles (opcional)</label>
        <textarea id="body" name="body" rows={4} className="input resize-none" />
      </div>
      <SubmitButton className="btn-primary">Enviar denuncia</SubmitButton>
    </form>
  );
}
