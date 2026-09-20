"use client";

import Link from "next/link";
import { useActionState } from "react";
import { SubmitButton } from "./SubmitButton";
import type { ActionState } from "@/lib/actions";

type Action = (state: ActionState, form: FormData) => Promise<ActionState>;

export function LogInForm({ action, next }: { action: Action; next: string }) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{state.error}</p>
      )}
      <div>
        <label className="label" htmlFor="email">Correo electrónico</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="input" placeholder="tucorreo@ejemplo.com" />
      </div>
      <div>
        <label className="label" htmlFor="password">Contraseña</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="input" placeholder="••••••••" />
      </div>
      <SubmitButton className="btn-primary btn-lg" pendingText="Entrando…">Entrar</SubmitButton>
      <p className="text-center text-xs text-muted">
        ¿Aún no tienes cuenta?{" "}
        <Link href="/signup" className="link font-bold">Crea una gratis</Link>
      </p>
    </form>
  );
}

export function SignUpForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{state.error}</p>
      )}
      <div>
        <label className="label" htmlFor="name">Nombre y apellidos</label>
        <input id="name" name="name" required className="input" placeholder="Ana García" />
      </div>
      <div>
        <label className="label" htmlFor="email">Correo electrónico</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="input" placeholder="tucorreo@ejemplo.com" />
      </div>
      <div>
        <label className="label" htmlFor="password">Contraseña (mínimo 8 caracteres)</label>
        <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="input" placeholder="••••••••" />
      </div>
      <label className="flex items-start gap-2 text-xs text-muted">
        <input type="checkbox" required className="mt-0.5 accent-[#06c755]" />
        <span>
          Acepto los <Link href="/legal/terminos" className="link">términos de uso</Link> y la{" "}
          <Link href="/legal/privacidad" className="link">política de privacidad</Link>.
        </span>
      </label>
      <SubmitButton className="btn-primary btn-lg" pendingText="Creando cuenta…">Crear cuenta gratis</SubmitButton>
      <p className="text-center text-xs text-muted">
        ¿Ya tienes cuenta? <Link href="/login" className="link font-bold">Entra aquí</Link>
      </p>
    </form>
  );
}
