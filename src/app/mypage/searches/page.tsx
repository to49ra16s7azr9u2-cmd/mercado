import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { savedSearchesOf } from "@/lib/queries";
import { deleteSavedSearchAction, toggleSearchNotifyAction } from "@/lib/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { shortDate } from "@/lib/format";

export const metadata = { title: "Búsquedas guardadas" };

export default async function SearchesPage() {
  const user = await requireUser("/mypage/searches");
  const searches = savedSearchesOf(user.id);

  return (
    <>
      <h1 className="text-xl font-bold">Búsquedas guardadas</h1>
      <p className="mt-1 text-sm text-muted">
        Te avisamos cuando se publica algo que encaja con estos criterios.
      </p>
      {searches.length === 0 ? (
        <p className="card mt-4 p-8 text-center text-sm text-muted">
          Guarda una búsqueda desde la página de resultados para recibir avisos.
        </p>
      ) : (
        <ul className="card mt-4 divide-y divide-line">
          {searches.map((search) => (
            <li key={search.id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <Link href={`/search${search.query}`} className="block truncate text-sm font-bold hover:underline">
                  {search.label}
                </Link>
                <p className="truncate text-xs text-muted">
                  Guardada el {shortDate(search.created_at)} · {search.notify ? "avisos activados" : "avisos desactivados"}
                </p>
              </div>
              <form action={toggleSearchNotifyAction}>
                <input type="hidden" name="id" value={search.id} />
                <SubmitButton className={search.notify ? "btn-outline px-3 py-1.5 text-xs" : "btn-ghost px-3 py-1.5 text-xs"}>
                  {search.notify ? "🔔 Activados" : "🔕 Desactivados"}
                </SubmitButton>
              </form>
              <form action={deleteSavedSearchAction}>
                <input type="hidden" name="id" value={search.id} />
                <SubmitButton className="btn-ghost px-3 py-1.5 text-xs">Eliminar</SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
