import { requireUser } from "@/lib/auth";
import { cardsOf } from "@/lib/queries";
import { addCardAction, deleteCardAction, setDefaultCardAction } from "@/lib/actions";
import { CardForm } from "@/components/SettingsForms";
import { SubmitButton } from "@/components/SubmitButton";
import { PAYMENT_METHODS } from "@/lib/constants";

export const metadata = { title: "Métodos de pago" };

export default async function PaymentPage() {
  const user = await requireUser("/mypage/payment");
  const cards = cardsOf(user.id);

  return (
    <>
      <h1 className="text-xl font-bold">Métodos de pago</h1>
      {cards.length > 0 && (
        <ul className="card mt-4 divide-y divide-line">
          {cards.map((card) => (
            <li key={card.id} className="flex items-center gap-3 p-4">
              <span className="text-2xl" aria-hidden>💳</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">
                  {card.brand} ···· {card.last4}
                  {!!card.is_default && (
                    <span className="ml-2 rounded bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold text-brand-darker">
                      predeterminada
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted">{card.holder} · caduca {card.exp}</p>
              </div>
              {!card.is_default && (
                <form action={setDefaultCardAction}>
                  <input type="hidden" name="id" value={card.id} />
                  <SubmitButton className="btn-ghost px-3 py-1.5 text-xs">Usar por defecto</SubmitButton>
                </form>
              )}
              <form action={deleteCardAction}>
                <input type="hidden" name="id" value={card.id} />
                <SubmitButton className="btn-ghost px-3 py-1.5 text-xs">Eliminar</SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4">
        <CardForm action={addCardAction} />
      </div>
      <div className="card mt-4 p-4">
        <h2 className="section-title">Otros métodos disponibles al comprar</h2>
        <ul className="mt-2 space-y-1.5 text-sm text-muted">
          {PAYMENT_METHODS.filter((p) => p.value !== "card").map((p) => (
            <li key={p.value}>· <span className="font-bold text-ink">{p.label}</span> — {p.hint}</li>
          ))}
        </ul>
      </div>
    </>
  );
}
