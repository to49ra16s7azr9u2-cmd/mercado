import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import {
  cardsOf, partnerBetween, shopBySlug, shopOfUser, wholesaleCatalog,
} from "@/lib/queries";
import { requestPartnerAction, wholesalePurchaseAction } from "@/lib/actions";
import { PartnerRequestForm, WholesaleOrderForm } from "@/components/WholesaleForms";
import { PARTNER_STATUS } from "@/lib/constants";
import { money } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const shop = shopBySlug(slug);
  return { title: shop ? `Mayoreo · ${shop.name}` : "Mayoreo" };
}

export default async function SupplierPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supplier = shopBySlug(slug);
  if (!supplier || supplier.status !== "active") notFound();

  const user = await currentUser();
  const myShop = user ? shopOfUser(user.id) : undefined;
  const partner = myShop ? partnerBetween(myShop.id, supplier.id) : undefined;
  const approved = partner?.status === "approved";
  const catalog = wholesaleCatalog(supplier.id);
  const cards = user ? cardsOf(user.id) : [];

  return (
    <>
      <nav className="mb-2 text-xs text-muted">
        <Link href="/mayoreo" className="link">Mayoreo</Link> /{" "}
        <Link href={`/shop/${supplier.slug}`} className="link">{supplier.name}</Link>
      </nav>

      <section className="card flex items-center gap-4 p-5">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft text-3xl">
          {supplier.cover_emoji}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-black">{supplier.name}</h1>
          <p className="truncate text-xs text-muted">
            {supplier.category} · Envíos desde {supplier.ship_from} · {supplier.delivery_note || "2 a 5 días hábiles"}
          </p>
          <p className="mt-1 text-xs text-muted">
            <Link href={`/shop/${supplier.slug}/legal`} className="link">Información del vendedor</Link> ·{" "}
            {catalog.length} productos con precio de mayoreo
          </p>
        </div>
        {partner && (
          <span className={`chip ${PARTNER_STATUS[partner.status].className}`}>
            {PARTNER_STATUS[partner.status].label}
          </span>
        )}
      </section>

      {!user && (
        <p className="card mt-4 p-6 text-center text-sm text-muted">
          <Link href={`/login?next=/mayoreo/${slug}`} className="link font-bold">Inicia sesión</Link> con tu
          cuenta de negocio para ver los precios de mayoreo.
        </p>
      )}

      {user && !myShop && (
        <p className="card mt-4 p-6 text-center text-sm text-muted">
          El mayoreo es entre tiendas.{" "}
          <Link href="/mypage/shop/new" className="link font-bold">Abre tu tienda</Link> para solicitar acceso.
        </p>
      )}

      {myShop && !approved && (
        <div className="mt-4">
          <PartnerRequestForm
            action={requestPartnerAction}
            supplierShopId={supplier.id}
            supplierName={supplier.name}
          />
        </div>
      )}

      <section className="mt-6">
        <h2 className="section-title">Catálogo de mayoreo</h2>
        {catalog.length === 0 ? (
          <p className="card mt-2 p-8 text-center text-sm text-muted">
            Esta tienda todavía no publica precios por volumen.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {catalog.map((item) => (
              <li key={item.id} className="card p-4">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image ?? ""} alt="" className="h-16 w-16 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/item/${item.id}`} className="block truncate text-sm font-bold hover:underline">
                      {item.title}
                    </Link>
                    <p className="text-xs text-muted">
                      Menudeo {money(item.price)} · {item.stock} piezas en inventario
                    </p>
                  </div>
                </div>

                <ul className="mt-3 flex flex-wrap gap-2">
                  {item.tiers.map((tier) => (
                    <li key={tier.id} className={`chip ${approved ? "chip-active" : ""}`}>
                      {tier.min_qty}+ pza ·{" "}
                      {approved ? (
                        <span className="font-black">{money(tier.price)}</span>
                      ) : (
                        <span className="blur-[3px]">$···</span>
                      )}
                      {approved && (
                        <span className="text-[10px] font-normal text-muted">
                          −{Math.round((1 - tier.price / item.price) * 100)} %
                        </span>
                      )}
                    </li>
                  ))}
                </ul>

                {approved && (
                  <div className="mt-3">
                    <WholesaleOrderForm
                      action={wholesalePurchaseAction}
                      itemId={item.id}
                      title={item.title}
                      stock={item.stock}
                      tiers={item.tiers.map((t) => ({ min_qty: t.min_qty, price: t.price }))}
                      balance={user?.balance ?? 0}
                      hasCard={cards.length > 0}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
