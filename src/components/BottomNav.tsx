"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Inicio", icon: "🏠" },
  { href: "/search", label: "Buscar", icon: "🔍" },
  { href: "/sell", label: "Vender", icon: "➕" },
  { href: "/notifications", label: "Avisos", icon: "🔔" },
  { href: "/mypage", label: "Mi cuenta", icon: "👤" },
];

export function BottomNav({ unread = 0 }: { unread?: number }) {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur md:hidden">
      <ul className="mx-auto flex max-w-3xl">
        {TABS.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={`relative flex flex-col items-center gap-0.5 py-2 text-[10px] font-bold ${
                  active ? "text-brand-darker" : "text-muted"
                }`}
              >
                <span className={tab.href === "/sell" ? "text-lg" : "text-base"}>{tab.icon}</span>
                {tab.label}
                {tab.href === "/notifications" && unread > 0 && (
                  <span className="absolute right-1/2 top-1 translate-x-4 rounded-full bg-warn px-1.5 text-[9px] text-white">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
