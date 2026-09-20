"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "./Avatar";

type Cat = { id: number; name: string; slug: string; icon: string; children: { id: number; name: string; slug: string }[] };

export function CategoryMenu({ categories }: { categories: Cat[] }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<number | null>(categories[0]?.id ?? null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const activeCat = categories.find((c) => c.id === active);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold text-ink hover:bg-canvas"
      >
        <span aria-hidden>☰</span> Categorías
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 flex w-[620px] overflow-hidden rounded-xl border border-line bg-white shadow-xl">
          <ul className="w-56 border-r border-line py-2">
            {categories.map((cat) => (
              <li key={cat.id}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(cat.id)}
                  onFocus={() => setActive(cat.id)}
                  className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm ${
                    active === cat.id ? "bg-brand-soft font-bold text-brand-darker" : "text-ink hover:bg-canvas"
                  }`}
                >
                  <span aria-hidden>{cat.icon}</span>
                  {cat.name}
                </button>
              </li>
            ))}
          </ul>
          <div className="flex-1 p-4">
            {activeCat && (
              <>
                <Link
                  href={`/category/${activeCat.slug}`}
                  onClick={() => setOpen(false)}
                  className="text-sm font-bold text-brand-darker hover:underline"
                >
                  Ver todo en {activeCat.name} →
                </Link>
                <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {activeCat.children.map((child) => (
                    <li key={child.id}>
                      <Link
                        href={`/category/${child.slug}`}
                        onClick={() => setOpen(false)}
                        className="block truncate py-1 text-sm text-ink hover:text-brand-darker"
                      >
                        {child.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function AccountMenu({
  name,
  handle,
  avatarSeed,
  balance,
  points,
  logOut,
}: {
  name: string;
  handle: string;
  avatarSeed: string;
  balance: number;
  points: number;
  logOut: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const LINKS = [
    { href: "/mypage", label: "Mi cuenta", icon: "👤" },
    { href: "/mypage/listings", label: "Mis artículos", icon: "🏷️" },
    { href: "/mypage/purchases", label: "Mis compras", icon: "📦" },
    { href: "/mypage/likes", label: "Favoritos", icon: "♥" },
    { href: "/mypage/shop", label: "Mi tienda (Shops)", icon: "🏪" },
    { href: "/mypage/balance", label: "Saldo y transferencias", icon: "💶" },
    { href: "/mypage/settings", label: "Configuración", icon: "⚙️" },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Abrir menú de la cuenta"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full p-0.5 hover:bg-white/15"
      >
        <Avatar seed={avatarSeed} name={name} size={32} ring />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-line bg-white shadow-xl">
          <Link href={`/user/${handle}`} onClick={() => setOpen(false)} className="flex items-center gap-3 border-b border-line p-4 hover:bg-canvas">
            <Avatar seed={avatarSeed} name={name} size={40} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-ink">{name}</span>
              <span className="block truncate text-xs text-muted">@{handle}</span>
            </span>
          </Link>
          <div className="grid grid-cols-2 gap-2 border-b border-line p-3 text-center">
            <Link href="/mypage/balance" onClick={() => setOpen(false)} className="rounded-lg bg-canvas py-2">
              <span className="block text-[10px] font-bold text-muted">Saldo</span>
              <span className="block text-sm font-bold text-ink">${balance}</span>
            </Link>
            <Link href="/mypage/points" onClick={() => setOpen(false)} className="rounded-lg bg-canvas py-2">
              <span className="block text-[10px] font-bold text-muted">Puntos</span>
              <span className="block text-sm font-bold text-ink">{points}</span>
            </Link>
          </div>
          <ul className="py-1">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-canvas">
                  <span aria-hidden className="w-4 text-center">{l.icon}</span> {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <form action={logOut} className="border-t border-line">
            <button type="submit" className="w-full px-4 py-3 text-left text-sm font-bold text-muted hover:bg-canvas">
              Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
