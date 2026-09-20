import { currentUser } from "@/lib/auth";
import { couponsOf } from "@/lib/queries";
import { money, shortDate } from "@/lib/format";

export const metadata = { title: "Cupones" };

export default async function CouponsPage() {
  const user = (await currentUser())!;
  const coupons = couponsOf(user.id);
  const now = Date.now();
  const available = coupons.filter((c) => !c.used_at && new Date(c.expires_at).getTime() > now);
  const spent = coupons.filter((c) => c.used_at || new Date(c.expires_at).getTime() <= now);

  return (
    <>
      <h1 className="text-xl font-bold">Cupones</h1>

      <h2 className="mt-4 text-sm font-bold text-muted">Disponibles ({available.length})</h2>
      {available.length === 0 ? (
        <p className="card mt-2 p-6 text-center text-sm text-muted">No tienes cupones disponibles ahora mismo.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {available.map((coupon) => (
            <li key={coupon.id} className="card flex items-center gap-4 overflow-hidden">
              <div className="flex h-20 w-24 shrink-0 flex-col items-center justify-center bg-brand text-white">
                <span className="text-xl font-black">{money(coupon.amount)}</span>
                <span className="text-[10px]">de descuento</span>
              </div>
              <div className="min-w-0 flex-1 py-3 pr-4">
                <p className="truncate text-sm font-bold">{coupon.title}</p>
                <p className="text-xs text-muted">
                  Código {coupon.code} · compra mínima {money(coupon.min_price)}
                </p>
                <p className="text-xs text-muted">Caduca el {shortDate(coupon.expires_at)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {spent.length > 0 && (
        <>
          <h2 className="mt-6 text-sm font-bold text-muted">Usados o caducados</h2>
          <ul className="card mt-2 divide-y divide-line">
            {spent.map((coupon) => (
              <li key={coupon.id} className="flex items-center justify-between gap-3 p-4 text-sm opacity-60">
                <span className="truncate">{coupon.title}</span>
                <span className="shrink-0 text-xs text-muted">
                  {coupon.used_at ? `Usado el ${shortDate(coupon.used_at)}` : `Caducó el ${shortDate(coupon.expires_at)}`}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
