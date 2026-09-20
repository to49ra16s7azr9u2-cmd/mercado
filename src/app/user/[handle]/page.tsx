import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import {
  followCounts, isFollowing, listingsOf, ratingSummary, reviewsOf, userByHandle,
} from "@/lib/queries";
import { toggleFollowAction } from "@/lib/actions";
import { Avatar } from "@/components/Avatar";
import { ItemGrid } from "@/components/ItemCard";
import { SubmitButton } from "@/components/SubmitButton";
import { shortDate } from "@/lib/format";

const SCORE: Record<string, string> = { good: "😊 Buena", normal: "😐 Normal", bad: "😞 Mala" };

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const user = userByHandle(handle);
  return { title: user ? user.name : "Perfil" };
}

export default async function UserPage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { handle } = await params;
  const { tab } = await searchParams;
  const profile = userByHandle(handle);
  if (!profile) notFound();

  const me = await currentUser();
  const isMe = me?.id === profile.id;
  const rating = ratingSummary(profile.id);
  const counts = followCounts(profile.id);
  const onSale = listingsOf(profile.id, ["on_sale", "stopped"]);
  const sold = listingsOf(profile.id, ["sold", "trading"]);
  const reviews = reviewsOf(profile.id);
  const following = me ? isFollowing(me.id, profile.id) : false;
  const active = tab === "sold" ? "sold" : tab === "reviews" ? "reviews" : "on_sale";

  return (
    <>
      <section className="card p-5">
        <div className="flex items-start gap-4">
          <Avatar seed={profile.avatar_seed} name={profile.name} size={72} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold">{profile.name}</h1>
            <p className="truncate text-xs text-muted">@{profile.handle}</p>
            <p className="mt-1.5 text-xs text-muted">
              😊 {rating.good} · 😐 {rating.normal} · 😞 {rating.bad} · {counts.followers} seguidores ·{" "}
              {counts.following} siguiendo
            </p>
            <p className="mt-1 text-xs text-muted">
              En Mercado desde {shortDate(profile.created_at)}
              {profile.is_verified ? " · Identidad verificada ✅" : ""}
            </p>
          </div>
          {isMe ? (
            <Link href="/mypage/profile" className="btn-outline">Editar perfil</Link>
          ) : me ? (
            <form action={toggleFollowAction}>
              <input type="hidden" name="user_id" value={profile.id} />
              <input type="hidden" name="handle" value={profile.handle} />
              <SubmitButton className={following ? "btn-outline" : "btn-primary"}>
                {following ? "Siguiendo" : "Seguir"}
              </SubmitButton>
            </form>
          ) : (
            <Link href={`/login?next=/user/${profile.handle}`} className="btn-primary">Seguir</Link>
          )}
        </div>
        {profile.bio && <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{profile.bio}</p>}
      </section>

      <div className="mt-4 flex gap-2">
        <Link href={`/user/${handle}`} className={`chip ${active === "on_sale" ? "chip-active" : ""}`}>
          En venta ({onSale.length})
        </Link>
        <Link href={`/user/${handle}?tab=sold`} className={`chip ${active === "sold" ? "chip-active" : ""}`}>
          Vendidos ({sold.length})
        </Link>
        <Link href={`/user/${handle}?tab=reviews`} className={`chip ${active === "reviews" ? "chip-active" : ""}`}>
          Valoraciones ({rating.total})
        </Link>
      </div>

      <div className="mt-4">
        {active === "reviews" ? (
          reviews.length === 0 ? (
            <p className="card p-8 text-center text-sm text-muted">Todavía no tiene valoraciones.</p>
          ) : (
            <ul className="card divide-y divide-line">
              {reviews.map((review) => (
                <li key={review.id} className="flex gap-3 p-4">
                  <Avatar seed={review.avatar_seed} name={review.name} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">
                      {review.name} <span className="ml-1 font-normal text-muted">{SCORE[review.score]}</span>
                    </p>
                    <p className="text-xs text-muted">
                      <Link href={`/item/${review.item_id}`} className="link">{review.item_title}</Link> ·{" "}
                      {shortDate(review.created_at)}
                    </p>
                    {review.body && <p className="mt-1.5 text-sm">{review.body}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : (
          <ItemGrid
            items={active === "sold" ? sold : onSale}
            empty={active === "sold" ? "Todavía no ha vendido nada." : "No tiene artículos a la venta ahora mismo."}
          />
        )}
      </div>
    </>
  );
}
