import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { draftsOf } from "@/lib/queries";
import { deleteItemAction } from "@/lib/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { timeAgo } from "@/lib/format";

export const metadata = { title: "Borradores" };

export default async function DraftsPage() {
  const user = (await currentUser())!;
  const drafts = draftsOf(user.id);

  return (
    <>
      <h1 className="text-xl font-bold">Borradores</h1>
      <p className="mt-1 text-sm text-muted">Termina de rellenar estos artículos para publicarlos.</p>
      {drafts.length === 0 ? (
        <p className="card mt-4 p-8 text-center text-sm text-muted">No tienes borradores guardados.</p>
      ) : (
        <ul className="card mt-4 divide-y divide-line">
          {drafts.map((draft) => (
            <li key={draft.id} className="flex items-center gap-3 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={draft.image ?? "/api/photo?seed=draft&e=%F0%9F%93%9D"} alt="" className="h-14 w-14 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{draft.title || "Sin título"}</p>
                <p className="text-xs text-muted">Guardado {timeAgo(draft.updated_at)}</p>
              </div>
              <Link href={`/sell/${draft.id}/edit`} className="btn-outline px-3 py-1.5 text-xs">Continuar</Link>
              <form action={deleteItemAction}>
                <input type="hidden" name="id" value={draft.id} />
                <SubmitButton className="btn-ghost px-3 py-1.5 text-xs">Borrar</SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
