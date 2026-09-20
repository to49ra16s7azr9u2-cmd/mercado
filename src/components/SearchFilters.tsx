import Link from "next/link";
import { CONDITIONS, SELLER_FILTERS, SHIPPING_PAYERS, SORTS, STATUS_FILTERS } from "@/lib/constants";
import { allBrands, rootCategories, childCategories, categoryBySlug, categoryPath } from "@/lib/queries";
import { saveSearchAction } from "@/lib/actions";
import { SubmitButton } from "./SubmitButton";

export type ParsedSearch = {
  q: string;
  cat: string;
  brand: string;
  priceMin: string;
  priceMax: string;
  cond: string[];
  shipping: string;
  status: string;
  seller: string;
  sort: string;
  page: number;
};

export function SearchFilters({ params, loggedIn }: { params: ParsedSearch; loggedIn: boolean }) {
  const brands = allBrands();
  const current = params.cat ? categoryBySlug(params.cat) : undefined;
  const path = current ? categoryPath(current.id) : [];
  const siblings = current
    ? childCategories(current.id).length
      ? childCategories(current.id)
      : current.parent_id
        ? childCategories(current.parent_id)
        : rootCategories()
    : rootCategories();

  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.cat) query.set("cat", params.cat);
  if (params.brand) query.set("brand", params.brand);
  if (params.priceMin) query.set("priceMin", params.priceMin);
  if (params.priceMax) query.set("priceMax", params.priceMax);
  for (const c of params.cond) query.append("cond", c);
  if (params.shipping) query.set("shipping", params.shipping);
  if (params.status && params.status !== "all") query.set("status", params.status);
  if (params.seller && params.seller !== "all") query.set("seller", params.seller);
  if (params.sort && params.sort !== "new") query.set("sort", params.sort);

  return (
    <aside className="w-full shrink-0 md:w-60">
      <form action="/search" method="get" className="card divide-y divide-line">
        <input type="hidden" name="q" value={params.q} />
        <div className="p-4">
          <p className="mb-2 text-xs font-bold text-muted">Categoría</p>
          {path.length > 0 && (
            <p className="mb-2 text-[11px] text-muted">
              <Link href="/search" className="link">Todas</Link>
              {path.map((c) => (
                <span key={c.id}> / <Link href={`/category/${c.slug}`} className="link">{c.name}</Link></span>
              ))}
            </p>
          )}
          <ul className="max-h-60 space-y-1 overflow-y-auto pr-1">
            {siblings.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/category/${c.slug}`}
                  className={`block truncate rounded px-1.5 py-1 text-[13px] hover:bg-canvas ${
                    params.cat === c.slug ? "font-bold text-brand-darker" : "text-ink"
                  }`}
                >
                  {c.icon ? `${c.icon} ` : ""}{c.name}
                </Link>
              </li>
            ))}
          </ul>
          <input type="hidden" name="cat" value={params.cat} />
        </div>

        <div className="p-4">
          <label className="label" htmlFor="brand">Marca</label>
          <select id="brand" name="brand" defaultValue={params.brand} className="input">
            <option value="">Todas las marcas</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        <div className="p-4">
          <p className="label">Precio</p>
          <div className="flex items-center gap-2">
            <input name="priceMin" defaultValue={params.priceMin} inputMode="numeric" placeholder="Mín." className="input" />
            <span className="text-muted">–</span>
            <input name="priceMax" defaultValue={params.priceMax} inputMode="numeric" placeholder="Máx." className="input" />
          </div>
        </div>

        <fieldset className="p-4">
          <legend className="label">Estado del artículo</legend>
          <div className="space-y-1.5">
            {CONDITIONS.map((c) => (
              <label key={c.value} className="flex items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  name="cond"
                  value={c.value}
                  defaultChecked={params.cond.includes(String(c.value))}
                  className="accent-[#06c755]"
                />
                {c.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="p-4">
          <legend className="label">Costo de envío</legend>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-[13px]">
              <input type="radio" name="shipping" value="" defaultChecked={!params.shipping} className="accent-[#06c755]" />
              Indiferente
            </label>
            {SHIPPING_PAYERS.map((s) => (
              <label key={s.value} className="flex items-center gap-2 text-[13px]">
                <input type="radio" name="shipping" value={s.value} defaultChecked={params.shipping === s.value} className="accent-[#06c755]" />
                {s.short}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="p-4">
          <legend className="label">Tipo de vendedor</legend>
          <div className="space-y-1.5">
            {SELLER_FILTERS.map((s) => (
              <label key={s.value} className="flex items-center gap-2 text-[13px]">
                <input type="radio" name="seller" value={s.value} defaultChecked={(params.seller || "all") === s.value} className="accent-[#06c755]" />
                {s.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="p-4">
          <legend className="label">Disponibilidad</legend>
          <div className="space-y-1.5">
            {STATUS_FILTERS.map((s) => (
              <label key={s.value} className="flex items-center gap-2 text-[13px]">
                <input type="radio" name="status" value={s.value} defaultChecked={(params.status || "all") === s.value} className="accent-[#06c755]" />
                {s.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="p-4">
          <label className="label" htmlFor="sort">Ordenar por</label>
          <select id="sort" name="sort" defaultValue={params.sort} className="input">
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2 p-4">
          <SubmitButton className="btn-primary w-full">Aplicar filtros</SubmitButton>
          <Link href="/search" className="btn-ghost w-full">Borrar filtros</Link>
        </div>
      </form>

      {loggedIn && (
        <form action={saveSearchAction} className="card mt-3 p-4">
          <input type="hidden" name="query" value={`?${query.toString()}`} />
          <input
            name="label"
            className="input"
            placeholder="Nombre de la búsqueda"
            defaultValue={params.q || "Búsqueda guardada"}
          />
          <SubmitButton className="btn-outline mt-2 w-full">🔔 Guardar esta búsqueda</SubmitButton>
          <p className="mt-2 text-[11px] text-muted">
            Te avisaremos cuando se publiquen artículos que encajen.
          </p>
        </form>
      )}
    </aside>
  );
}
