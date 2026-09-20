import Link from "next/link";
import { allCollectives } from "@/lib/queries";

export const metadata = { title: "Colectivos de tiendas" };

export default async function CollectivesPage() {
  const collectives = allCollectives();

  return (
    <>
      <section className="rounded-2xl bg-gradient-to-br from-brand to-brand-darker p-6 text-white">
        <p className="text-xs font-bold text-white/80">Mercado Shops</p>
        <h1 className="mt-1 text-2xl font-black">Colectivos de tiendas</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/85">
          Mercados, corredores comerciales y alianzas de oficio que venden juntos: comparten
          escaparate, se surten entre ellos y arman paquetes cruzados.
        </p>
        <Link href="/mypage/shop/collectives" className="mt-4 inline-flex rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-brand-darker">
          Crear o unirme a un colectivo
        </Link>
      </section>

      {collectives.length === 0 ? (
        <p className="card mt-5 p-10 text-center text-sm text-muted">Todavía no hay colectivos.</p>
      ) : (
        <ul className="mt-5 grid gap-2 sm:grid-cols-2">
          {collectives.map((collective) => (
            <li key={collective.id}>
              <Link href={`/colectivo/${collective.slug}`} className="card flex items-center gap-3 p-4 hover:border-brand">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-2xl">
                  {collective.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{collective.name}</span>
                  <span className="block truncate text-xs text-muted">{collective.region || "Todo México"}</span>
                  <span className="mt-1 block text-[11px] text-muted">
                    {collective.members} tiendas · {collective.products} productos
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
