import Link from "next/link";
import { Suspense } from "react";
import { currentUser } from "@/lib/auth";
import { childCategories, rootCategories, unreadCount } from "@/lib/queries";
import { logOutAction } from "@/lib/actions";
import { SITE_NAME } from "@/lib/constants";
import { SearchBar } from "./SearchBar";
import { AccountMenu, CategoryMenu } from "./HeaderMenus";
import { BottomNav } from "./BottomNav";

export async function Header() {
  const user = await currentUser();
  const unread = user ? unreadCount(user.id) : 0;
  const roots = rootCategories().map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    icon: c.icon,
    children: childCategories(c.id).map((ch) => ({ id: ch.id, name: ch.name, slug: ch.slug })),
  }));

  return (
    <>
      <header className="sticky top-0 z-40">
        <div className="bg-brand">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
            <Link href="/" className="shrink-0 text-2xl font-black tracking-tight text-white">
              {SITE_NAME}
            </Link>
            <div className="flex-1">
              <Suspense fallback={<div className="h-9 rounded-full bg-white/90" />}>
                <SearchBar />
              </Suspense>
            </div>
            <nav className="flex items-center gap-1.5">
              <Link
                href="/notifications"
                aria-label="Notificaciones"
                className="relative hidden rounded-full p-2 text-lg text-white hover:bg-white/15 md:block"
              >
                🔔
                {unread > 0 && (
                  <span className="absolute right-0.5 top-0.5 min-w-4 rounded-full bg-white px-1 text-[10px] font-bold text-brand-darker">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </Link>
              {user ? (
                <>
                  <Link
                    href="/sell"
                    className="hidden rounded-lg bg-white px-4 py-2 text-sm font-bold text-brand-darker hover:bg-brand-soft md:block"
                  >
                    Vender
                  </Link>
                  <AccountMenu
                    name={user.name}
                    handle={user.handle}
                    avatarSeed={user.avatar_seed}
                    balance={user.balance}
                    points={user.points}
                    logOut={logOutAction}
                  />
                </>
              ) : (
                <>
                  <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-bold text-white hover:bg-white/15">
                    Entrar
                  </Link>
                  <Link
                    href="/signup"
                    className="hidden rounded-lg bg-white px-4 py-2 text-sm font-bold text-brand-darker hover:bg-brand-soft sm:block"
                  >
                    Crear cuenta
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
        <div className="hidden border-b border-line bg-white md:block">
          <div className="mx-auto flex max-w-6xl items-center gap-1 px-4">
            <CategoryMenu categories={roots} />
            <span className="mx-1 h-5 w-px bg-line" />
            <div className="no-scrollbar flex flex-1 items-center gap-1 overflow-x-auto">
              {roots.slice(0, 8).map((cat) => (
                <Link
                  key={cat.id}
                  href={`/category/${cat.slug}`}
                  className="whitespace-nowrap rounded-lg px-3 py-2.5 text-sm text-ink hover:bg-canvas hover:text-brand-darker"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
            <Link href="/shops" className="whitespace-nowrap px-3 py-2.5 text-sm font-bold text-brand-darker">
              🏪 Shops
            </Link>
            <Link href="/mayoreo" className="whitespace-nowrap px-3 py-2.5 text-sm font-bold text-brand-darker">
              🤝 Mayoreo
            </Link>
            <Link href="/search?sort=likes" className="whitespace-nowrap px-3 py-2.5 text-sm font-bold text-brand-darker">
              Tendencias
            </Link>
          </div>
        </div>
      </header>
      <BottomNav unread={unread} />
    </>
  );
}
