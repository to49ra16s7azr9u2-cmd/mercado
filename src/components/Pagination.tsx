import Link from "next/link";

export function Pagination({
  page,
  total,
  perPage,
  baseQuery,
}: {
  page: number;
  total: number;
  perPage: number;
  baseQuery: URLSearchParams;
}) {
  const pages = Math.ceil(total / perPage);
  if (pages <= 1) return null;
  const build = (p: number) => {
    const next = new URLSearchParams(baseQuery);
    next.set("page", String(p));
    return `?${next.toString()}`;
  };
  const windowed = Array.from({ length: pages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === pages || Math.abs(p - page) <= 2,
  );

  return (
    <nav className="mt-6 flex items-center justify-center gap-1" aria-label="Paginación">
      {page > 1 && (
        <Link href={build(page - 1)} className="btn-outline px-3 py-1.5 text-xs">← Anterior</Link>
      )}
      {windowed.map((p, i) => (
        <span key={p} className="flex items-center">
          {i > 0 && windowed[i - 1] !== p - 1 && <span className="px-1 text-xs text-muted">…</span>}
          <Link
            href={build(p)}
            aria-current={p === page ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
              p === page ? "bg-brand text-white" : "border border-line bg-white text-ink hover:bg-canvas"
            }`}
          >
            {p}
          </Link>
        </span>
      ))}
      {page < pages && (
        <Link href={build(page + 1)} className="btn-outline px-3 py-1.5 text-xs">Siguiente →</Link>
      )}
    </nav>
  );
}
