import Link from "next/link";
import { currentUser } from "@/lib/auth";
import {
  activeShops,
  itemsFromFollowed,
  itemsFromFollowedShops,
  shopItemsForHome,
  popularKeywords,
  recentItems,
  recommendedFor,
  rootCategories,
  searchItems,
  trendingItems,
} from "@/lib/queries";
import { ItemGrid, ItemRow } from "@/components/ItemCard";
import { Section } from "@/components/Section";
import { ShopCard } from "@/components/ShopCard";

const BANNERS = [
  { title: "Vende lo que ya no usas", body: "Publica en menos de 2 minutos y cobra sin complicaciones.", cta: "Empezar a vender", href: "/sell", emoji: "📸" },
  { title: "Envíos protegidos", body: "Con seguimiento, anónimos y con garantía de entrega.", cta: "Ver métodos de envío", href: "/guide#envios", emoji: "🚚" },
  { title: "$100 de regalo", body: "Usa el cupón BIENVENIDA100 en tu primera compra desde $400.", cta: "Ver cupones", href: "/mypage/coupons", emoji: "🎁" },
  { title: "Mercado Shops", body: "Negocios con inventario, variantes y meses sin intereses.", cta: "Explorar tiendas", href: "/shops", emoji: "🏪" },
];

export default async function HomePage() {
  const user = await currentUser();
  const categories = rootCategories();
  const recent = recentItems(20);
  const trending = trendingItems(12);
  const recommended = user ? recommendedFor(user.id, 20) : recentItems(20);
  const following = user ? itemsFromFollowed(user.id, 12) : [];
  const freeShipping = searchItems({ shippingPayer: "seller", status: "on_sale", perPage: 12 }).items;
  const shopProducts = shopItemsForHome(12);
  const shops = activeShops().slice(0, 4);
  const followedShopItems = user ? itemsFromFollowedShops(user.id, 12) : [];
  const bargains = searchItems({ status: "on_sale", sort: "price_asc", perPage: 12 }).items;

  return (
    <>
      <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {BANNERS.map((b) => (
          <Link
            key={b.title}
            href={b.href}
            className="flex w-[85%] shrink-0 snap-start items-center gap-4 rounded-2xl bg-gradient-to-br from-brand to-brand-darker p-5 text-white sm:w-[48%] lg:w-[32%]"
          >
            <span className="text-4xl" aria-hidden>{b.emoji}</span>
            <span>
              <span className="block text-base font-bold">{b.title}</span>
              <span className="mt-0.5 block text-xs text-white/85">{b.body}</span>
              <span className="mt-2 inline-block rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold">
                {b.cta} →
              </span>
            </span>
          </Link>
        ))}
      </div>

      <section className="mt-6">
        <h2 className="section-title">Categorías</h2>
        <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              className="flex w-[74px] shrink-0 flex-col items-center gap-1.5 text-center"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-2xl">
                {cat.icon}
              </span>
              <span className="text-[11px] leading-tight text-ink">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="section-title">Búsquedas populares</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {popularKeywords().map((k) => (
            <Link key={k} href={`/search?q=${encodeURIComponent(k)}`} className="chip hover:border-brand">
              🔍 {k}
            </Link>
          ))}
        </div>
      </section>

      {user && following.length > 0 && (
        <Section title="Novedades de quien sigues" href="/mypage/follows">
          <ItemRow items={following} />
        </Section>
      )}

      {followedShopItems.length > 0 && (
        <Section title="Novedades de tus tiendas" href="/mypage/shops">
          <ItemRow items={followedShopItems} />
        </Section>
      )}

      {shopProducts.length > 0 && (
        <Section
          title="Mercado Shops"
          subtitle="Productos de negocios con inventario y factura"
          href="/shops"
        >
          <ItemRow items={shopProducts} />
          {shops.length > 0 && (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {shops.map((shop) => (
                <li key={shop.id}>
                  <ShopCard shop={shop} items={shop.items} followers={shop.followers} />
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      <Section title="Lo más buscado ahora" subtitle="Los artículos con más favoritos" href="/search?sort=likes">
        <ItemRow items={trending} />
      </Section>

      <Section title="Con envío gratis" href="/search?shipping=seller">
        <ItemRow items={freeShipping} />
      </Section>

      <Section title="Chollos por menos de nada" href="/search?sort=price_asc">
        <ItemRow items={bargains} />
      </Section>

      <Section
        title={user ? "Recomendado para ti" : "Recién publicado"}
        subtitle={user ? "Según lo que has visto y guardado" : "Lo último que ha llegado a Mercado"}
        href="/search"
      >
        <ItemGrid items={user ? recommended : recent} />
      </Section>

      <div className="mt-8 rounded-2xl border border-line bg-white p-6 text-center">
        <p className="text-lg font-bold">¿Tienes algo guardado en el armario?</p>
        <p className="mt-1 text-sm text-muted">
          Publícalo gratis. Solo pagas una comisión del 10 % cuando vendes.
        </p>
        <Link href="/sell" className="btn-primary mt-4 inline-flex">Publicar un artículo</Link>
      </div>
    </>
  );
}
