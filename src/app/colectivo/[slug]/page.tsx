import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import {
  collectiveBySlug, collectiveItems, collectiveMembers, isCollectiveMember, shopOfUser,
} from "@/lib/queries";
import { toggleCollectiveMembershipAction } from "@/lib/actions";
import { ItemGrid } from "@/components/ItemCard";
import { SubmitButton } from "@/components/SubmitButton";
import { shortDate } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const collective = collectiveBySlug(slug);
  return { title: collective ? collective.name : "Colectivo" };
}

export default async function CollectivePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const collective = collectiveBySlug(slug);
  if (!collective) notFound();

  const user = await currentUser();
  const myShop = user ? shopOfUser(user.id) : undefined;
  const members = collectiveMembers(collective.id);
  const items = collectiveItems(collective.id);
  const isMember = myShop ? isCollectiveMember(collective.id, myShop.id) : false;

  return (
    <>
      <section className="card overflow-hidden">
        <div className="flex items-center gap-4 bg-gradient-to-br from-brand to-brand-darker p-5 text-white">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-3xl">
            {collective.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-white/80">Colectivo de tiendas</p>
            <h1 className="truncate text-xl font-black">{collective.name}</h1>
            <p className="truncate text-xs text-white/85">
              {collective.region || "Todo México"} · {members.length} tiendas · desde {shortDate(collective.created_at)}
            </p>
          </div>
          {myShop && (
            <form action={toggleCollectiveMembershipAction}>
              <input type="hidden" name="collective_id" value={collective.id} />
              <input type="hidden" name="slug" value={collective.slug} />
              <SubmitButton
                className={
                  isMember
                    ? "rounded-lg border border-white/60 px-4 py-2 text-sm font-bold text-white"
                    : "rounded-lg bg-white px-4 py-2 text-sm font-bold text-brand-darker"
                }
              >
                {isMember ? "Salir del colectivo" : "Unir mi tienda"}
              </SubmitButton>
            </form>
          )}
        </div>
        {collective.description && (
          <p className="p-5 text-sm leading-relaxed text-muted">{collective.description}</p>
        )}
      </section>

      <section className="mt-5">
        <h2 className="section-title">Tiendas del colectivo</h2>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {members.map((member) => (
            <li key={member.id}>
              <Link href={`/shop/${member.slug}`} className="card flex items-center gap-3 p-3 hover:border-brand">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-lg">
                  {member.cover_emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{member.name}</span>
                  <span className="block truncate text-xs text-muted">
                    {member.category} · {member.products} productos
                  </span>
                </span>
                {member.role === "owner" && <span className="chip shrink-0">Administra</span>}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="section-title">Escaparate del colectivo</h2>
        <div className="mt-3">
          <ItemGrid items={items} empty="Las tiendas del colectivo todavía no publican productos." />
        </div>
      </section>
    </>
  );
}
