import Link from "next/link";
import type { ItemCard as ItemCardType } from "@/lib/types";
import { money } from "@/lib/format";

export function ItemCard({ item, compact = false }: { item: ItemCardType; compact?: boolean }) {
  const sold = item.status === "sold" || item.status === "trading";
  return (
    <Link
      href={`/item/${item.id}`}
      className="group block overflow-hidden rounded-xl border border-line bg-white transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-canvas">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.image ?? "/api/photo?seed=empty&e=%F0%9F%93%A6"}
          alt={item.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          loading="lazy"
        />
        {sold && (
          <span className="sold-ribbon absolute left-0 top-0 rounded-br-xl px-3 py-1 text-[11px] font-bold text-white">
            VENDIDO
          </span>
        )}
        {item.status === "stopped" && (
          <span className="absolute left-0 top-0 rounded-br-xl bg-muted px-3 py-1 text-[11px] font-bold text-white">
            PAUSADO
          </span>
        )}
        {item.status === "draft" && (
          <span className="absolute left-0 top-0 rounded-br-xl bg-ink/70 px-3 py-1 text-[11px] font-bold text-white">
            BORRADOR
          </span>
        )}
        <span className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-bold text-white">
          ♥ {item.likes ?? 0}
        </span>
      </div>
      <div className={compact ? "p-2" : "p-2.5"}>
        {item.shop_slug && (
          <p className="mb-0.5 flex items-center gap-1 truncate text-[10px] font-bold text-brand-darker">
            <span className="rounded bg-brand-soft px-1 py-px">Shops</span>
            <span className="truncate text-muted">{item.shop_name}</span>
          </p>
        )}
        <p className="line-clamp-2 text-[13px] leading-snug text-ink">{item.title}</p>
        <p className="mt-1 text-[15px] font-bold text-ink">{money(item.price)}</p>
        {item.shipping_payer === "seller" && (
          <p className="mt-0.5 text-[11px] font-bold text-brand-darker">Envío gratis</p>
        )}
      </div>
    </Link>
  );
}

export function ItemGrid({
  items,
  empty = "Todavía no hay artículos.",
}: {
  items: ItemCardType[];
  empty?: string;
}) {
  if (!items.length) {
    return (
      <div className="card p-10 text-center text-sm text-muted">{empty}</div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  );
}

export function ItemRow({ items }: { items: ItemCardType[] }) {
  if (!items.length) return null;
  return (
    <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      {items.map((item) => (
        <div key={item.id} className="w-[150px] shrink-0 sm:w-[170px]">
          <ItemCard item={item} compact />
        </div>
      ))}
    </div>
  );
}
