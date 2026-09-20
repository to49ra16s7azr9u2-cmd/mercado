import { requireUser } from "@/lib/auth";
import { followedShops, shopStats } from "@/lib/queries";
import { ShopCard } from "@/components/ShopCard";

export const metadata = { title: "Tiendas que sigo" };

export default async function FollowedShopsPage() {
  const user = await requireUser("/mypage/shops");
  const shops = followedShops(user.id);

  return (
    <>
      <h1 className="text-xl font-bold">Tiendas que sigo</h1>
      <p className="mt-1 text-sm text-muted">
        Te avisamos cuando estas tiendas publican productos nuevos.
      </p>
      {shops.length === 0 ? (
        <p className="card mt-4 p-8 text-center text-sm text-muted">
          Todavía no sigues ninguna tienda de Mercado Shops.
        </p>
      ) : (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {shops.map((shop) => {
            const stats = shopStats(shop.id);
            return (
              <li key={shop.id}>
                <ShopCard shop={shop} items={stats.items} followers={stats.followers} />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
