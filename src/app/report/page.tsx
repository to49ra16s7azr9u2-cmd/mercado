import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { reportAction } from "@/lib/actions";
import { ReportForm } from "@/components/ReportForm";

export const metadata = { title: "Denunciar" };

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ target?: string; id?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login?next=/report");
  const { target, id } = await searchParams;

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-xl font-bold">Denunciar un contenido</h1>
      <p className="mt-1 text-sm text-muted">
        Revisamos todas las denuncias. Tus datos no se comparten con la persona denunciada.
      </p>
      <div className="mt-4">
        <ReportForm action={reportAction} target={target ?? "item"} targetId={id ?? ""} />
      </div>
    </div>
  );
}
