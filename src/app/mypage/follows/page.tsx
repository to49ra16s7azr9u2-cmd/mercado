import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { followCounts, followList, isFollowing, ratingSummary } from "@/lib/queries";
import { toggleFollowAction } from "@/lib/actions";
import { Avatar } from "@/components/Avatar";
import { SubmitButton } from "@/components/SubmitButton";

export const metadata = { title: "Seguidos y seguidores" };

export default async function FollowsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireUser("/mypage/follows");
  const { tab } = await searchParams;
  const kind = tab === "followers" ? "followers" : "following";
  const people = followList(user.id, kind);
  const counts = followCounts(user.id);

  return (
    <>
      <h1 className="text-xl font-bold">Seguidos y seguidores</h1>
      <div className="mt-4 flex gap-2">
        <Link href="/mypage/follows" className={`chip ${kind === "following" ? "chip-active" : ""}`}>
          Siguiendo ({counts.following})
        </Link>
        <Link href="/mypage/follows?tab=followers" className={`chip ${kind === "followers" ? "chip-active" : ""}`}>
          Seguidores ({counts.followers})
        </Link>
      </div>
      {people.length === 0 ? (
        <p className="card mt-4 p-8 text-center text-sm text-muted">
          {kind === "following" ? "Todavía no sigues a nadie." : "Aún no tienes seguidores."}
        </p>
      ) : (
        <ul className="card mt-4 divide-y divide-line">
          {people.map((person) => {
            const rating = ratingSummary(person.id);
            const following = isFollowing(user.id, person.id);
            return (
              <li key={person.id} className="flex items-center gap-3 p-3">
                <Link href={`/user/${person.handle}`}>
                  <Avatar seed={person.avatar_seed} name={person.name} size={44} />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/user/${person.handle}`} className="block truncate text-sm font-bold hover:underline">
                    {person.name}
                  </Link>
                  <p className="truncate text-xs text-muted">
                    @{person.handle} · 😊 {rating.good} calificaciones
                  </p>
                </div>
                <form action={toggleFollowAction}>
                  <input type="hidden" name="user_id" value={person.id} />
                  <input type="hidden" name="handle" value={person.handle} />
                  <SubmitButton className={following ? "btn-outline px-3 py-1.5 text-xs" : "btn-primary px-3 py-1.5 text-xs"}>
                    {following ? "Siguiendo" : "Seguir"}
                  </SubmitButton>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
