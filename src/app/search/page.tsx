import { currentUser } from "@/lib/auth";
import { ResultsPage, parseSearchParams } from "@/components/ResultsPage";

export const metadata = { title: "Buscar artículos" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const params = parseSearchParams(sp);
  const user = await currentUser();
  return (
    <ResultsPage
      params={params}
      loggedIn={!!user}
      title={params.q ? `Resultados para «${params.q}»` : "Todos los artículos"}
    />
  );
}
