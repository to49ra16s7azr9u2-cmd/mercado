import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { allCollectives, collectivesOfShop, shopOfUser } from "@/lib/queries";
import { createCollectiveAction, toggleCollectiveMembershipAction } from "@/lib/actions";
import { CollectiveForm } from "@/components/NetworkForms";
import { SubmitButton } from "@/components/SubmitButton";

export const metadata = { title: "Mis colectivos" };

export default async function ShopCollectivesPage() {
  const user = await requireUser("/mypage/shop/collectives");
  const shop = shopOfUser(user.id);
  if (!shop) redirect("/mypage/shop");

  const mine = collectivesOfShop(shop.id);
  const others = allCollectives().filter((c) => !mine.some((m) => m.id === c.id));

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Mis colectivos</h1>
        <Link href="/colectivos" className="btn-outline">Ver todos</Link>
      </div>
      <p className="mt-1 text-sm text-muted">
        Agrúpate con tiendas de tu mercado, tu calle o tu oficio para vender juntas.
      </p>

      {mine.length > 0 && (
        <ul className="card mt-4 divide-y divide-line">
          {mine.map((collective) => (
            <li key={collective.id} className="flex items-center gap-3 p-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-lg">
                {collective.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <Link href={`/colectivo/${collective.slug}`} className="block truncate text-sm font-bold hover:underline">
                  {collective.name}
                </Link>
                <p className="truncate text-xs text-muted">
                  {collective.region || "Todo México"} · {collective.role === "owner" ? "administradora" : "integrante"}
                </p>
              </div>
              {collective.role !== "owner" && (
                <form action={toggleCollectiveMembershipAction}>
                  <input type="hidden" name="collective_id" value={collective.id} />
                  <input type="hidden" name="slug" value={collective.slug} />
                  <SubmitButton className="btn-ghost px-3 py-1.5 text-xs">Salir</SubmitButton>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      {others.length > 0 && (
        <section className="mt-6">
          <h2 className="section-title">Colectivos a los que puedes unirte</h2>
          <ul className="card mt-2 divide-y divide-line">
            {others.map((collective) => (
              <li key={collective.id} className="flex items-center gap-3 p-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-canvas text-lg">
                  {collective.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <Link href={`/colectivo/${collective.slug}`} className="block truncate text-sm font-bold hover:underline">
                    {collective.name}
                  </Link>
                  <p className="truncate text-xs text-muted">
                    {collective.region || "Todo México"} · {collective.members} tiendas · {collective.products} productos
                  </p>
                </div>
                <form action={toggleCollectiveMembershipAction}>
                  <input type="hidden" name="collective_id" value={collective.id} />
                  <input type="hidden" name="slug" value={collective.slug} />
                  <SubmitButton className="btn-primary px-3 py-1.5 text-xs">Unirme</SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <CollectiveForm action={createCollectiveAction} />
      </section>
    </>
  );
}
