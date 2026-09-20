import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { advanceEligibility, advancesOf, shopOfUser } from "@/lib/queries";
import { requestAdvanceAction } from "@/lib/actions";
import { AdvanceForm, AdvanceRequirements } from "@/components/NetworkForms";
import { ADVANCE_DUE_DAYS, ADVANCE_MAX_AMOUNT } from "@/lib/constants";
import { longDate, money, shortDate } from "@/lib/format";

export const metadata = { title: "Adelanto de ventas" };

export default async function FinancingPage() {
  const user = await requireUser("/mypage/shop/financing");
  const shop = shopOfUser(user.id);
  if (!shop) redirect("/mypage/shop");

  const analysis = advanceEligibility(shop, user);
  const history = advancesOf(shop.id);
  const active = analysis.active;

  return (
    <>
      <h1 className="text-xl font-bold">Adelanto de ventas</h1>
      <p className="mt-1 text-sm text-muted">
        Cobra hoy una parte de las ventas que todavía están en curso. El monto disponible depende de
        tu historial de cumplimiento y siempre te mostramos el costo anual equivalente.
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        <div className="card p-4 text-center">
          <p className="text-xs text-muted">Ventas en curso</p>
          <p className="text-lg font-black">{money(analysis.pending)}</p>
          <p className="text-[11px] text-muted">{analysis.record.completed} ventas completadas</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-muted">Nivel de historial</p>
          <p className="text-lg font-black text-brand-darker">{analysis.tier.label}</p>
          <p className="text-[11px] text-muted">hasta {Math.round(analysis.tier.rate * 100)} % de tus ventas</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-muted">Disponible</p>
          <p className="text-lg font-black">{money(analysis.limit)}</p>
          <p className="text-[11px] text-muted">tope por operación {money(ADVANCE_MAX_AMOUNT)}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-muted">CAT aproximado</p>
          <p className="text-lg font-black">{analysis.apr} %</p>
          <p className="text-[11px] text-muted">plazo promedio {analysis.horizonDays} días</p>
        </div>
      </div>

      {active && (
        <div className={`card mt-4 p-4 ${active.status === "overdue" ? "border-red-200 bg-red-50" : ""}`}>
          <h2 className="section-title">
            {active.status === "overdue" ? "Adelanto vencido" : "Adelanto activo"}
          </h2>
          <p className="mt-2 text-sm text-muted">
            Recibiste {money(active.amount)} el {longDate(active.created_at)} (comisión{" "}
            {money(active.fee)}, CAT aproximado {active.apr} %). Faltan {money(active.outstanding)} por
            amortizar y el plazo vence el {active.due_at ? shortDate(active.due_at) : "—"}.
          </p>
          {active.status === "overdue" && (
            <p className="mt-2 text-sm font-bold text-red-700">
              El plazo se cumplió sin liquidarse. No podrás solicitar otro adelanto hasta que tus
              ventas en curso lo amorticen.
            </p>
          )}
        </div>
      )}

      {!active && (
        <section className="mt-5">
          <h2 className="section-title">Requisitos</h2>
          <div className="mt-2">
            <AdvanceRequirements checks={analysis.checks} />
          </div>
        </section>
      )}

      {analysis.eligible && !active ? (
        <div className="mt-5">
          <AdvanceForm
            action={requestAdvanceAction}
            pending={analysis.pending}
            limit={analysis.limit}
            apr={analysis.apr}
            feeRate={analysis.feeRate}
            horizonDays={analysis.horizonDays}
            tierLabel={analysis.tier.label}
            dueDays={ADVANCE_DUE_DAYS}
          />
        </div>
      ) : (
        !active && (
          <p className="card mt-4 p-6 text-sm text-muted">
            Todavía no cumples los requisitos para un adelanto. Completa más ventas y{" "}
            <Link href="/mypage/identity" className="link">verifica tu identidad</Link> para
            habilitarlo. Esto protege a tu negocio de endeudarse sin flujo suficiente.
          </p>
        )
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
                    {advance.apr ? ` · CAT ${advance.apr} %` : ""}
                  </p>
                </div>
                <span className={`chip ${advance.status === "overdue" ? "bg-red-50 text-red-600" : ""}`}>
                  {advance.status === "active"
                    ? `Por amortizar ${money(advance.outstanding)}`
                    : advance.status === "overdue"
                      ? `Vencido · ${money(advance.outstanding)}`
                      : "Amortizado"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
