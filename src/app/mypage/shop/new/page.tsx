import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { shopOfUser } from "@/lib/queries";
import { createShopAction } from "@/lib/actions";
import { ShopForm } from "@/components/ShopForms";

export const metadata = { title: "Abrir tienda · Mercado Shops" };

export default async function NewShopPage() {
  const user = await requireUser("/mypage/shop/new");
  if (shopOfUser(user.id)) redirect("/mypage/shop");

  return (
    <>
      <h1 className="text-xl font-bold">Abrir mi tienda</h1>
      <p className="mt-1 text-sm text-muted">
        Registra los datos de tu negocio. Revisamos la solicitud y activamos la tienda.
      </p>
      <div className="mt-4">
        <ShopForm action={createShopAction} cta="Enviar solicitud" />
      </div>
    </>
  );
}
