import { currentUser } from "@/lib/auth";
import { likedItems } from "@/lib/queries";
import { ItemGrid } from "@/components/ItemCard";

export const metadata = { title: "Favoritos" };

export default async function LikesPage() {
  const user = (await currentUser())!;
  const items = likedItems(user.id);
  return (
    <>
      <h1 className="text-xl font-bold">Favoritos</h1>
      <p className="mt-1 text-sm text-muted">
        Te avisamos si baja el precio de alguno de estos artículos.
      </p>
      <div className="mt-4">
        <ItemGrid items={items} empty="Todavía no has guardado ningún artículo." />
      </div>
    </>
  );
}
