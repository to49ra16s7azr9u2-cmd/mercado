import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { allBrands, categoryTree, shopOfUser } from "@/lib/queries";
import { saveShopItemAction } from "@/lib/actions";
import { ShopItemForm } from "@/components/ShopForms";

export const metadata = { title: "Publicar producto · Mercado Shops" };

export default async function NewShopItemPage() {
  const user = await requireUser("/mypage/shop/items/new");
  const shop = shopOfUser(user.id);
  if (!shop) redirect("/mypage/shop");

  if (shop.status !== "active") {
    return (
      <>
        <h1 className="text-xl font-bold">Publicar producto</h1>
        <p className="card mt-4 p-6 text-sm text-muted">
          Tu tienda todavía está en revisión.{" "}
          <Link href="/mypage/shop" className="link font-bold">Ver el estado de la solicitud</Link>
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="text-xl font-bold">Publicar producto</h1>
      <p className="mt-1 text-sm text-muted">Los productos de tienda admiten inventario y variantes.</p>
      <div className="mt-4">
        <ShopItemForm
          action={saveShopItemAction}
          categories={categoryTree()}
          brands={allBrands()}
          defaultRegion={shop.ship_from || user.addr_region}
        />
      </div>
    </>
  );
}
