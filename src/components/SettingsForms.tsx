"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "./SubmitButton";
import type { ActionState } from "@/lib/actions";
import { MIN_PAYOUT, PAYOUT_FEE, REGIONS } from "@/lib/constants";
import { Avatar } from "./Avatar";

type Action = (state: ActionState, form: FormData) => Promise<ActionState>;

function Feedback({ state }: { state: ActionState }) {
  if (state.error) return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{state.error}</p>;
  if (state.ok) return <p className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand-darker">{state.ok}</p>;
  return null;
}

export function ProfileForm({
  action,
  user,
}: {
  action: Action;
  user: { name: string; handle: string; bio: string; avatar_seed: string };
}) {
  const [state, formAction] = useActionState(action, {});
  const [seed, setSeed] = useState(user.avatar_seed);
  const [name, setName] = useState(user.name);

  return (
    <form action={formAction} className="card space-y-4 p-4">
      <Feedback state={state} />
      <div>
        <p className="label">Foto de perfil</p>
        <div className="flex items-center gap-3">
          <Avatar seed={seed} name={name} size={64} />
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 12 }, (_, i) => String(i)).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSeed(s)}
                aria-label={`Color ${Number(s) + 1}`}
                className={`rounded-full ${seed === s ? "ring-2 ring-brand ring-offset-1" : ""}`}
              >
                <Avatar seed={s} name={name} size={28} />
              </button>
            ))}
          </div>
        </div>
        <input type="hidden" name="avatar_seed" value={seed} />
      </div>
      <div>
        <label className="label" htmlFor="name">Nombre</label>
        <input id="name" name="name" value={name} onChange={(e) => setName(e.target.value)} className="input" required />
      </div>
      <div>
        <label className="label" htmlFor="handle">Nombre de usuario</label>
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted">@</span>
          <input id="handle" name="handle" defaultValue={user.handle} className="input" required />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="bio">Presentación</label>
        <textarea id="bio" name="bio" rows={4} maxLength={500} defaultValue={user.bio} className="input resize-none"
          placeholder="Cuenta cómo envías, tus horarios, si aceptas ofertas…" />
      </div>
      <SubmitButton className="btn-primary">Guardar cambios</SubmitButton>
    </form>
  );
}

export function AddressForm({
  action,
  address,
}: {
  action: Action;
  address: { name: string; zip: string; region: string; city: string; line: string; phone: string };
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="card space-y-4 p-4">
      <Feedback state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="addr_name">Nombre y apellidos *</label>
          <input id="addr_name" name="addr_name" defaultValue={address.name} className="input" required />
        </div>
        <div>
          <label className="label" htmlFor="addr_zip">Código postal *</label>
          <input id="addr_zip" name="addr_zip" defaultValue={address.zip} className="input" inputMode="numeric" required />
        </div>
        <div>
          <label className="label" htmlFor="addr_region">Estado *</label>
          <select id="addr_region" name="addr_region" defaultValue={address.region} className="input" required>
            <option value="">Selecciona…</option>
            {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="addr_city">Municipio o alcaldía *</label>
          <input id="addr_city" name="addr_city" defaultValue={address.city} className="input" required />
        </div>
        <div>
          <label className="label" htmlFor="addr_phone">Teléfono</label>
          <input id="addr_phone" name="addr_phone" defaultValue={address.phone} className="input" inputMode="tel" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="addr_line">Dirección (calle, número, colonia) *</label>
          <input id="addr_line" name="addr_line" defaultValue={address.line} className="input" required />
        </div>
      </div>
      <SubmitButton className="btn-primary">Guardar dirección</SubmitButton>
    </form>
  );
}

export function NotificationsForm({
  action,
  settings,
}: {
  action: Action;
  settings: Record<string, number>;
}) {
  const [state, formAction] = useActionState(action, {});
  const OPTIONS = [
    { name: "notify_like", label: "Favoritos y bajadas de precio" },
    { name: "notify_comment", label: "Comentarios y ofertas" },
    { name: "notify_order", label: "Compras, ventas y envíos" },
    { name: "notify_message", label: "Mensajes de transacciones" },
    { name: "notify_news", label: "Novedades y promociones de Mercado" },
  ];
  return (
    <form action={formAction} className="card space-y-3 p-4">
      <Feedback state={state} />
      {OPTIONS.map((option) => (
        <label key={option.name} className="flex items-center justify-between gap-3 border-b border-line pb-3 last:border-0 last:pb-0 text-sm">
          {option.label}
          <input
            type="checkbox"
            name={option.name}
            defaultChecked={!!settings[option.name]}
            className="h-5 w-5 accent-[#06c755]"
          />
        </label>
      ))}
      <SubmitButton className="btn-primary">Guardar preferencias</SubmitButton>
    </form>
  );
}

export function PasswordForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="card space-y-3 p-4">
      <Feedback state={state} />
      <div>
        <label className="label" htmlFor="current">Contraseña actual</label>
        <input id="current" name="current" type="password" className="input" required autoComplete="current-password" />
      </div>
      <div>
        <label className="label" htmlFor="next">Nueva contraseña</label>
        <input id="next" name="next" type="password" minLength={8} className="input" required autoComplete="new-password" />
      </div>
      <SubmitButton className="btn-primary">Cambiar contraseña</SubmitButton>
    </form>
  );
}

export function CardForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="card space-y-3 p-4">
      <Feedback state={state} />
      <h2 className="section-title">Agregar tarjeta</h2>
      <div>
        <label className="label" htmlFor="number">Número de tarjeta</label>
        <input id="number" name="number" className="input" inputMode="numeric" placeholder="4242 4242 4242 4242" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="exp">Caducidad (MM/AA)</label>
          <input id="exp" name="exp" className="input" placeholder="12/29" required />
        </div>
        <div>
          <label className="label" htmlFor="cvv">CVV</label>
          <input id="cvv" name="cvv" className="input" inputMode="numeric" placeholder="123" required />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="holder">Titular</label>
        <input id="holder" name="holder" className="input" placeholder="ANA LOPEZ" required />
      </div>
      <p className="text-[11px] text-muted">
        Demostración: no se procesa ningún pago real y solo se guardan los últimos cuatro dígitos.
      </p>
      <SubmitButton className="btn-primary">Agregar tarjeta</SubmitButton>
    </form>
  );
}

export function PayoutForm({ action, balance }: { action: Action; balance: number }) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="card space-y-3 p-4">
      <Feedback state={state} />
      <h2 className="section-title">Solicitar transferencia</h2>
      <div>
        <label className="label" htmlFor="amount">Monto (mínimo ${MIN_PAYOUT}, comisión ${PAYOUT_FEE})</label>
        <input id="amount" name="amount" type="number" min={MIN_PAYOUT} max={balance} className="input" required />
      </div>
      <div>
        <label className="label" htmlFor="iban">CLABE interbancaria (18 dígitos)</label>
        <input id="iban" name="iban" className="input" inputMode="numeric" placeholder="012180001234567895" required />
      </div>
      <div>
        <label className="label" htmlFor="holder">Titular de la cuenta</label>
        <input id="holder" name="holder" className="input" required />
      </div>
      <SubmitButton className="btn-primary">Solicitar transferencia</SubmitButton>
    </form>
  );
}

export function PointsForm({
  buyAction,
  convertAction,
  balance,
}: {
  buyAction: Action;
  convertAction: Action;
  balance: number;
}) {
  const [buyState, buyFormAction] = useActionState(buyAction, {});
  const [convertState, convertFormAction] = useActionState(convertAction, {});
  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <form action={buyFormAction} className="card space-y-3 p-4">
        <Feedback state={buyState} />
        <h2 className="section-title">Comprar puntos</h2>
        <p className="text-xs text-muted">1 punto = $1 de descuento en tus compras.</p>
        <div className="grid grid-cols-3 gap-2">
          {[100, 200, 500, 1000, 2000].map((amount) => (
            <label key={amount} className="cursor-pointer">
              <input type="radio" name="amount" value={amount} required className="peer sr-only" />
              <span className="block rounded-lg border border-line py-2 text-center text-sm font-bold peer-checked:border-brand peer-checked:bg-brand-soft">
                {amount}
              </span>
            </label>
          ))}
        </div>
        <SubmitButton className="btn-primary">Comprar con tarjeta</SubmitButton>
      </form>
      <form action={convertFormAction} className="card space-y-3 p-4">
        <Feedback state={convertState} />
        <h2 className="section-title">Convertir saldo en puntos</h2>
        <p className="text-xs text-muted">Saldo disponible: ${balance}</p>
        <input name="amount" type="number" min={1} max={balance} className="input" placeholder="Importe a convertir" required />
        <SubmitButton className="btn-outline">Convertir</SubmitButton>
      </form>
    </div>
  );
}
