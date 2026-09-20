import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { cardsOf, itemById, shopById, usableCoupons, userById, variantsOf } from "@/lib/queries";
import { purchaseAction } from "@/lib/actions";
import { CheckoutForm } from "@/components/CheckoutForm";
import { conditionLabel, shippingCostOf, shippingLabel } from "@/lib/constants";
import { money } from "@/lib/format";

export const metadata = { title: "Confirmar compra" };

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ qty?: string; variant?: string }>;
}) {
  const { id } = await params;
  const { qty, variant: variantParam } = await searchParams;
  const item = itemById(id);
  if (!item) notFound();
  const user = await currentUser();
  if (!user) redirect(`/login?next=/checkout/${id}`);
  if (item.seller_id === user.id) redirect(`/item/${id}`);
  if (item.status !== "on_sale") redirect(`/item/${id}`);

  const seller = userById(item.seller_id)!;
  const shop = item.shop_id ? shopById(item.shop_id) : undefined;
  const shippingCost = item.shipping_payer === "buyer" ? shippingCostOf(item.shipping_method) : 0;
  const variants = variantsOf(item.id);
  const variant = variants.find((v) => v.id === Number(variantParam)) ?? (variants.length ? variants.find((v) => v.stock > 0) : undefined);
  const maxQuantity = item.shop_id ? Math.max(1, variant ? variant.stock : item.stock) : 1;
  const initialQuantity = Math.max(1, Math.min(maxQuantity, Number(qty) || 1));

  return (
    <div>
      <h1 className="text-xl font-bold">Confirmar la compra</h1>
      <div className="card mt-4 flex gap-3 p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.image ?? ""} alt="" className="h-20 w-20 rounded-lg object-cover" />
        <div className="min-w-0 flex-1">
          <Link href={`/item/${item.id}`} className="line-clamp-2 text-sm font-bold hover:underline">
            {item.title}
          </Link>
          <p className="mt-1 text-xs text-muted">
            {conditionLabel(item.condition)} · {shippingLabel(item.shipping_method)}
          </p>
          <p className="mt-1 text-xs text-muted">
            {shop ? (
              <>
                <span className="rounded bg-brand-soft px-1 py-px font-bold text-brand-darker">Shops</span>{" "}
                {shop.name}
              </>
            ) : (
              <>Vendido por {seller.name}</>
            )}
          </p>
        </div>
        <p className="text-base font-black">{money(item.price)}</p>
      </div>

      <div className="mt-5">
        <CheckoutForm
          action={purchaseAction}
          itemId={item.id}
          price={item.price}
          shippingCost={shippingCost}
          points={user.points}
          balance={user.balance}
          coupons={usableCoupons(user.id, item.price)}
          cards={cardsOf(user.id)}
          address={{
            name: user.addr_name,
            zip: user.addr_zip,
            region: user.addr_region,
            city: user.addr_city,
            line: user.addr_line,
            phone: user.addr_phone,
          }}
          maxQuantity={maxQuantity}
          initialQuantity={initialQuantity}
          variant={variant ? { id: variant.id, label: variant.label } : null}
        />
      </div>
    </div>
  );
}
