import Link from "next/link";

export function Section({
  title,
  href,
  children,
  subtitle,
}: {
  title: string;
  href?: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-7">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="section-title">{title}</h2>
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
        </div>
        {href && (
          <Link href={href} className="shrink-0 text-xs font-bold text-brand-darker hover:underline">
            Ver todo →
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
