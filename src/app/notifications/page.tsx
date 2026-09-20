import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { notificationsOf } from "@/lib/queries";
import { markAllReadAction, markReadAction } from "@/lib/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { NOTIFY_KINDS } from "@/lib/constants";
import { timeAgo } from "@/lib/format";

export const metadata = { title: "Notificaciones" };

const ICON: Record<string, string> = {
  like: "♥", comment: "💬", offer: "🏷️", order: "📦",
  message: "✉️", review: "⭐", news: "📣", follow: "👤",
};

export default async function NotificationsPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/notifications");
  const notifications = notificationsOf(user.id);
  const unread = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Notificaciones</h1>
        {unread > 0 && (
          <form action={markAllReadAction}>
            <SubmitButton className="btn-ghost text-xs">Marcar todo como leído</SubmitButton>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="card mt-4 p-10 text-center text-sm text-muted">
          Aquí verás los avisos de tus compras, ventas y favoritos.
        </p>
      ) : (
        <ul className="card mt-4 divide-y divide-line">
          {notifications.map((notification) => (
            <li key={notification.id} className={notification.is_read ? "" : "bg-brand-soft/50"}>
              <div className="flex items-start gap-3 p-4">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-canvas text-base">
                  {ICON[notification.kind] ?? "🔔"}
                </span>
                <div className="min-w-0 flex-1">
                  <Link href={notification.link || "#"} className="block">
                    <p className="text-sm font-bold">{notification.title}</p>
                    {notification.body && <p className="mt-0.5 text-sm text-muted">{notification.body}</p>}
                  </Link>
                  <p className="mt-1 text-[11px] text-muted">
                    {NOTIFY_KINDS[notification.kind as keyof typeof NOTIFY_KINDS] ?? "Aviso"} ·{" "}
                    {timeAgo(notification.created_at)}
                  </p>
                </div>
                {!notification.is_read && (
                  <form action={markReadAction}>
                    <input type="hidden" name="id" value={notification.id} />
                    <SubmitButton className="btn-ghost px-2 py-1 text-[11px]">Leído</SubmitButton>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
