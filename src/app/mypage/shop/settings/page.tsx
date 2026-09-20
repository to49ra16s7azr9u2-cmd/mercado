import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { shopOfUser } from "@/lib/queries";
import { updateShopAction } from "@/lib/actions";
import { ShopForm } from "@/components/ShopForms";

export const metadata = { title: "Configuración de la tienda" };

export default async function ShopSettingsPage() {
  const user = await requireUser("/mypage/shop/settings");
  const shop = shopOfUser(user.id);
  if (!shop) redirect("/mypage/shop");

  return (
    <>
      <h1 className="text-xl font-bold">Configuración de la tienda</h1>
      <div className="mt-4">
        <ShopForm action={updateShopAction} cta="Guardar cambios" shop={shop} />
      </div>
    </>
  );
}
