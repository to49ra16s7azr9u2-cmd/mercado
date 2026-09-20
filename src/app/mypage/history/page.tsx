import { currentUser } from "@/lib/auth";
import { historyItems } from "@/lib/queries";
import { clearHistoryAction } from "@/lib/actions";
import { ItemGrid } from "@/components/ItemCard";
import { SubmitButton } from "@/components/SubmitButton";

export const metadata = { title: "Historial de visitas" };

export default async function HistoryPage() {
  const user = (await currentUser())!;
  const items = historyItems(user.id);
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Historial de visitas</h1>
        {items.length > 0 && (
          <form action={clearHistoryAction}>
            <SubmitButton className="btn-ghost text-xs">Borrar historial</SubmitButton>
          </form>
        )}
      </div>
      <div className="mt-4">
        <ItemGrid items={items} empty="Aquí aparecerán los artículos que visites." />
      </div>
    </>
  );
}
