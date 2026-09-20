import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { allBrands, categoryTree, itemById, itemImages, shopOfUser, variantsOf } from "@/lib/queries";
import { saveShopItemAction } from "@/lib/actions";
import { ShopItemForm } from "@/components/ShopForms";

export const metadata = { title: "Editar producto · Mercado Shops" };

export default async function EditShopItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser("/mypage/shop/items/edit");
  const shop = shopOfUser(user.id);
  if (!shop) redirect("/mypage/shop");
  const item = itemById(id);
  if (!item) notFound();
  if (item.seller_id !== user.id) redirect("/mypage/shop/items");

  return (
    <>
      <h1 className="text-xl font-bold">Editar producto</h1>
      <div className="mt-4">
        <ShopItemForm
          action={saveShopItemAction}
          categories={categoryTree()}
          brands={allBrands()}
          defaultRegion={shop.ship_from || user.addr_region}
          item={{
            id: item.id,
            title: item.title,
            description: item.description,
            price: item.price,
            category_id: item.category_id,
            brand_id: item.brand_id,
            size: item.size,
            color: item.color,
            stock: item.stock,
            shipping_payer: item.shipping_payer,
            shipping_method: item.shipping_method,
            ship_from: item.ship_from,
            ship_days: item.ship_days,
            images: itemImages(item.id).map((img) => ({ id: img.id, url: img.url })),
            variants: variantsOf(item.id).map((v) => ({ label: v.label, stock: v.stock, sku: v.sku })),
          }}
        />
      </div>
    </>
  );
}
