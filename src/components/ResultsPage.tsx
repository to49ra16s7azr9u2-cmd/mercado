import Link from "next/link";
import { searchItems } from "@/lib/queries";
import { ItemGrid } from "./ItemCard";
import { Pagination } from "./Pagination";
import { SearchFilters, type ParsedSearch } from "./SearchFilters";
import { SORTS } from "@/lib/constants";

const PER_PAGE = 24;

export function parseSearchParams(sp: Record<string, string | string[] | undefined>): ParsedSearch {
  const one = (key: string) => {
    const value = sp[key];
    return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
  };
  const many = (key: string) => {
    const value = sp[key];
    return Array.isArray(value) ? value : value ? [value] : [];
  };
  return {
    q: one("q"),
    cat: one("cat"),
    brand: one("brand"),
    priceMin: one("priceMin"),
    priceMax: one("priceMax"),
    cond: many("cond"),
    shipping: one("shipping"),
    status: one("status") || "all",
    seller: one("seller") || "all",
    sort: one("sort") || "new",
    page: Math.max(1, Number(one("page")) || 1),
  };
}

export function ResultsPage({
  params,
  title,
  description,
  loggedIn,
  breadcrumb,
}: {
  params: ParsedSearch;
  title: string;
  description?: string;
  loggedIn: boolean;
  breadcrumb?: { href: string; label: string }[];
}) {
  const { items, total } = searchItems({
    q: params.q || undefined,
    categorySlug: params.cat || undefined,
    brandId: params.brand ? Number(params.brand) : undefined,
    priceMin: params.priceMin ? Number(params.priceMin) : undefined,
    priceMax: params.priceMax ? Number(params.priceMax) : undefined,
    conditions: params.cond.map(Number).filter(Boolean),
    shippingPayer: params.shipping || undefined,
    status: params.status,
    sellerKind: params.seller === "all" ? undefined : params.seller,
    sort: params.sort,
    page: params.page,
    perPage: PER_PAGE,
  });

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "page") continue;
    if (Array.isArray(value)) value.forEach((v) => query.append(key, v));
    else if (value) query.set(key, String(value));
  }

  return (
    <div className="md:flex md:gap-6">
      <SearchFilters params={params} loggedIn={loggedIn} />
      <div className="mt-4 min-w-0 flex-1 md:mt-0">
        {breadcrumb && breadcrumb.length > 0 && (
          <nav className="mb-2 text-xs text-muted" aria-label="Ruta de navegación">
            <Link href="/" className="link">Inicio</Link>
            {breadcrumb.map((b) => (
              <span key={b.href}> / <Link href={b.href} className="link">{b.label}</Link></span>
            ))}
          </nav>
        )}
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-lg font-bold">{title}</h1>
            <p className="text-xs text-muted">
              {total.toLocaleString("es-ES")} artículo{total === 1 ? "" : "s"}
              {description ? ` · ${description}` : ""}
            </p>
          </div>
          <div className="flex gap-1.5 text-xs">
            {SORTS.slice(0, 4).map((s) => {
              const next = new URLSearchParams(query);
              next.set("sort", s.value);
              return (
                <Link
                  key={s.value}
                  href={`/search?${next.toString()}`}
                  className={`chip ${params.sort === s.value ? "chip-active" : ""}`}
                >
                  {s.label}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="mt-4">
          <ItemGrid
            items={items}
            empty="No hemos encontrado artículos con esos filtros. Prueba a quitar alguno."
          />
        </div>
        <Pagination page={params.page} total={total} perPage={PER_PAGE} baseQuery={query} />
      </div>
    </div>
  );
}
