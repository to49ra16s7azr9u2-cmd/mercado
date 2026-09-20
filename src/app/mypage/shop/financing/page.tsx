import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { activeAdvance, advancesOf, pendingSales, shopOfUser } from "@/lib/queries";
import { requestAdvanceAction } from "@/lib/actions";
import { AdvanceForm } from "@/components/NetworkForms";
import { ADVANCE_MAX_RATE } from "@/lib/constants";
import { longDate, money } from "@/lib/format";

export const metadata = { title: "Adelanto de ventas" };

export default async function FinancingPage() {
  const user = await requireUser("/mypage/shop/financing");
  const shop = shopOfUser(user.id);
  if (!shop) redirect("/mypage/shop");

  const pending = pendingSales(shop.id);
  const max = Math.floor(pending.total * ADVANCE_MAX_RATE);
  const active = activeAdvance(shop.id);
  const history = advancesOf(shop.id);

  return (
    <>
      <h1 className="text-xl font-bold">Adelanto de ventas</h1>
      <p className="mt-1 text-sm text-muted">
        Cobra hoy una parte de las ventas que todavía están en curso, sin esperar a que se cierren.
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="card p-4 text-center">
          <p className="text-xs text-muted">Ventas en curso</p>
          <p className="text-lg font-black">{money(pending.total)}</p>
          <p className="text-[11px] text-muted">{pending.orders} pedidos</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-muted">Disponible para adelanto</p>
          <p className="text-lg font-black text-brand-darker">{money(max)}</p>
          <p className="text-[11px] text-muted">{ADVANCE_MAX_RATE * 100} % de tus ventas</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-muted">Por amortizar</p>
          <p className="text-lg font-black">{money(active?.outstanding ?? 0)}</p>
          <p className="text-[11px] text-muted">{active ? "adelanto activo" : "sin adelantos activos"}</p>
        </div>
      </div>

      {active ? (
        <div className="card mt-4 p-4">
          <h2 className="section-title">Adelanto activo</h2>
          <p className="mt-2 text-sm text-muted">
            Recibiste {money(active.amount)} el {longDate(active.created_at)} (comisión {money(active.fee)}).
            Se descuentan {money(active.outstanding)} de tus próximas ventas completadas.
          </p>
        </div>
      ) : (
        <div className="mt-4">
          <AdvanceForm action={requestAdvanceAction} pending={pending.total} max={max} />
        </div>
      )}

      <section className="mt-6">
        <h2 className="section-title">Historial</h2>
        {history.length === 0 ? (
          <p className="card mt-2 p-6 text-center text-sm text-muted">Todavía no solicitas adelantos.</p>
        ) : (
          <ul className="card mt-2 divide-y divide-line">
            {history.map((advance) => (
              <li key={advance.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                <div>
                  <p className="font-bold">{money(advance.amount)}</p>
                  <p className="text-xs text-muted">
                    {longDate(advance.created_at)} · comisión {money(advance.fee)}
                  </p>
                </div>
                <span className="chip">
                  {advance.status === "active" ? `Por amortizar ${money(advance.outstanding)}` : "Amortizado"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
