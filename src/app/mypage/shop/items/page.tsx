import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { shopItems, shopOfUser, variantsOf } from "@/lib/queries";
import { deleteItemAction, updateStockAction } from "@/lib/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { money, timeAgo } from "@/lib/format";

export const metadata = { title: "Inventario de la tienda" };

const TABS = [
  { value: "on_sale", label: "Publicados", statuses: ["on_sale", "stopped"] },
  { value: "draft", label: "Borradores", statuses: ["draft"] },
  { value: "sold", label: "Agotados y vendidos", statuses: ["sold", "trading"] },
];

export default async function ShopItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireUser("/mypage/shop/items");
  const shop = shopOfUser(user.id);
  if (!shop) redirect("/mypage/shop");
  const { tab } = await searchParams;
  const active = TABS.find((t) => t.value === tab) ?? TABS[0];
  const items = shopItems(shop.id, active.statuses);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Inventario</h1>
        <Link href="/mypage/shop/items/new" className="btn-primary">Publicar producto</Link>
      </div>

      <div className="mt-4 flex gap-2">
        {TABS.map((t) => (
          <Link key={t.value} href={`/mypage/shop/items?tab=${t.value}`} className={`chip ${t.value === active.value ? "chip-active" : ""}`}>
            {t.label}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="card mt-4 p-8 text-center text-sm text-muted">No hay productos en esta sección.</p>
      ) : (
        <ul className="card mt-4 divide-y divide-line">
          {items.map((item) => {
            const variants = variantsOf(item.id);
            return (
              <li key={item.id} className="p-3">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image ?? ""} alt="" className="h-14 w-14 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/item/${item.id}`} className="block truncate text-sm font-bold hover:underline">
                      {item.title || "Sin título"}
                    </Link>
                    <p className="text-xs text-muted">
                      {money(item.price)} · {item.stock} pza en inventario ·{" "}
                      {item.status === "stopped" ? "agotado" : item.status === "draft" ? "borrador" : "publicado"} ·{" "}
                      {timeAgo(item.updated_at)}
                    </p>
                  </div>
                  <Link href={`/mypage/shop/items/${item.id}/edit`} className="btn-outline px-3 py-1.5 text-xs">
                    Editar
                  </Link>
                  {item.status !== "sold" && item.status !== "trading" && (
                    <form action={deleteItemAction}>
                      <input type="hidden" name="id" value={item.id} />
                      <SubmitButton className="btn-ghost px-3 py-1.5 text-xs">Eliminar</SubmitButton>
                    </form>
                  )}
                </div>

                {variants.length > 0 ? (
                  <ul className="mt-2 flex flex-wrap gap-1.5 pl-[68px]">
                    {variants.map((variant) => (
                      <li key={variant.id} className="chip">
                        {variant.label}: {variant.stock}
                      </li>
                    ))}
                  </ul>
                ) : (
                  item.status !== "sold" && (
                    <form action={updateStockAction} className="mt-2 flex items-center gap-2 pl-[68px]">
                      <input type="hidden" name="id" value={item.id} />
                      <label className="text-xs text-muted" htmlFor={`stock-${item.id}`}>Inventario</label>
                      <input
                        id={`stock-${item.id}`}
                        name="stock"
                        defaultValue={item.stock}
                        inputMode="numeric"
                        className="input w-24 py-1.5 text-sm"
                      />
                      <SubmitButton className="btn-outline px-3 py-1.5 text-xs">Actualizar</SubmitButton>
                    </form>
                  )
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
