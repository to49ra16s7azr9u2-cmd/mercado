import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { shopOfUser, supplierShops } from "@/lib/queries";
import { SHOP_CATEGORIES } from "@/lib/constants";
import { money } from "@/lib/format";

export const metadata = { title: "Mayoreo entre tiendas" };

export default async function WholesaleDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string }>;
}) {
  const { q, cat } = await searchParams;
  const user = await currentUser();
  const myShop = user ? shopOfUser(user.id) : undefined;
  const suppliers = supplierShops(q, cat).filter((s) => s.id !== myShop?.id);

  return (
    <>
      <section className="rounded-2xl bg-gradient-to-br from-brand to-brand-darker p-6 text-white">
        <p className="text-xs font-bold text-white/80">Mercado Shops · Mayoreo</p>
        <h1 className="mt-1 text-2xl font-black">Surte tu negocio con otras tiendas</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/85">
          Pide acceso a un proveedor, revisa sus precios por volumen y haz pedidos con la misma
          protección de Mercado. La comisión en mayoreo es del 5 %.
        </p>
        {!myShop && (
          <Link href="/mypage/shop/new" className="mt-4 inline-flex rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-brand-darker">
            Abre tu tienda para comprar en mayoreo
          </Link>
        )}
      </section>

      <form action="/mayoreo" method="get" className="mt-5 flex gap-2">
        <input name="q" defaultValue={q ?? ""} className="input" placeholder="Buscar proveedores" />
        <button type="submit" className="btn-primary">Buscar</button>
      </form>

      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
        <Link href="/mayoreo" className={`chip whitespace-nowrap ${!cat ? "chip-active" : ""}`}>Todos los giros</Link>
        {SHOP_CATEGORIES.map((category) => (
          <Link key={category} href={`/mayoreo?cat=${encodeURIComponent(category)}`}
            className={`chip whitespace-nowrap ${cat === category ? "chip-active" : ""}`}>
            {category}
          </Link>
        ))}
      </div>

      {suppliers.length === 0 ? (
        <p className="card mt-4 p-10 text-center text-sm text-muted">
          Todavía no hay proveedores con ese criterio.
        </p>
      ) : (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {suppliers.map((supplier) => (
            <li key={supplier.id}>
              <Link href={`/mayoreo/${supplier.slug}`} className="card flex items-center gap-3 p-4 hover:border-brand">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-2xl">
                  {supplier.cover_emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{supplier.name}</span>
                  <span className="block truncate text-xs text-muted">{supplier.category} · {supplier.ship_from}</span>
                  <span className="mt-1 block text-[11px] text-muted">
                    {supplier.products} productos en mayoreo · desde {money(supplier.min_price)} por pieza
                  </span>
                </span>
                <span className="chip chip-active shrink-0">Mayoreo</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
