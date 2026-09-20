import Link from "next/link";
import { activeShops } from "@/lib/queries";
import { ShopCard } from "@/components/ShopCard";
import { SHOP_CATEGORIES } from "@/lib/constants";

export const metadata = { title: "Mercado Shops" };

export default async function ShopsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string }>;
}) {
  const { q, cat } = await searchParams;
  const shops = activeShops(q, cat);

  return (
    <>
      <section className="rounded-2xl bg-gradient-to-br from-brand to-brand-darker p-6 text-white">
        <p className="text-xs font-bold text-white/80">Mercado Shops</p>
        <h1 className="mt-1 text-2xl font-black">Tiendas que venden en Mercado</h1>
        <p className="mt-2 max-w-xl text-sm text-white/85">
          Negocios y creadores con inventario, variantes de talla o color, factura y datos
          fiscales públicos. Compra varias piezas del mismo producto en un solo pedido.
        </p>
        <Link href="/mypage/shop/new" className="mt-4 inline-flex rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-brand-darker">
          Abrir mi tienda gratis
        </Link>
      </section>

      <form action="/shops" method="get" className="mt-5 flex gap-2">
        <input name="q" defaultValue={q ?? ""} className="input" placeholder="Buscar tiendas por nombre" />
        <button type="submit" className="btn-primary">Buscar</button>
      </form>

      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
        <Link href="/shops" className={`chip whitespace-nowrap ${!cat ? "chip-active" : ""}`}>Todos los giros</Link>
        {SHOP_CATEGORIES.map((category) => (
          <Link
            key={category}
            href={`/shops?cat=${encodeURIComponent(category)}`}
            className={`chip whitespace-nowrap ${cat === category ? "chip-active" : ""}`}
          >
            {category}
          </Link>
        ))}
      </div>

      {shops.length === 0 ? (
        <p className="card mt-4 p-10 text-center text-sm text-muted">
          Todavía no hay tiendas con ese criterio.
        </p>
      ) : (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {shops.map((shop) => (
            <li key={shop.id}>
              <ShopCard shop={shop} items={shop.items} followers={shop.followers} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
