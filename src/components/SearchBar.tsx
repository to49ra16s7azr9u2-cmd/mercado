"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const POPULAR = [
  "Nintendo Switch", "iPhone", "Zara", "vestido", "vinilos", "LEGO", "bicicleta",
  "cámara réflex", "Pokémon", "auriculares", "vaqueros", "zapatillas", "abrigo",
  "PlayStation", "manga", "perfume", "silla", "cazadora", "bolso", "reloj",
];

const KEY = "mercado_recent_searches";

function readRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "[]").slice(0, 8);
  } catch {
    return [];
  }
}

export function SearchBar({ placeholder = "Buscar en Mercado" }: { placeholder?: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const [value, setValue] = useState(params.get("q") ?? "");
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => setRecent(readRecent()), []);
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function submit(term: string) {
    const q = term.trim();
    if (q) {
      const next = [q, ...recent.filter((r) => r !== q)].slice(0, 8);
      setRecent(next);
      try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
    }
    setOpen(false);
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  }

  const suggestions = value.trim()
    ? POPULAR.filter((p) => p.toLowerCase().includes(value.trim().toLowerCase())).slice(0, 6)
    : POPULAR.slice(0, 6);

  return (
    <form
      ref={ref}
      role="search"
      onSubmit={(e) => { e.preventDefault(); submit(value); }}
      className="relative w-full"
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setOpen(true)}
        type="search"
        name="q"
        autoComplete="off"
        placeholder={placeholder}
        aria-label="Buscar"
        className="w-full rounded-full border border-transparent bg-white/95 py-2 pl-10 pr-4 text-sm text-ink outline-none placeholder:text-muted focus:border-white focus:ring-2 focus:ring-white/60"
      />
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">🔍</span>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-line bg-white shadow-xl">
          {recent.length > 0 && (
            <div className="border-b border-line py-1">
              <p className="px-4 py-1 text-[11px] font-bold text-muted">Búsquedas recientes</p>
              {recent.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => submit(term)}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-canvas"
                >
                  <span aria-hidden className="text-muted">🕘</span> {term}
                </button>
              ))}
            </div>
          )}
          <div className="py-1">
            <p className="px-4 py-1 text-[11px] font-bold text-muted">Sugerencias</p>
            {suggestions.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => submit(term)}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-canvas"
              >
                <span aria-hidden className="text-muted">🔍</span> {term}
              </button>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}
