import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { ratingSummary, reviewsOf } from "@/lib/queries";
import { Avatar } from "@/components/Avatar";
import { shortDate } from "@/lib/format";

export const metadata = { title: "Valoraciones" };

const SCORE: Record<string, string> = { good: "😊 Buena", normal: "😐 Normal", bad: "😞 Mala" };

export default async function ReviewsPage() {
  const user = (await currentUser())!;
  const rating = ratingSummary(user.id);
  const reviews = reviewsOf(user.id);

  return (
    <>
      <h1 className="text-xl font-bold">Valoraciones recibidas</h1>
      <div className="card mt-4 grid grid-cols-3 divide-x divide-line text-center">
        <div className="p-4"><p className="text-2xl font-black">{rating.good}</p><p className="text-xs text-muted">😊 Buenas</p></div>
        <div className="p-4"><p className="text-2xl font-black">{rating.normal}</p><p className="text-xs text-muted">😐 Normales</p></div>
        <div className="p-4"><p className="text-2xl font-black">{rating.bad}</p><p className="text-xs text-muted">😞 Malas</p></div>
      </div>
      {reviews.length === 0 ? (
        <p className="card mt-4 p-8 text-center text-sm text-muted">Todavía no tienes valoraciones.</p>
      ) : (
        <ul className="card mt-4 divide-y divide-line">
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
      )}
    </>
  );
}
