import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { alliedShopItems, bundleItems, bundlesOfShop, shopItems, shopOfUser } from "@/lib/queries";
import { createBundleAction, deleteBundleAction } from "@/lib/actions";
import { BundleForm } from "@/components/NetworkForms";
import { SubmitButton } from "@/components/SubmitButton";
import { money, shortDate } from "@/lib/format";

export const metadata = { title: "Paquetes cruzados" };

export default async function BundlesPage() {
  const user = await requireUser("/mypage/shop/bundles");
  const shop = shopOfUser(user.id);
  if (!shop) redirect("/mypage/shop");

  const bundles = bundlesOfShop(shop.id);
  const mine = shopItems(shop.id, ["on_sale"]);
  const allied = alliedShopItems(shop.id);

  return (
    <>
      <h1 className="text-xl font-bold">Paquetes cruzados</h1>
      <p className="mt-1 text-sm text-muted">
        Vende en conjunto con negocios complementarios: quien compre un producto del paquete recibe
        un cupón para las demás tiendas.
      </p>

      <div className="mt-4">
        <BundleForm
          action={createBundleAction}
          myItems={mine.map((item) => ({ id: item.id, title: item.title, price: item.price }))}
          partnerItems={allied.map((item) => ({
            id: item.id, title: item.title, price: item.price, shop: item.shop,
          }))}
        />
      </div>

      <section className="mt-6">
        <h2 className="section-title">Paquetes activos</h2>
        {bundles.length === 0 ? (
          <p className="card mt-2 p-6 text-center text-sm text-muted">Todavía no participas en paquetes.</p>
        ) : (
          <ul className="mt-2 space-y-3">
            {bundles.map((bundle) => {
              const items = bundleItems(bundle.id);
              return (
                <li key={bundle.id} className="card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold">{bundle.title}</p>
                      <p className="text-xs text-muted">
                        Cupón cruzado de {money(bundle.discount)} · {bundle.shops} tiendas ·
                        creado por {bundle.shop_name} el {shortDate(bundle.created_at)}
                      </p>
                      {bundle.description && <p className="mt-1 text-sm text-muted">{bundle.description}</p>}
                    </div>
                    {bundle.owner_shop_id === shop.id && (
                      <form action={deleteBundleAction}>
                        <input type="hidden" name="id" value={bundle.id} />
                        <SubmitButton className="btn-ghost px-3 py-1.5 text-xs">Eliminar</SubmitButton>
                      </form>
                    )}
                  </div>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {items.map((item) => (
                      <li key={item.id}>
                        <Link href={`/item/${item.id}`} className="chip hover:border-brand">
                          {item.shop_name}: {item.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
