import Link from "next/link";
import type { Shop } from "@/lib/types";

export function ShopCard({
  shop,
  items,
  followers,
}: {
  shop: Shop;
  items?: number;
  followers?: number;
}) {
  return (
    <Link
      href={`/shop/${shop.slug}`}
      className="card flex items-center gap-3 p-4 transition-shadow hover:shadow-md"
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-2xl">
        {shop.cover_emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold">{shop.name}</span>
        <span className="block truncate text-xs text-muted">{shop.category}</span>
        <span className="mt-1 block text-[11px] text-muted">
          {items ?? 0} productos · {followers ?? 0} seguidores · {shop.ship_from || "México"}
        </span>
      </span>
      <span className="chip chip-active shrink-0">Shops</span>
    </Link>
  );
}
