import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { importJobsOf, shopOfUser } from "@/lib/queries";
import { importCatalogAction } from "@/lib/actions";
import { ImportForm } from "@/components/NetworkForms";
import { longDate } from "@/lib/format";

export const metadata = { title: "Importar catálogo" };

export default async function ImportPage() {
  const user = await requireUser("/mypage/shop/import");
  const shop = shopOfUser(user.id);
  if (!shop) redirect("/mypage/shop");
  const jobs = importJobsOf(shop.id);

  return (
    <>
      <h1 className="text-xl font-bold">Importar y exportar catálogo</h1>
      <p className="mt-1 text-sm text-muted">
        Sube tu inventario desde Excel o desde el sistema que ya usas, y descárgalo cuando quieras.
      </p>
      <div className="mt-4">
        <ImportForm action={importCatalogAction} />
      </div>

      <section className="mt-6">
        <h2 className="section-title">Historial de importaciones</h2>
        {jobs.length === 0 ? (
          <p className="card mt-2 p-6 text-center text-sm text-muted">Todavía no importas catálogos.</p>
        ) : (
          <ul className="card mt-2 divide-y divide-line">
            {jobs.map((job) => (
              <li key={job.id} className="p-4 text-sm">
                <p className="font-bold">{job.filename}</p>
                <p className="text-xs text-muted">
                  {longDate(job.created_at)} · {job.created} nuevos · {job.updated} actualizados ·{" "}
                  {job.skipped} omitidos
                </p>
                {job.errors && <p className="mt-1 text-xs text-red-600">{job.errors}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
