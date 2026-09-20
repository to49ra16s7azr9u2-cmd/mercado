import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { shopBySlug } from "@/lib/queries";
import { businessTypeLabel, SUPPORT_EMAIL } from "@/lib/constants";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const shop = shopBySlug(slug);
  return { title: shop ? `Información del vendedor · ${shop.name}` : "Información del vendedor" };
}

export default async function ShopLegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const shop = shopBySlug(slug);
  if (!shop) notFound();

  const user = await currentUser();
  const isOwner = user?.id === shop.owner_id;
  const locality = [shop.legal_city, shop.legal_region].filter(Boolean).join(", ");
  const publicAddress = [locality, shop.legal_zip ? `C.P. ${shop.legal_zip}` : ""]
    .filter(Boolean)
    .join(" · ");
  const showsFull = shop.address_public === 1 || isOwner;

  const rows: [string, string][] = [
    ["Nombre comercial", shop.name],
    ["Nombre o razón social", shop.legal_name],
    ["Tipo de vendedor", businessTypeLabel(shop.business_type)],
    ["RFC", shop.rfc],
    [
      "Domicilio",
      showsFull
        ? [shop.legal_address, publicAddress].filter(Boolean).join(", ")
        : publicAddress || "Sin especificar",
    ],
    ["Teléfono de atención", shop.legal_phone],
    ["Correo de atención", shop.legal_email],
    ["Giro", shop.category],
    ["Envíos desde", shop.ship_from || "México"],
    ["Tiempo de entrega estimado", shop.delivery_note || "De 2 a 5 días hábiles"],
    ["Política de devoluciones y cancelaciones", shop.return_policy || "Según la Ley Federal de Protección al Consumidor."],
    ["Precios", "Todos los precios están expresados en pesos mexicanos (MXN) e incluyen impuestos."],
    ["Formas de pago", "Tarjeta de crédito o débito, meses sin intereses, efectivo en tiendas, SPEI, saldo de Mercado y PayPal."],
  ];

  return (
    <article className="mx-auto max-w-3xl">
      <nav className="mb-2 text-xs text-muted">
        <Link href="/shops" className="link">Mercado Shops</Link> /{" "}
        <Link href={`/shop/${shop.slug}`} className="link">{shop.name}</Link>
      </nav>
      <h1 className="text-2xl font-bold">Información del vendedor</h1>
      <p className="mt-2 text-sm text-muted">
        Datos publicados por la tienda conforme a la Ley Federal de Protección al Consumidor y a las
        Disposiciones de comercio electrónico. Ante cualquier duda puedes escribir a {SUPPORT_EMAIL}.
      </p>
      {!showsFull && (
        <p className="mt-3 rounded-lg bg-brand-soft px-4 py-3 text-sm text-brand-darker">
          🔒 Por seguridad de quien vende —muchos negocios operan desde su domicilio particular— aquí
          se muestra sólo la localidad. El domicilio completo se entrega a quien compra al concretar
          un pedido (para su factura, cambio o devolución) y a la autoridad que lo requiera.
        </p>
      )}
      {isOwner && !shop.address_public && (
        <p className="mt-3 rounded-lg bg-canvas px-4 py-3 text-xs text-muted">
          Estás viendo tu domicilio completo porque es tu tienda; el público sólo ve{" "}
          <b>{publicAddress || "la localidad"}</b>.{" "}
          <Link href="/mypage/shop/settings" className="link">Cambiar esta preferencia</Link>
        </p>
      )}
      <dl className="card mt-5 divide-y divide-line text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="gap-4 p-4 sm:flex">
            <dt className="w-64 shrink-0 font-bold text-muted">{label}</dt>
            <dd className="mt-1 sm:mt-0">{value || "—"}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs text-muted">
        Profeco: teléfono del consumidor 55 5568 8722 · <span className="font-bold">www.profeco.gob.mx</span>
      </p>
    </article>
  );
}
