import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import {
  isFollowingShop, shopBySlug, shopItems, shopRating, shopStats, userById,
} from "@/lib/queries";
import { toggleShopFollowAction } from "@/lib/actions";
import { ItemGrid } from "@/components/ItemCard";
import { SubmitButton } from "@/components/SubmitButton";
import { businessTypeLabel } from "@/lib/constants";
import { shortDate } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const shop = shopBySlug(slug);
  return { title: shop ? `${shop.name} · Mercado Shops` : "Tienda" };
}

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { slug } = await params;
  const { tab } = await searchParams;
  const shop = shopBySlug(slug);
  if (!shop) notFound();

  const user = await currentUser();
  const isOwner = user?.id === shop.owner_id;
  if (shop.status !== "active" && !isOwner) notFound();

  const owner = userById(shop.owner_id)!;
  const stats = shopStats(shop.id);
  const rating = shopRating(shop.id);
  const following = user ? isFollowingShop(user.id, shop.id) : false;
  const active = tab === "sold" ? "sold" : tab === "about" ? "about" : "items";
  const items = shopItems(shop.id, active === "sold" ? ["sold", "trading"] : ["on_sale", "stopped"]);

  return (
    <>
      <section className="card overflow-hidden">
        <div className="flex items-center gap-4 bg-gradient-to-br from-brand to-brand-darker p-5 text-white">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-3xl">
            {shop.cover_emoji}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-white/80">Mercado Shops</p>
            <h1 className="truncate text-xl font-black">{shop.name}</h1>
            <p className="truncate text-xs text-white/85">
              {shop.category} · {shop.ship_from || "México"} · desde {shortDate(shop.created_at)}
            </p>
          </div>
          {isOwner ? (
            <Link href="/mypage/shop" className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-brand-darker">
              Administrar
            </Link>
          ) : user ? (
            <form action={toggleShopFollowAction}>
              <input type="hidden" name="shop_id" value={shop.id} />
              <input type="hidden" name="slug" value={shop.slug} />
              <SubmitButton
                className={
                  following
                    ? "rounded-lg border border-white/60 px-4 py-2 text-sm font-bold text-white"
                    : "rounded-lg bg-white px-4 py-2 text-sm font-bold text-brand-darker"
                }
              >
                {following ? "Siguiendo" : "Seguir tienda"}
              </SubmitButton>
            </form>
          ) : (
            <Link href={`/login?next=/shop/${shop.slug}`} className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-brand-darker">
              Seguir tienda
            </Link>
          )}
        </div>
        <div className="grid grid-cols-2 divide-x divide-line text-center sm:grid-cols-4">
          <div className="p-3"><p className="text-lg font-black">{stats.items}</p><p className="text-[11px] text-muted">Productos</p></div>
          <div className="p-3"><p className="text-lg font-black">{stats.stock}</p><p className="text-[11px] text-muted">Piezas en inventario</p></div>
          <div className="p-3"><p className="text-lg font-black">{stats.followers}</p><p className="text-[11px] text-muted">Seguidores</p></div>
          <div className="p-3"><p className="text-lg font-black">😊 {rating.good}</p><p className="text-[11px] text-muted">Calificaciones</p></div>
        </div>
      </section>

      {shop.status !== "active" && (
        <p className="mt-3 rounded-lg bg-canvas px-4 py-3 text-sm text-muted">
          Esta tienda está en revisión: solo tú puedes verla por ahora.
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <Link href={`/shop/${slug}`} className={`chip ${active === "items" ? "chip-active" : ""}`}>
          Productos ({stats.items})
        </Link>
        <Link href={`/shop/${slug}?tab=sold`} className={`chip ${active === "sold" ? "chip-active" : ""}`}>
          Vendidos
        </Link>
        <Link href={`/shop/${slug}?tab=about`} className={`chip ${active === "about" ? "chip-active" : ""}`}>
          Sobre la tienda
        </Link>
      </div>

      <div className="mt-4">
        {active === "about" ? (
          <div className="card divide-y divide-line">
            <div className="p-5">
              <h2 className="section-title">Sobre la tienda</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">
                {shop.description || "Esta tienda todavía no agregó una descripción."}
              </p>
            </div>
            <dl className="p-5 text-sm">
              <div className="flex gap-4 py-1.5"><dt className="w-44 shrink-0 text-muted">Tipo de vendedor</dt><dd>{businessTypeLabel(shop.business_type)}</dd></div>
              <div className="flex gap-4 py-1.5"><dt className="w-44 shrink-0 text-muted">Responsable</dt><dd>{owner.name}</dd></div>
              <div className="flex gap-4 py-1.5"><dt className="w-44 shrink-0 text-muted">Envíos desde</dt><dd>{shop.ship_from || "México"}</dd></div>
              <div className="flex gap-4 py-1.5"><dt className="w-44 shrink-0 text-muted">Tiempo de entrega</dt><dd>{shop.delivery_note || "De 2 a 5 días hábiles"}</dd></div>
              <div className="flex gap-4 py-1.5"><dt className="w-44 shrink-0 text-muted">Devoluciones</dt><dd>{shop.return_policy || "Según la Ley Federal de Protección al Consumidor."}</dd></div>
            </dl>
            <div className="p-5">
              <Link href={`/shop/${shop.slug}/legal`} className="link text-sm font-bold">
                Ver información del vendedor y datos fiscales →
              </Link>
            </div>
          </div>
        ) : (
          <ItemGrid
            items={items}
            empty={active === "sold" ? "Esta tienda aún no registra ventas." : "Esta tienda todavía no publica productos."}
          />
        )}
      </div>
    </>
  );
}
