import { notFound } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { categoryBySlug, categoryPath, childCategories } from "@/lib/queries";
import { ResultsPage, parseSearchParams } from "@/components/ResultsPage";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = categoryBySlug(slug);
  return { title: category ? category.name : "Categoría" };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const category = categoryBySlug(slug);
  if (!category) notFound();

  const sp = await searchParams;
  const parsed = { ...parseSearchParams(sp), cat: slug };
  const user = await currentUser();
  const children = childCategories(category.id);
  const path = categoryPath(category.id);

  return (
    <>
      {children.length > 0 && (
        <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1">
          {children.map((c) => (
            <Link key={c.id} href={`/category/${c.slug}`} className="chip whitespace-nowrap hover:border-brand">
              {c.name}
            </Link>
          ))}
        </div>
      )}
      <ResultsPage
        params={parsed}
        loggedIn={!!user}
        title={category.name}
        breadcrumb={path.map((c) => ({ href: `/category/${c.slug}`, label: c.name }))}
      />
    </>
  );
}
