import { currentUser } from "@/lib/auth";
import { purchasesOf } from "@/lib/queries";
import { OrderList } from "@/components/OrderList";

export const metadata = { title: "Mis compras" };

export default async function PurchasesPage() {
  const user = (await currentUser())!;
  return (
    <>
      <h1 className="text-xl font-bold">Mis compras</h1>
      <OrderList orders={purchasesOf(user.id)} empty="Todavía no has comprado nada en Mercado." />
    </>
  );
}
