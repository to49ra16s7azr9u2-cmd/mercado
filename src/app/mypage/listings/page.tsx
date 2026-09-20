import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { listingsOf } from "@/lib/queries";
import { ItemGrid } from "@/components/ItemCard";

export const metadata = { title: "Mis artículos" };

const TABS = [
  { value: "on_sale", label: "En venta", statuses: ["on_sale", "stopped"] },
  { value: "trading", label: "En transacción", statuses: ["trading"] },
  { value: "sold", label: "Vendidos", statuses: ["sold"] },
];

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = (await currentUser())!;
  const { tab } = await searchParams;
  const active = TABS.find((t) => t.value === tab) ?? TABS[0];
  const items = listingsOf(user.id, active.statuses);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Mis artículos</h1>
        <Link href="/sell" className="btn-primary">Publicar</Link>
      </div>
      <div className="mt-4 flex gap-2">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/mypage/listings?tab=${t.value}`}
            className={`chip ${t.value === active.value ? "chip-active" : ""}`}
          >
            {t.label}
          </Link>
        ))}
      </div>
      <div className="mt-4">
        <ItemGrid items={items} empty="No tienes artículos en este estado." />
      </div>
    </>
  );
}
