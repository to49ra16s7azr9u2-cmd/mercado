import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import {
  brandById,
  categoryPath,
  isFollowing,
  isLiked,
  itemById,
  itemComments,
  itemImages,
  itemOffers,
  orderByItem,
  ratingSummary,
  relatedItems,
  searchItems,
  shopById,
  shopRating,
  isFollowingShop,
  bundlesForItem,
  bundleItems,
  b2bPricesOf,
  sourceOf,
  userById,
  variantsOf,
} from "@/lib/queries";
import { run, nowIso } from "@/lib/db";
import {
  addCommentAction,
  deleteCommentAction,
  deleteItemAction,
  makeOfferAction,
  respondOfferAction,
  toggleFollowAction,
  toggleItemPauseAction,
  toggleLikeAction,
  toggleShopFollowAction,
  updatePriceAction,
} from "@/lib/actions";
import { ItemGallery } from "@/components/ItemGallery";
import { BuyPanel } from "@/components/BuyPanel";
import { CommentForm, OfferForm, PriceEditor } from "@/components/ItemForms";
import { ItemRow } from "@/components/ItemCard";
import { Avatar } from "@/components/Avatar";
import { SubmitButton } from "@/components/SubmitButton";
import { Section } from "@/components/Section";
import { conditionLabel, shipDaysLabel, shippingLabel, SHIPPING_PAYERS } from "@/lib/constants";
import { money, timeAgo } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = itemById(id);
  return { title: item ? item.title : "Artículo" };
}

export default async function ItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ published?: string }>;
}) {
  const { id } = await params;
  const { published } = await searchParams;
  const item = itemById(id);
  if (!item) notFound();

  const user = await currentUser();
  const isOwner = user?.id === item.seller_id;
  const seller = userById(item.seller_id)!;
  const images = itemImages(item.id);
  const comments = itemComments(item.id);
  const offers = itemOffers(item.id);
  const liked = user ? isLiked(user.id, item.id) : false;
  const rating = ratingSummary(seller.id);
  const path = categoryPath(item.category_id);
  const brand = brandById(item.brand_id);
  const related = relatedItems(item, 12);
  const sellerItems = searchItems({ sellerId: seller.id, status: "on_sale", perPage: 12, excludeId: item.id }).items;
  const order = item.status !== "on_sale" ? orderByItem(item.id) : undefined;
  const sold = item.status === "sold" || item.status === "trading";
  const following = user ? isFollowing(user.id, seller.id) : false;
  const myOffer = user ? offers.find((o) => o.user_id === user.id && o.status === "accepted") : undefined;
  const shop = item.shop_id ? shopById(item.shop_id) : undefined;
  const variants = shop ? variantsOf(item.id) : [];
  const shopStars = shop ? shopRating(shop.id) : undefined;
  const followingShop = user && shop ? isFollowingShop(user.id, shop.id) : false;
  const availableStock = variants.length
    ? variants.reduce((sum, v) => sum + v.stock, 0)
    : item.stock;
  const provenance = sourceOf(item);
  const wholesaleTiers = shop ? b2bPricesOf(item.id) : [];
  const bundles = bundlesForItem(item.id);

  // registro de visita e historial
  run("UPDATE items SET views = views + 1 WHERE id = ?", [item.id]);
  if (user && !isOwner) {
    run(
      `INSERT INTO history (user_id, item_id, viewed_at) VALUES (?, ?, ?)
       ON CONFLICT(user_id, item_id) DO UPDATE SET viewed_at = excluded.viewed_at`,
      [user.id, item.id, nowIso()],
    );
  }

  const detailRows: [string, React.ReactNode][] = [
    ["Categoría", path.length ? (
      <span key="cat" className="flex flex-wrap gap-1">
        {path.map((c, i) => (
          <span key={c.id}>
            {i > 0 && <span className="text-muted"> › </span>}
            <Link href={`/category/${c.slug}`} className="link">{c.name}</Link>
          </span>
        ))}
      </span>
    ) : "Sin categoría"],
    ["Marca", brand ? <Link key="brand" href={`/search?brand=${brand.id}`} className="link">{brand.name}</Link> : "Sin marca"],
    ["Talla", item.size || "Sin especificar"],
    ["Color", item.color || "Sin especificar"],
    ["Estado", conditionLabel(item.condition)],
    ["Costo de envío", SHIPPING_PAYERS.find((s) => s.value === item.shipping_payer)?.short ?? ""],
    ["Método de envío", shippingLabel(item.shipping_method)],
    ["Se envía desde", item.ship_from || "Sin especificar"],
    ["Plazo de envío", shipDaysLabel(item.ship_days)],
    ...(shop
      ? ([
          ["Inventario disponible", `${availableStock} pieza${availableStock === 1 ? "" : "s"}`],
          ...(variants.length
            ? ([[
                "Variantes",
                <span key="variants" className="flex flex-wrap gap-1.5">
                  {variants.map((v) => (
                    <span key={v.id} className="chip">
                      {v.label}: {v.stock}
                    </span>
                  ))}
                </span>,
              ]] as [string, React.ReactNode][])
            : []),
          ["Vendido por", <Link key="shop" href={`/shop/${shop.slug}`} className="link">{shop.name} (Mercado Shops)</Link>],
          ["Devoluciones", shop.return_policy || "Según la Ley Federal de Protección al Consumidor."],
          ...(provenance
            ? ([[
                "Elaborado por",
                <Link key="origen" href={`/shop/${provenance.shop.slug}`} className="link">
                  {provenance.shop.name}
                  {provenance.shop.specialty ? ` · ${provenance.shop.specialty}` : ""}
                </Link>,
              ]] as [string, React.ReactNode][])
            : []),
        ] as [string, React.ReactNode][])
      : []),
  ];

  return (
    <>
      {published && (
        <p className="mb-3 rounded-lg bg-brand-soft px-4 py-3 text-sm font-bold text-brand-darker">
          ✅ ¡Tu artículo ya está publicado! Compártelo para que lo vea más gente.
        </p>
      )}

      <nav className="mb-3 truncate text-xs text-muted" aria-label="Ruta de navegación">
        <Link href="/" className="link">Inicio</Link>
        {path.map((c) => (
          <span key={c.id}> / <Link href={`/category/${c.slug}`} className="link">{c.name}</Link></span>
        ))}
      </nav>

      <div className="gap-8 lg:flex">
        <div className="lg:w-[52%]">
          <ItemGallery images={images} title={item.title} sold={sold} />
        </div>

        <div className="mt-5 min-w-0 flex-1 lg:mt-0">
          <h1 className="text-xl font-bold leading-snug">{item.title}</h1>
          <p className="mt-2 flex items-end gap-2">
            <span className="text-3xl font-black">{money(item.price)}</span>
            {item.shipping_payer === "seller" && (
              <span className="mb-1 rounded bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand-darker">
                Envío gratis
              </span>
            )}
          </p>

          <div className="mt-3 flex items-center gap-4 text-xs text-muted">
            <span>♥ {item.likes} favoritos</span>
            <span>💬 {comments.length} comentarios</span>
            <span>👁️ {item.views} visitas</span>
            <span>{timeAgo(item.created_at)}</span>
          </div>

          {isOwner ? (
            <div className="mt-5 space-y-2">
              {item.status === "on_sale" && (
                <p className="rounded-lg bg-brand-soft px-3 py-2 text-xs text-brand-darker">
                  Este es tu artículo. Recibirás {money(Math.max(0, item.price - Math.round(item.price * 0.1)))} tras
                  descontar la comisión del 10 %.
                </p>
              )}
              {sold && order && (
                <Link href={`/transaction/${order.id}`} className="btn-primary btn-lg">
                  Ver la transacción
                </Link>
              )}
              {!sold && (
                <>
                  <div className="flex gap-2">
                    <Link href={`/sell/${item.id}/edit`} className="btn-outline flex-1">Editar</Link>
                    <PriceEditor action={updatePriceAction} itemId={item.id} price={item.price} />
                  </div>
                  <div className="flex gap-2">
                    <form action={toggleItemPauseAction} className="flex-1">
                      <input type="hidden" name="id" value={item.id} />
                      <SubmitButton className="btn-outline w-full">
                        {item.status === "stopped" ? "Reanudar la venta" : "Pausar la venta"}
                      </SubmitButton>
                    </form>
                    <form action={deleteItemAction} className="flex-1">
                      <input type="hidden" name="id" value={item.id} />
                      <SubmitButton className="btn-danger w-full">Eliminar</SubmitButton>
                    </form>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="mt-5 space-y-2">
              {myOffer && (
                <p className="rounded-lg bg-brand-soft px-3 py-2 text-xs font-bold text-brand-darker">
                  ¡Han aceptado tu oferta de {money(myOffer.price)}! Ya puedes comprarlo a ese precio.
                </p>
              )}
              {item.status === "on_sale" ? (
                shop ? (
                  <BuyPanel
                    itemId={item.id}
                    price={item.price}
                    stock={item.stock}
                    variants={variants.map((v) => ({ id: v.id, label: v.label, stock: v.stock }))}
                  />
                ) : (
                  <>
                    <Link href={`/checkout/${item.id}`} className="btn-primary btn-lg">
                      Comprar ahora
                    </Link>
                    {!!item.offers_enabled && (
                      <OfferForm action={makeOfferAction} itemId={item.id} price={item.price} />
                    )}
                  </>
                )
              ) : item.status === "stopped" ? (
                <p className="rounded-lg bg-canvas px-4 py-3 text-center text-sm font-bold text-muted">
                  La venta está pausada temporalmente
                </p>
              ) : (
                <p className="rounded-lg bg-canvas px-4 py-3 text-center text-sm font-bold text-muted">
                  Este artículo ya se ha vendido
                </p>
              )}
              <form action={toggleLikeAction}>
                <input type="hidden" name="item_id" value={item.id} />
                <SubmitButton
                  className={`w-full rounded-xl border px-5 py-3 text-sm font-bold ${
                    liked ? "border-brand bg-brand-soft text-brand-darker" : "border-line bg-white text-ink"
                  }`}
                >
                  {liked ? "♥ Guardado en favoritos" : "♡ Agregar a favoritos"}
                </SubmitButton>
              </form>
            </div>
          )}

          <dl className="mt-6 divide-y divide-line border-y border-line text-sm">
            {detailRows.map(([label, value]) => (
              <div key={label} className="flex gap-4 py-2.5">
                <dt className="w-40 shrink-0 text-muted">{label}</dt>
                <dd className="min-w-0 flex-1">{value}</dd>
              </div>
            ))}
          </dl>

          {wholesaleTiers.length > 0 && (
            <div className="card mt-4 p-4">
              <h2 className="section-title">También en mayoreo</h2>
              <p className="mt-1 text-xs text-muted">
                Si tienes una tienda en Mercado puedes surtirte de este producto por volumen.
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {wholesaleTiers.map((tier) => (
                  <li key={tier.id} className="chip">
                    {tier.min_qty}+ pza · <span className="font-black">{money(tier.price)}</span>
                  </li>
                ))}
              </ul>
              {shop && (
                <Link href={`/mayoreo/${shop.slug}`} className="btn-outline mt-3 w-full">
                  Ver catálogo de mayoreo
                </Link>
              )}
            </div>
          )}

          <div className="mt-6">
            <h2 className="section-title">Descripción</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">
              {item.description || "Quien vende no ha agregado una descripción."}
            </p>
          </div>

          {shop && (
            <div className="card mt-6 overflow-hidden">
              <div className="flex items-center gap-3 bg-brand-soft p-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-2xl">
                  {shop.cover_emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-brand-darker">Mercado Shops · tienda verificada</p>
                  <Link href={`/shop/${shop.slug}`} className="block truncate text-sm font-bold hover:underline">
                    {shop.name}
                  </Link>
                  <p className="truncate text-xs text-muted">
                    😊 {shopStars?.good ?? 0} · {shop.category}
                  </p>
                </div>
                {user && user.id !== shop.owner_id && (
                  <form action={toggleShopFollowAction}>
                    <input type="hidden" name="shop_id" value={shop.id} />
                    <input type="hidden" name="slug" value={shop.slug} />
                    <SubmitButton className={followingShop ? "btn-outline" : "btn-primary"}>
                      {followingShop ? "Siguiendo" : "Seguir tienda"}
                    </SubmitButton>
                  </form>
                )}
              </div>
              <div className="p-4 text-xs text-muted">
                {shop.description && <p className="leading-relaxed">{shop.description}</p>}
                <p className="mt-2">
                  <Link href={`/shop/${shop.slug}/legal`} className="link font-bold">
                    Información del vendedor y datos fiscales
                  </Link>
                </p>
              </div>
            </div>
          )}

          <div className={`card p-4 ${shop ? "mt-4" : "mt-6"}`}>
            <div className="flex items-center gap-3">
              <Link href={`/user/${seller.handle}`}>
                <Avatar seed={seller.avatar_seed} name={seller.name} size={48} />
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/user/${seller.handle}`} className="block truncate text-sm font-bold hover:underline">
                  {seller.name}
                </Link>
                <p className="text-xs text-muted">
                  😊 {rating.good} · 😐 {rating.normal} · 😞 {rating.bad}
                  {seller.is_verified ? " · Identidad verificada" : ""}
                </p>
              </div>
              {user && !isOwner && (
                <form action={toggleFollowAction}>
                  <input type="hidden" name="user_id" value={seller.id} />
                  <input type="hidden" name="handle" value={seller.handle} />
                  <SubmitButton className={following ? "btn-outline" : "btn-primary"}>
                    {following ? "Siguiendo" : "Seguir"}
                  </SubmitButton>
                </form>
              )}
            </div>
            {seller.bio && <p className="mt-3 text-xs leading-relaxed text-muted">{seller.bio}</p>}
          </div>

          {isOwner && offers.length > 0 && (
            <div className="card mt-4 p-4">
              <h2 className="section-title">Ofertas recibidas</h2>
              <ul className="mt-3 divide-y divide-line">
                {offers.map((offer) => (
                  <li key={offer.id} className="flex items-center gap-3 py-3">
                    <Avatar seed={offer.avatar_seed} name={offer.name} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{offer.name}</p>
                      <p className="text-xs text-muted">
                        {money(offer.price)} · {timeAgo(offer.created_at)}
                      </p>
                    </div>
                    {offer.status === "pending" ? (
                      <div className="flex gap-1.5">
                        <form action={respondOfferAction}>
                          <input type="hidden" name="id" value={offer.id} />
                          <input type="hidden" name="decision" value="accept" />
                          <SubmitButton className="btn-primary px-3 py-1.5 text-xs">Aceptar</SubmitButton>
                        </form>
                        <form action={respondOfferAction}>
                          <input type="hidden" name="id" value={offer.id} />
                          <input type="hidden" name="decision" value="reject" />
                          <SubmitButton className="btn-ghost px-3 py-1.5 text-xs">Rechazar</SubmitButton>
                        </form>
                      </div>
                    ) : (
                      <span className="chip">
                        {offer.status === "accepted" ? "Aceptada" : offer.status === "rejected" ? "Rechazada" : "Cerrada"}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="card mt-4 p-4">
            <h2 className="section-title">Comentarios ({comments.length})</h2>
            <ul className="mt-3 space-y-4">
              {comments.length === 0 && (
                <li className="text-sm text-muted">Todavía no hay comentarios. ¡Sé la primera persona en preguntar!</li>
              )}
              {comments.map((comment) => (
                <li key={comment.id} className="flex gap-3">
                  <Link href={`/user/${comment.handle}`}>
                    <Avatar seed={comment.avatar_seed} name={comment.name} size={36} />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted">
                      <Link href={`/user/${comment.handle}`} className="font-bold text-ink hover:underline">
                        {comment.name}
                      </Link>
                      {comment.user_id === item.seller_id && (
                        <span className="ml-1.5 rounded bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold text-brand-darker">
                          vendedor
                        </span>
                      )}
                      <span className="ml-2">{timeAgo(comment.created_at)}</span>
                    </p>
                    <p className="mt-1 whitespace-pre-wrap rounded-lg bg-canvas px-3 py-2 text-sm">{comment.body}</p>
                  </div>
                  {user && (comment.user_id === user.id || isOwner) && (
                    <form action={deleteCommentAction}>
                      <input type="hidden" name="id" value={comment.id} />
                      <SubmitButton className="btn-ghost px-2 py-1 text-xs">Borrar</SubmitButton>
                    </form>
                  )}
                </li>
              ))}
            </ul>
            {user ? (
              <CommentForm action={addCommentAction} itemId={item.id} />
            ) : (
              <p className="mt-3 text-sm text-muted">
                <Link href={`/login?next=/item/${item.id}`} className="link font-bold">Entra en tu cuenta</Link>{" "}
                para comentar.
              </p>
            )}
          </div>

          <p className="mt-4 text-center text-xs text-muted">
            <Link href={`/report?target=item&id=${item.id}`} className="link">
              🚩 Denunciar este artículo
            </Link>
          </p>
        </div>
      </div>

      {sellerItems.length > 0 && (
        <Section title={`Más artículos de ${seller.name}`} href={`/user/${seller.handle}`}>
          <ItemRow items={sellerItems} />
        </Section>
      )}

      {bundles.map((bundle) => {
        const partners = bundleItems(bundle.id).filter((other) => other.id !== item.id);
        if (!partners.length) return null;
        return (
          <Section
            key={bundle.id}
            title={`Paquete «${bundle.title}»`}
            subtitle={`Compra este producto y recibe un cupón de ${money(bundle.discount)} para estas tiendas`}
          >
            <ItemRow items={partners} />
          </Section>
        );
      })}

      {related.length > 0 && (
        <Section title="Artículos parecidos">
          <ItemRow items={related} />
        </Section>
      )}
    </>
  );
}
