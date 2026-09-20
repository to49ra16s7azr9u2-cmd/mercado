import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { partnershipsOf, shopOfUser } from "@/lib/queries";
import { PARTNER_STATUS } from "@/lib/constants";
import { timeAgo } from "@/lib/format";

export const metadata = { title: "Mis proveedores" };

export default async function PartnersPage() {
  const user = await requireUser("/mypage/shop/partners");
  const shop = shopOfUser(user.id);
  if (!shop) redirect("/mypage/shop");
  const partners = partnershipsOf(shop.id);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Mis proveedores</h1>
        <Link href="/mayoreo" className="btn-primary">Buscar proveedores</Link>
      </div>
      <p className="mt-1 text-sm text-muted">Tiendas a las que les compras en mayoreo.</p>

      {partners.length === 0 ? (
        <p className="card mt-4 p-8 text-center text-sm text-muted">
          Todavía no solicitas acceso a ningún proveedor.
        </p>
      ) : (
        <ul className="card mt-4 divide-y divide-line">
          {partners.map((partner) => (
            <li key={partner.id} className="flex items-center gap-3 p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-lg">
                {partner.shop_emoji}
              </span>
              <div className="min-w-0 flex-1">
                <Link href={`/mayoreo/${partner.shop_slug}`} className="block truncate text-sm font-bold hover:underline">
                  {partner.shop_name}
                </Link>
                <p className="truncate text-xs text-muted">
                  {partner.shop_category} · {partner.shop_region} · solicitada {timeAgo(partner.created_at)}
                </p>
              </div>
              <span className={`chip shrink-0 ${PARTNER_STATUS[partner.status].className}`}>
                {PARTNER_STATUS[partner.status].label}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
