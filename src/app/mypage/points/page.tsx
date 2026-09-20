import { currentUser } from "@/lib/auth";
import { ledgerOf } from "@/lib/queries";
import { buyPointsAction, convertBalanceToPointsAction } from "@/lib/actions";
import { PointsForm } from "@/components/SettingsForms";
import { longDate } from "@/lib/format";

export const metadata = { title: "Puntos" };

export default async function PointsPage() {
  const user = (await currentUser())!;
  const ledger = ledgerOf(user.id).filter((l) => l.kind === "points");

  return (
    <>
      <h1 className="text-xl font-bold">Puntos</h1>
      <div className="card mt-4 p-5 text-center">
        <p className="text-xs text-muted">Puntos disponibles</p>
        <p className="mt-1 text-3xl font-black text-brand-darker">{user.points}</p>
        <p className="mt-1 text-xs text-muted">Equivalen a {user.points} € de descuento en tus compras.</p>
      </div>

      <PointsForm
        buyAction={buyPointsAction}
        convertAction={convertBalanceToPointsAction}
        balance={user.balance}
      />

      <section className="mt-5">
        <h2 className="section-title">Historial de puntos</h2>
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
                  {entry.amount >= 0 ? "+" : "−"} {Math.abs(entry.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
