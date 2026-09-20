import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { allBrands, categoryTree, draftsOf } from "@/lib/queries";
import { saveItemAction } from "@/lib/actions";
import { SellForm, type CatNode } from "@/components/SellForm";

export const metadata = { title: "Vender un artículo" };

export default async function SellPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/sell");
  const drafts = draftsOf(user.id);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-xl font-bold">Publicar un artículo</h1>
      <p className="mt-1 text-sm text-muted">
        Publicar es gratis. Solo pagamos una comisión del 10 % cuando se vende.
      </p>
      {drafts.length > 0 && (
        <p className="mt-3 rounded-lg bg-brand-soft px-4 py-3 text-sm text-brand-darker">
          Tienes {drafts.length} borrador{drafts.length === 1 ? "" : "es"} sin publicar.{" "}
          <Link href="/mypage/drafts" className="font-bold underline">Ver borradores</Link>
        </p>
      )}
      <div className="mt-5">
        <SellForm
          action={saveItemAction}
          categories={categoryTree()}
          brands={allBrands()}
          defaultRegion={user.addr_region}
        />
      </div>
    </div>
  );
}
