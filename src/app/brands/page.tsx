import Link from "next/link";
import { allBrands, searchItems } from "@/lib/queries";

export const metadata = { title: "Marcas" };

export default function BrandsPage() {
  const brands = allBrands().map((brand) => ({
    ...brand,
    count: searchItems({ brandId: brand.id, status: "on_sale", perPage: 1 }).total,
  }));

  return (
    <>
      <h1 className="text-xl font-bold">Marcas</h1>
      <p className="mt-1 text-sm text-muted">Explora los artículos disponibles por marca.</p>
      <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {brands.map((brand) => (
          <li key={brand.id}>
            <Link
              href={`/search?brand=${brand.id}`}
              className="card flex items-center justify-between p-4 text-sm hover:border-brand"
            >
              <span className="truncate font-bold">{brand.name}</span>
              <span className="shrink-0 text-xs text-muted">{brand.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
