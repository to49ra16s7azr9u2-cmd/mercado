import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { allBrands, categoryTree, itemById, itemImages } from "@/lib/queries";
import { saveItemAction } from "@/lib/actions";
import { SellForm } from "@/components/SellForm";

export const metadata = { title: "Editar artículo" };

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect(`/login?next=/sell/${id}/edit`);
  const item = itemById(id);
  if (!item) notFound();
  if (item.seller_id !== user.id) redirect(`/item/${id}`);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-xl font-bold">Editar artículo</h1>
      <p className="mt-1 text-sm text-muted">Los cambios se aplican al instante en tu anuncio.</p>
      <div className="mt-5">
        <SellForm
          action={saveItemAction}
          categories={categoryTree()}
          brands={allBrands()}
          defaultRegion={user.addr_region}
          item={{
            id: item.id,
            title: item.title,
            description: item.description,
            price: item.price,
            category_id: item.category_id,
            brand_id: item.brand_id,
            size: item.size,
            color: item.color,
            condition: item.condition,
            shipping_payer: item.shipping_payer,
            shipping_method: item.shipping_method,
            ship_from: item.ship_from,
            ship_days: item.ship_days,
            offers_enabled: item.offers_enabled,
            images: itemImages(item.id).map((img) => ({ id: img.id, url: img.url })),
          }}
        />
      </div>
    </div>
  );
}
