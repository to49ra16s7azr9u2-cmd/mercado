import "server-only";
import { get, newId, nowIso, run } from "./db";

type Kind =
  | "like" | "comment" | "offer" | "order" | "message" | "review" | "news" | "follow" | "shop";

const FLAG: Record<Kind, string | null> = {
  like: "notify_like",
  comment: "notify_comment",
  offer: "notify_comment",
  order: "notify_order",
  message: "notify_message",
  review: "notify_order",
  news: "notify_news",
  follow: null,
  shop: "notify_news",
};

export function notify(opts: {
  userId: string;
  kind: Kind;
  title: string;
  body?: string;
  link?: string;
  image?: string;
}) {
  const flag = FLAG[opts.kind];
  if (flag) {
    const row = get<Record<string, number>>(`SELECT ${flag} AS f FROM users WHERE id = ?`, [opts.userId]);
    if (row && !row.f) return;
  }
  run(
    `INSERT INTO notifications (id, user_id, kind, title, body, link, image, is_read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [newId("n_"), opts.userId, opts.kind, opts.title, opts.body ?? "", opts.link ?? "", opts.image ?? "", nowIso()],
  );
}

export function ledgerEntry(userId: string, kind: string, amount: number, memo: string) {
  run(
    "INSERT INTO ledger (id, user_id, kind, amount, memo, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [newId("l_"), userId, kind, amount, memo, nowIso()],
  );
}
