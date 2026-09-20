import { currentUser } from "@/lib/auth";
import { salesOf } from "@/lib/queries";
import { OrderList } from "@/components/OrderList";

export const metadata = { title: "Mis ventas" };

export default async function SalesPage() {
  const user = (await currentUser())!;
  return (
    <>
      <h1 className="text-xl font-bold">Mis ventas</h1>
      <OrderList orders={salesOf(user.id)} empty="Todavía no has vendido nada. ¡Publica tu primer artículo!" />
    </>
  );
}
