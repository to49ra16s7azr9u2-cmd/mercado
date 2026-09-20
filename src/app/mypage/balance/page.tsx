import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { ledgerOf, payoutsOf } from "@/lib/queries";
import { requestPayoutAction } from "@/lib/actions";
import { PayoutForm } from "@/components/SettingsForms";
import { longDate, money } from "@/lib/format";
import { MIN_PAYOUT, PAYOUT_FEE } from "@/lib/constants";

export const metadata = { title: "Saldo y transferencias" };

const PAYOUT_STATUS: Record<string, string> = {
  pending: "En proceso",
  done: "Transferida",
  rejected: "Rechazada",
};

export default async function BalancePage() {
  const user = await requireUser("/mypage/balance");
  const ledger = ledgerOf(user.id).filter((l) => l.kind === "balance");
  const payouts = payoutsOf(user.id);

  return (
    <>
      <h1 className="text-xl font-bold">Saldo y transferencias</h1>

      <div className="card mt-4 bg-gradient-to-br from-brand to-brand-darker p-5 text-white">
        <p className="text-xs text-white/80">Saldo disponible</p>
        <p className="mt-1 text-3xl font-black">{money(user.balance)}</p>
        <p className="mt-2 text-[11px] text-white/80">
          Monto mínimo para transferir: {money(MIN_PAYOUT)} · Comisión por transferencia: {money(PAYOUT_FEE)}
        </p>
      </div>

      {!user.is_verified && (
        <p className="mt-3 rounded-lg bg-brand-soft px-4 py-3 text-sm text-brand-darker">
          Para transferir tu saldo primero debes{" "}
          <Link href="/mypage/identity" className="font-bold underline">verificar tu identidad</Link>.
        </p>
      )}

      <div className="mt-4">
        <PayoutForm action={requestPayoutAction} balance={user.balance} />
      </div>

      {payouts.length > 0 && (
        <section className="mt-5">
          <h2 className="section-title">Transferencias solicitadas</h2>
          <ul className="card mt-2 divide-y divide-line">
            {payouts.map((payout) => (
              <li key={payout.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                <div>
                  <p className="font-bold">{money(payout.amount)}</p>
                  <p className="text-xs text-muted">
                    {payout.iban.slice(0, 8)}··· · {longDate(payout.created_at)}
                  </p>
                </div>
                <span className="chip">{PAYOUT_STATUS[payout.status] ?? payout.status}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-5">
        <h2 className="section-title">Movimientos</h2>
        {ledger.length === 0 ? (
          <p className="card mt-2 p-6 text-center text-sm text-muted">Todavía no hay movimientos.</p>
        ) : (
          <ul className="card mt-2 divide-y divide-line">
            {ledger.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                <div className="min-w-0">
                  <p className="truncate">{entry.memo}</p>
                  <p className="text-xs text-muted">{longDate(entry.created_at)}</p>
                </div>
                <span className={`shrink-0 font-bold ${entry.amount >= 0 ? "text-brand-darker" : "text-ink"}`}>
                  {entry.amount >= 0 ? "+" : "−"} {money(Math.abs(entry.amount))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
