import "server-only";
import { all, get, run } from "./db";
import {
  ADVANCE_DEFAULT_HORIZON, ADVANCE_FEE_RATE, ADVANCE_MAX_AMOUNT, ADVANCE_MIN,
  ADVANCE_REQUIREMENTS, ADVANCE_TIERS, advanceApr,
} from "./constants";
import type {
  Advance, B2bPrice, Bundle, Category, Collective, Comment, Item, ItemCard, Notification,
  Order, Shipment, Shop, ShopPartner, User, Variant,
} from "./types";

/* ---------------------------------- categorías --------------------------------- */

export function allCategories(): Category[] {
  return all<Category>("SELECT * FROM categories ORDER BY sort, id");
}

export function rootCategories(): Category[] {
  return all<Category>("SELECT * FROM categories WHERE parent_id IS NULL ORDER BY sort, id");
}

export function childCategories(parentId: number): Category[] {
  return all<Category>("SELECT * FROM categories WHERE parent_id = ? ORDER BY sort, id", [parentId]);
}

export function categoryBySlug(slug: string): Category | undefined {
  return get<Category>("SELECT * FROM categories WHERE slug = ?", [slug]);
}

export function categoryById(id: number): Category | undefined {
  return get<Category>("SELECT * FROM categories WHERE id = ?", [id]);
}

export function categoryPath(id: number | null): Category[] {
  const path: Category[] = [];
  let current = id ? categoryById(id) : undefined;
  let guard = 0;
  while (current && guard++ < 6) {
    path.unshift(current);
    current = current.parent_id ? categoryById(current.parent_id) : undefined;
  }
  return path;
}

export function descendantCategoryIds(id: number): number[] {
  const ids = [id];
  let frontier = [id];
  let guard = 0;
  while (frontier.length && guard++ < 6) {
    const placeholders = frontier.map(() => "?").join(",");
    const next = all<{ id: number }>(
      `SELECT id FROM categories WHERE parent_id IN (${placeholders})`,
      frontier,
    ).map((r) => r.id);
    ids.push(...next);
    frontier = next;
  }
  return ids;
}

export function allBrands() {
  return all<{ id: number; name: string }>("SELECT * FROM brands ORDER BY name");
}

export function brandById(id: number | null) {
  if (!id) return undefined;
  return get<{ id: number; name: string }>("SELECT * FROM brands WHERE id = ?", [id]);
}

/* ------------------------------------ items ------------------------------------ */

const CARD_SELECT = `
  SELECT i.*,
    (SELECT url FROM item_images WHERE item_id = i.id ORDER BY position LIMIT 1) AS image,
    (SELECT COUNT(*) FROM likes WHERE item_id = i.id) AS likes,
    u.name AS seller_name, u.handle AS seller_handle, u.avatar_seed AS seller_avatar,
    sh.name AS shop_name, sh.slug AS shop_slug, sh.logo_seed AS shop_logo, sh.status AS shop_status
  FROM items i
  JOIN users u ON u.id = i.seller_id
  LEFT JOIN shops sh ON sh.id = i.shop_id
`;

export type SearchParams = {
  q?: string;
  categorySlug?: string;
  categoryId?: number;
  brandId?: number;
  priceMin?: number;
  priceMax?: number;
  conditions?: number[];
  shippingPayer?: string;
  status?: string;
  sellerId?: string;
  shopId?: string;
  sellerKind?: string;
  sort?: string;
  page?: number;
  perPage?: number;
  excludeId?: string;
};

function buildWhere(p: SearchParams) {
  const where: string[] = [];
  const params: Array<string | number> = [];

  if (p.status === "sold") where.push("i.status IN ('sold','trading')");
  else if (p.status === "on_sale") where.push("i.status = 'on_sale'");
  else where.push("i.status IN ('on_sale','trading','sold')");

  if (p.q) {
    where.push("(i.title LIKE ? OR i.description LIKE ?)");
    params.push(`%${p.q}%`, `%${p.q}%`);
  }
  const catId = p.categoryId ?? (p.categorySlug ? categoryBySlug(p.categorySlug)?.id : undefined);
  if (catId) {
    const ids = descendantCategoryIds(catId);
    where.push(`i.category_id IN (${ids.map(() => "?").join(",")})`);
    params.push(...ids);
  }
  if (p.brandId) {
    where.push("i.brand_id = ?");
    params.push(p.brandId);
  }
  if (p.priceMin !== undefined && !Number.isNaN(p.priceMin)) {
    where.push("i.price >= ?");
    params.push(p.priceMin);
  }
  if (p.priceMax !== undefined && !Number.isNaN(p.priceMax)) {
    where.push("i.price <= ?");
    params.push(p.priceMax);
  }
  if (p.conditions?.length) {
    where.push(`i.condition IN (${p.conditions.map(() => "?").join(",")})`);
    params.push(...p.conditions);
  }
  if (p.shippingPayer) {
    where.push("i.shipping_payer = ?");
    params.push(p.shippingPayer);
  }
  if (p.sellerId) {
    where.push("i.seller_id = ?");
    params.push(p.sellerId);
  }
  if (p.shopId) {
    where.push("i.shop_id = ?");
    params.push(p.shopId);
  }
  if (p.sellerKind === "shop") where.push("i.shop_id IS NOT NULL");
  if (p.sellerKind === "person") where.push("i.shop_id IS NULL");
  // Los artículos de tiendas suspendidas o en revisión no aparecen en el catálogo.
  where.push("(i.shop_id IS NULL OR i.shop_id IN (SELECT id FROM shops WHERE status = 'active'))");
  if (p.excludeId) {
    where.push("i.id != ?");
    params.push(p.excludeId);
  }
  return { clause: where.length ? `WHERE ${where.join(" AND ")}` : "", params };
}

function orderBy(sort?: string) {
  switch (sort) {
    case "old": return "ORDER BY i.created_at ASC";
    case "price_asc": return "ORDER BY i.price ASC";
    case "price_desc": return "ORDER BY i.price DESC";
    case "likes": return "ORDER BY likes DESC, i.created_at DESC";
    default: return "ORDER BY i.created_at DESC";
  }
}

export function searchItems(p: SearchParams): { items: ItemCard[]; total: number } {
  const { clause, params } = buildWhere(p);
  const perPage = p.perPage ?? 24;
  const page = Math.max(1, p.page ?? 1);
  const items = all<ItemCard>(
    `${CARD_SELECT} ${clause} ${orderBy(p.sort)} LIMIT ? OFFSET ?`,
    [...params, perPage, (page - 1) * perPage],
  );
  const total =
    get<{ n: number }>(`SELECT COUNT(*) AS n FROM items i ${clause}`, params)?.n ?? 0;
  return { items, total };
}

export function itemById(id: string): ItemCard | undefined {
  return get<ItemCard>(`${CARD_SELECT} WHERE i.id = ?`, [id]);
}

export function itemsByIds(ids: string[]): ItemCard[] {
  if (!ids.length) return [];
  return all<ItemCard>(
    `${CARD_SELECT} WHERE i.id IN (${ids.map(() => "?").join(",")})`,
    ids,
  );
}

export function itemImages(itemId: string) {
  return all<{ id: number; url: string; position: number }>(
    "SELECT * FROM item_images WHERE item_id = ? ORDER BY position",
    [itemId],
  );
}

export function isLiked(userId: string, itemId: string): boolean {
  return !!get("SELECT 1 AS x FROM likes WHERE user_id = ? AND item_id = ?", [userId, itemId]);
}

export function likeCount(itemId: string): number {
  return get<{ n: number }>("SELECT COUNT(*) AS n FROM likes WHERE item_id = ?", [itemId])?.n ?? 0;
}

export function itemComments(itemId: string): Comment[] {
  return all<Comment>(
    `SELECT c.*, u.name, u.handle, u.avatar_seed
     FROM comments c JOIN users u ON u.id = c.user_id
     WHERE c.item_id = ? ORDER BY c.created_at ASC`,
    [itemId],
  );
}

export function itemOffers(itemId: string) {
  return all<{
    id: string; item_id: string; user_id: string; price: number; status: string;
    created_at: string; name: string; handle: string; avatar_seed: string;
  }>(
    `SELECT o.*, u.name, u.handle, u.avatar_seed FROM offers o
     JOIN users u ON u.id = o.user_id WHERE o.item_id = ? ORDER BY o.created_at DESC`,
    [itemId],
  );
}

/* ------------------------------ Mercado Shops ---------------------------- */

export function shopById(id: string): Shop | undefined {
  return get<Shop>("SELECT * FROM shops WHERE id = ?", [id]);
}

export function shopBySlug(slug: string): Shop | undefined {
  return get<Shop>("SELECT * FROM shops WHERE slug = ?", [slug]);
}

export function shopOfUser(userId: string): Shop | undefined {
  return get<Shop>("SELECT * FROM shops WHERE owner_id = ? ORDER BY created_at LIMIT 1", [userId]);
}

export function activeShops(q?: string, category?: string): (Shop & { items: number; followers: number })[] {
  const where = ["status = 'active'"];
  const params: Array<string | number> = [];
  if (q) {
    where.push("(name LIKE ? OR description LIKE ?)");
    params.push(`%${q}%`, `%${q}%`);
  }
  if (category) {
    where.push("category = ?");
    params.push(category);
  }
  return all<Shop & { items: number; followers: number }>(
    `SELECT s.*,
       (SELECT COUNT(*) FROM items WHERE shop_id = s.id AND status = 'on_sale') AS items,
       (SELECT COUNT(*) FROM shop_follows WHERE shop_id = s.id) AS followers
     FROM shops s WHERE ${where.join(" AND ")} ORDER BY items DESC, s.created_at DESC`,
    params,
  );
}

export function shopItems(shopId: string, statuses = ["on_sale"]): ItemCard[] {
  return all<ItemCard>(
    `${CARD_SELECT} WHERE i.shop_id = ? AND i.status IN (${statuses.map(() => "?").join(",")})
     ORDER BY i.updated_at DESC`,
    [shopId, ...statuses],
  );
}

export function shopStats(shopId: string) {
  const items = get<{ n: number }>(
    "SELECT COUNT(*) AS n FROM items WHERE shop_id = ? AND status = 'on_sale'", [shopId])?.n ?? 0;
  const sold = get<{ n: number }>("SELECT COUNT(*) AS n FROM orders WHERE shop_id = ?", [shopId])?.n ?? 0;
  const revenue = get<{ n: number }>(
    "SELECT COALESCE(SUM(payout), 0) AS n FROM orders WHERE shop_id = ? AND status = 'done'", [shopId])?.n ?? 0;
  const pending = get<{ n: number }>(
    "SELECT COUNT(*) AS n FROM orders WHERE shop_id = ? AND status = 'paid'", [shopId])?.n ?? 0;
  const followers = get<{ n: number }>(
    "SELECT COUNT(*) AS n FROM shop_follows WHERE shop_id = ?", [shopId])?.n ?? 0;
  const stock = get<{ n: number }>(
    "SELECT COALESCE(SUM(stock), 0) AS n FROM items WHERE shop_id = ? AND status = 'on_sale'", [shopId])?.n ?? 0;
  return { items, sold, revenue, pending, followers, stock };
}

export function shopOrders(shopId: string): OrderRow[] {
  return all<OrderRow>(`${ORDER_SELECT} WHERE o.shop_id = ? ORDER BY o.created_at DESC`, [shopId]);
}

export function shopRating(shopId: string) {
  const rows = all<{ score: string; n: number }>(
    `SELECT r.score, COUNT(*) AS n FROM reviews r
     JOIN orders o ON o.id = r.order_id
     WHERE o.shop_id = ? AND r.ratee_id = o.seller_id GROUP BY r.score`,
    [shopId],
  );
  const map: Record<string, number> = { good: 0, normal: 0, bad: 0 };
  for (const row of rows) map[row.score] = row.n;
  return {
    good: map.good, normal: map.normal, bad: map.bad,
    total: map.good + map.normal + map.bad,
  };
}

export function isFollowingShop(userId: string, shopId: string): boolean {
  return !!get("SELECT 1 AS x FROM shop_follows WHERE user_id = ? AND shop_id = ?", [userId, shopId]);
}

export function followedShops(userId: string): Shop[] {
  return all<Shop>(
    `SELECT s.* FROM shop_follows f JOIN shops s ON s.id = f.shop_id
     WHERE f.user_id = ? AND s.status = 'active' ORDER BY f.created_at DESC`,
    [userId],
  );
}

export function variantsOf(itemId: string): Variant[] {
  return all<Variant>("SELECT * FROM item_variants WHERE item_id = ? ORDER BY position, id", [itemId]);
}

export function itemsFromFollowedShops(userId: string, limit = 12): ItemCard[] {
  return all<ItemCard>(
    `${CARD_SELECT} JOIN shop_follows f ON f.shop_id = i.shop_id
     WHERE f.user_id = ? AND i.status = 'on_sale' AND sh.status = 'active'
     ORDER BY i.created_at DESC LIMIT ?`,
    [userId, limit],
  );
}

export function shopItemsForHome(limit = 12): ItemCard[] {
  return all<ItemCard>(
    `${CARD_SELECT} WHERE i.status = 'on_sale' AND i.shop_id IS NOT NULL AND sh.status = 'active'
     ORDER BY i.created_at DESC LIMIT ?`,
    [limit],
  );
}

export function draftsOf(userId: string): ItemCard[] {
  return all<ItemCard>(`${CARD_SELECT} WHERE i.seller_id = ? AND i.status = 'draft' ORDER BY i.updated_at DESC`, [userId]);
}

export function listingsOf(userId: string, status: string[]): ItemCard[] {
  return all<ItemCard>(
    `${CARD_SELECT} WHERE i.seller_id = ? AND i.status IN (${status.map(() => "?").join(",")})
     ORDER BY i.updated_at DESC`,
    [userId, ...status],
  );
}

export function likedItems(userId: string): ItemCard[] {
  return all<ItemCard>(
    `${CARD_SELECT} JOIN likes l ON l.item_id = i.id WHERE l.user_id = ? ORDER BY l.created_at DESC`,
    [userId],
  );
}

export function historyItems(userId: string): ItemCard[] {
  return all<ItemCard>(
    `${CARD_SELECT} JOIN history h ON h.item_id = i.id WHERE h.user_id = ? ORDER BY h.viewed_at DESC LIMIT 60`,
    [userId],
  );
}

/* ------------------------------------ usuarios --------------------------------- */

export function userById(id: string): User | undefined {
  return get<User>("SELECT * FROM users WHERE id = ?", [id]);
}

export function userByHandle(handle: string): User | undefined {
  return get<User>("SELECT * FROM users WHERE handle = ?", [handle]);
}

export function ratingSummary(userId: string): {
  good: number; normal: number; bad: number; total: number;
} {
  const rows = all<{ score: string; n: number }>(
    "SELECT score, COUNT(*) AS n FROM reviews WHERE ratee_id = ? GROUP BY score",
    [userId],
  );
  const map: Record<string, number> = { good: 0, normal: 0, bad: 0 };
  for (const r of rows) map[r.score] = r.n;
  return {
    good: map.good,
    normal: map.normal,
    bad: map.bad,
    total: map.good + map.normal + map.bad,
  };
}

export function reviewsOf(userId: string) {
  return all<{
    id: string; score: string; body: string; created_at: string;
    name: string; handle: string; avatar_seed: string; item_title: string; item_id: string;
  }>(
    `SELECT r.id, r.score, r.body, r.created_at, u.name, u.handle, u.avatar_seed,
            i.title AS item_title, i.id AS item_id
     FROM reviews r
     JOIN users u ON u.id = r.rater_id
     JOIN orders o ON o.id = r.order_id
     JOIN items i ON i.id = o.item_id
     WHERE r.ratee_id = ? ORDER BY r.created_at DESC`,
    [userId],
  );
}

export function isFollowing(followerId: string, followeeId: string): boolean {
  return !!get("SELECT 1 AS x FROM follows WHERE follower_id = ? AND followee_id = ?", [
    followerId, followeeId,
  ]);
}

export function followCounts(userId: string) {
  const following = get<{ n: number }>("SELECT COUNT(*) AS n FROM follows WHERE follower_id = ?", [userId])?.n ?? 0;
  const followers = get<{ n: number }>("SELECT COUNT(*) AS n FROM follows WHERE followee_id = ?", [userId])?.n ?? 0;
  return { following, followers };
}

export function followList(userId: string, kind: "following" | "followers"): User[] {
  const sql = kind === "following"
    ? `SELECT u.* FROM follows f JOIN users u ON u.id = f.followee_id WHERE f.follower_id = ? ORDER BY f.created_at DESC`
    : `SELECT u.* FROM follows f JOIN users u ON u.id = f.follower_id WHERE f.followee_id = ? ORDER BY f.created_at DESC`;
  return all<User>(sql, [userId]);
}

/* ------------------------------------ pedidos ---------------------------------- */

export type OrderRow = Order & {
  title: string;
  image: string | null;
  buyer_name: string;
  buyer_handle: string;
  buyer_avatar: string;
  seller_name: string;
  seller_handle: string;
  seller_avatar: string;
  unread: number;
};

const ORDER_SELECT = `
  SELECT o.*, i.title,
    (SELECT url FROM item_images WHERE item_id = i.id ORDER BY position LIMIT 1) AS image,
    b.name AS buyer_name, b.handle AS buyer_handle, b.avatar_seed AS buyer_avatar,
    s.name AS seller_name, s.handle AS seller_handle, s.avatar_seed AS seller_avatar,
    (SELECT COUNT(*) FROM messages m WHERE m.order_id = o.id) AS unread
  FROM orders o
  JOIN items i ON i.id = o.item_id
  JOIN users b ON b.id = o.buyer_id
  JOIN users s ON s.id = o.seller_id
`;

export function orderById(id: string): OrderRow | undefined {
  return get<OrderRow>(`${ORDER_SELECT} WHERE o.id = ?`, [id]);
}

export function orderByItem(itemId: string): OrderRow | undefined {
  return get<OrderRow>(`${ORDER_SELECT} WHERE o.item_id = ? ORDER BY o.created_at DESC LIMIT 1`, [itemId]);
}

export function purchasesOf(userId: string): OrderRow[] {
  return all<OrderRow>(`${ORDER_SELECT} WHERE o.buyer_id = ? ORDER BY o.created_at DESC`, [userId]);
}

export function salesOf(userId: string): OrderRow[] {
  return all<OrderRow>(`${ORDER_SELECT} WHERE o.seller_id = ? ORDER BY o.created_at DESC`, [userId]);
}

export function openOrdersOf(userId: string): OrderRow[] {
  return all<OrderRow>(
    `${ORDER_SELECT} WHERE (o.buyer_id = ? OR o.seller_id = ?) AND o.status != 'done'
     ORDER BY o.created_at DESC`,
    [userId, userId],
  );
}

export function orderMessages(orderId: string) {
  return all<{
    id: string; user_id: string; body: string; created_at: string;
    name: string; handle: string; avatar_seed: string;
  }>(
    `SELECT m.*, u.name, u.handle, u.avatar_seed FROM messages m
     JOIN users u ON u.id = m.user_id WHERE m.order_id = ? ORDER BY m.created_at ASC`,
    [orderId],
  );
}

export function orderReviews(orderId: string) {
  return all<{ id: string; rater_id: string; ratee_id: string; score: string; body: string; created_at: string }>(
    "SELECT * FROM reviews WHERE order_id = ?",
    [orderId],
  );
}

/* --------------------------- notificaciones y cartera -------------------------- */

export function notificationsOf(userId: string): Notification[] {
  return all<Notification>(
    "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 80",
    [userId],
  );
}

export function unreadCount(userId: string): number {
  return get<{ n: number }>(
    "SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND is_read = 0",
    [userId],
  )?.n ?? 0;
}

export function ledgerOf(userId: string) {
  return all<{ id: string; kind: string; amount: number; memo: string; created_at: string }>(
    "SELECT * FROM ledger WHERE user_id = ? ORDER BY created_at DESC LIMIT 100",
    [userId],
  );
}

export function couponsOf(userId: string) {
  return all<{
    id: string; title: string; code: string; amount: number;
    min_price: number; expires_at: string; used_at: string | null;
  }>("SELECT * FROM coupons WHERE user_id = ? ORDER BY expires_at ASC", [userId]);
}

export function usableCoupons(userId: string, price: number) {
  return all<{ id: string; title: string; amount: number; min_price: number; expires_at: string }>(
    `SELECT id, title, amount, min_price, expires_at FROM coupons
     WHERE user_id = ? AND used_at IS NULL AND min_price <= ? AND expires_at > ?
     ORDER BY amount DESC`,
    [userId, price, new Date().toISOString()],
  );
}

export function cardsOf(userId: string) {
  return all<{ id: string; brand: string; last4: string; exp: string; holder: string; is_default: number }>(
    "SELECT * FROM cards WHERE user_id = ? ORDER BY is_default DESC, created_at DESC",
    [userId],
  );
}

export function payoutsOf(userId: string) {
  return all<{ id: string; amount: number; fee: number; iban: string; holder: string; status: string; created_at: string }>(
    "SELECT * FROM payouts WHERE user_id = ? ORDER BY created_at DESC",
    [userId],
  );
}

export function savedSearchesOf(userId: string) {
  return all<{ id: string; label: string; query: string; notify: number; created_at: string }>(
    "SELECT * FROM saved_searches WHERE user_id = ? ORDER BY created_at DESC",
    [userId],
  );
}

/* ------------------------------------- home ------------------------------------ */

export function trendingItems(limit = 12): ItemCard[] {
  return all<ItemCard>(
    `${CARD_SELECT} WHERE i.status = 'on_sale' ORDER BY likes DESC, i.views DESC LIMIT ?`,
    [limit],
  );
}

export function recentItems(limit = 24): ItemCard[] {
  return all<ItemCard>(
    `${CARD_SELECT} WHERE i.status = 'on_sale' ORDER BY i.created_at DESC LIMIT ?`,
    [limit],
  );
}

export function itemsFromFollowed(userId: string, limit = 12): ItemCard[] {
  return all<ItemCard>(
    `${CARD_SELECT} JOIN follows f ON f.followee_id = i.seller_id
     WHERE f.follower_id = ? AND i.status = 'on_sale'
     ORDER BY i.created_at DESC LIMIT ?`,
    [userId, limit],
  );
}

export function recommendedFor(userId: string, limit = 24): ItemCard[] {
  const rows = all<ItemCard>(
    `${CARD_SELECT}
     WHERE i.status = 'on_sale' AND i.seller_id != ?
       AND i.category_id IN (
         SELECT DISTINCT it.category_id FROM history h JOIN items it ON it.id = h.item_id WHERE h.user_id = ?
         UNION
         SELECT DISTINCT it2.category_id FROM likes l JOIN items it2 ON it2.id = l.item_id WHERE l.user_id = ?
       )
     ORDER BY i.created_at DESC LIMIT ?`,
    [userId, userId, userId, limit],
  );
  if (rows.length >= 6) return rows;
  return recentItems(limit);
}

export function relatedItems(item: Item, limit = 12): ItemCard[] {
  return all<ItemCard>(
    `${CARD_SELECT} WHERE i.status = 'on_sale' AND i.id != ? AND (i.category_id = ? OR i.brand_id = ?)
     ORDER BY i.created_at DESC LIMIT ?`,
    [item.id, item.category_id ?? 0, item.brand_id ?? 0, limit],
  );
}

export function popularKeywords(): string[] {
  return [
    "Nintendo Switch", "iPhone", "Zara", "vestido", "vinilos", "LEGO",
    "bicicleta", "cámara réflex", "Pokémon", "auriculares",
  ];
}

export type CategoryTreeNode = { id: number; name: string; children: CategoryTreeNode[] };

export function categoryTree(): CategoryTreeNode[] {
  const rows = allCategories();
  const byParent = new Map<number | null, Category[]>();
  for (const row of rows) {
    const key = row.parent_id ?? null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(row);
  }
  const build = (parent: number | null): CategoryTreeNode[] =>
    (byParent.get(parent) ?? []).map((c) => ({ id: c.id, name: c.name, children: build(c.id) }));
  return build(null);
}


/* ======================= Red de negocios: mayoreo (B2B) ====================== */

export function b2bPricesOf(itemId: string): B2bPrice[] {
  return all<B2bPrice>("SELECT * FROM b2b_prices WHERE item_id = ? ORDER BY min_qty", [itemId]);
}

export function b2bPriceFor(itemId: string, quantity: number): number | null {
  const tier = get<{ price: number }>(
    "SELECT price FROM b2b_prices WHERE item_id = ? AND min_qty <= ? ORDER BY min_qty DESC LIMIT 1",
    [itemId, quantity],
  );
  return tier?.price ?? null;
}

export function hasWholesale(itemId: string): boolean {
  return !!get("SELECT 1 AS x FROM b2b_prices WHERE item_id = ?", [itemId]);
}

export function partnerBetween(buyerShopId: string, supplierShopId: string): ShopPartner | undefined {
  return get<ShopPartner>(
    "SELECT * FROM shop_partners WHERE buyer_shop_id = ? AND supplier_shop_id = ?",
    [buyerShopId, supplierShopId],
  );
}

export type PartnerRow = ShopPartner & {
  shop_name: string; shop_slug: string; shop_emoji: string; shop_category: string; shop_region: string;
};

export function partnerRequestsFor(supplierShopId: string): PartnerRow[] {
  return all<PartnerRow>(
    `SELECT p.*, s.name AS shop_name, s.slug AS shop_slug, s.cover_emoji AS shop_emoji,
            s.category AS shop_category, s.ship_from AS shop_region
     FROM shop_partners p JOIN shops s ON s.id = p.buyer_shop_id
     WHERE p.supplier_shop_id = ? ORDER BY p.created_at DESC`,
    [supplierShopId],
  );
}

export function partnershipsOf(buyerShopId: string): PartnerRow[] {
  return all<PartnerRow>(
    `SELECT p.*, s.name AS shop_name, s.slug AS shop_slug, s.cover_emoji AS shop_emoji,
            s.category AS shop_category, s.ship_from AS shop_region
     FROM shop_partners p JOIN shops s ON s.id = p.supplier_shop_id
     WHERE p.buyer_shop_id = ? ORDER BY p.created_at DESC`,
    [buyerShopId],
  );
}

/** Tiendas que ofrecen catálogo de mayoreo. */
export function supplierShops(q?: string, category?: string) {
  const where = ["s.status = 'active'", "EXISTS (SELECT 1 FROM items i JOIN b2b_prices b ON b.item_id = i.id WHERE i.shop_id = s.id AND i.status = 'on_sale')"];
  const params: Array<string | number> = [];
  if (q) {
    where.push("(s.name LIKE ? OR s.description LIKE ?)");
    params.push(`%${q}%`, `%${q}%`);
  }
  if (category) {
    where.push("s.category = ?");
    params.push(category);
  }
  return all<Shop & { products: number; min_price: number }>(
    `SELECT s.*,
       (SELECT COUNT(*) FROM items i JOIN b2b_prices b ON b.item_id = i.id
        WHERE i.shop_id = s.id AND i.status = 'on_sale') AS products,
       (SELECT MIN(b.price) FROM items i JOIN b2b_prices b ON b.item_id = i.id
        WHERE i.shop_id = s.id AND i.status = 'on_sale') AS min_price
     FROM shops s WHERE ${where.join(" AND ")} ORDER BY products DESC, s.name`,
    params,
  );
}

export function wholesaleCatalog(shopId: string): (ItemCard & { tiers: B2bPrice[] })[] {
  const items = all<ItemCard>(
    `${CARD_SELECT} WHERE i.shop_id = ? AND i.status = 'on_sale'
       AND EXISTS (SELECT 1 FROM b2b_prices b WHERE b.item_id = i.id)
     ORDER BY i.updated_at DESC`,
    [shopId],
  );
  return items.map((item) => ({ ...item, tiers: b2bPricesOf(item.id) }));
}

export function wholesaleOrdersOf(shopId: string, role: "buyer" | "supplier"): OrderRow[] {
  const clause = role === "supplier" ? "o.shop_id = ?" : "o.buyer_id IN (SELECT owner_id FROM shops WHERE id = ?)";
  return all<OrderRow>(
    `${ORDER_SELECT} WHERE ${clause} AND o.is_wholesale = 1 ORDER BY o.created_at DESC`,
    [shopId],
  );
}

/* ========================== Envíos consolidados ============================= */

export function shipmentsOf(shopId: string): (Shipment & { orders: number })[] {
  return all<Shipment & { orders: number }>(
    `SELECT s.*, (SELECT COUNT(*) FROM orders o WHERE o.shipment_id = s.id) AS orders
     FROM shipments s WHERE s.shop_id = ? ORDER BY s.created_at DESC`,
    [shopId],
  );
}

export function shipmentById(id: string): Shipment | undefined {
  return get<Shipment>("SELECT * FROM shipments WHERE id = ?", [id]);
}

export function ordersInShipment(shipmentId: string): OrderRow[] {
  return all<OrderRow>(`${ORDER_SELECT} WHERE o.shipment_id = ? ORDER BY o.created_at`, [shipmentId]);
}

/** Pedidos pagados de la tienda que todavía no están en ningún envío. */
export function consolidatableOrders(shopId: string): OrderRow[] {
  return all<OrderRow>(
    `${ORDER_SELECT} WHERE o.shop_id = ? AND o.status = 'paid' AND (o.shipment_id IS NULL OR o.shipment_id = '')
     ORDER BY o.ship_region, o.created_at`,
    [shopId],
  );
}

/* ================================ Colectivos =============================== */

export function allCollectives(): (Collective & { members: number; products: number })[] {
  return all<Collective & { members: number; products: number }>(
    `SELECT c.*,
       (SELECT COUNT(*) FROM collective_members m WHERE m.collective_id = c.id) AS members,
       (SELECT COUNT(*) FROM items i WHERE i.status = 'on_sale' AND i.shop_id IN
          (SELECT shop_id FROM collective_members WHERE collective_id = c.id)) AS products
     FROM collectives c ORDER BY members DESC, c.created_at DESC`,
  );
}

export function collectiveBySlug(slug: string): Collective | undefined {
  return get<Collective>("SELECT * FROM collectives WHERE slug = ?", [slug]);
}

export function collectiveMembers(collectiveId: string) {
  return all<Shop & { role: string; joined_at: string; products: number }>(
    `SELECT s.*, m.role, m.joined_at,
       (SELECT COUNT(*) FROM items i WHERE i.shop_id = s.id AND i.status = 'on_sale') AS products
     FROM collective_members m JOIN shops s ON s.id = m.shop_id
     WHERE m.collective_id = ? ORDER BY m.role, s.name`,
    [collectiveId],
  );
}

export function collectiveItems(collectiveId: string, limit = 24): ItemCard[] {
  return all<ItemCard>(
    `${CARD_SELECT} WHERE i.status = 'on_sale' AND i.shop_id IN
       (SELECT shop_id FROM collective_members WHERE collective_id = ?)
     ORDER BY i.created_at DESC LIMIT ?`,
    [collectiveId, limit],
  );
}

export function collectivesOfShop(shopId: string): (Collective & { role: string })[] {
  return all<Collective & { role: string }>(
    `SELECT c.*, m.role FROM collective_members m JOIN collectives c ON c.id = m.collective_id
     WHERE m.shop_id = ? ORDER BY m.joined_at DESC`,
    [shopId],
  );
}

export function isCollectiveMember(collectiveId: string, shopId: string): boolean {
  return !!get("SELECT 1 AS x FROM collective_members WHERE collective_id = ? AND shop_id = ?",
    [collectiveId, shopId]);
}

/* ============================ Paquetes cruzados ============================= */

export type BundleRow = Bundle & { shop_name: string; shop_slug: string; shops: number };

export function bundlesOfShop(shopId: string): BundleRow[] {
  return all<BundleRow>(
    `SELECT b.*, s.name AS shop_name, s.slug AS shop_slug,
       (SELECT COUNT(DISTINCT bi.shop_id) FROM bundle_items bi WHERE bi.bundle_id = b.id) AS shops
     FROM bundles b JOIN shops s ON s.id = b.owner_shop_id
     WHERE b.owner_shop_id = ? OR b.id IN (SELECT bundle_id FROM bundle_items WHERE shop_id = ?)
     ORDER BY b.created_at DESC`,
    [shopId, shopId],
  );
}

export function activeBundles(limit = 8): BundleRow[] {
  return all<BundleRow>(
    `SELECT b.*, s.name AS shop_name, s.slug AS shop_slug,
       (SELECT COUNT(DISTINCT bi.shop_id) FROM bundle_items bi WHERE bi.bundle_id = b.id) AS shops
     FROM bundles b JOIN shops s ON s.id = b.owner_shop_id
     WHERE b.status = 'active' ORDER BY b.created_at DESC LIMIT ?`,
    [limit],
  );
}

export function bundleById(id: string): BundleRow | undefined {
  return get<BundleRow>(
    `SELECT b.*, s.name AS shop_name, s.slug AS shop_slug,
       (SELECT COUNT(DISTINCT bi.shop_id) FROM bundle_items bi WHERE bi.bundle_id = b.id) AS shops
     FROM bundles b JOIN shops s ON s.id = b.owner_shop_id WHERE b.id = ?`,
    [id],
  );
}

export function bundleItems(bundleId: string): ItemCard[] {
  return all<ItemCard>(
    `${CARD_SELECT} JOIN bundle_items bi ON bi.item_id = i.id
     WHERE bi.bundle_id = ? ORDER BY bi.position`,
    [bundleId],
  );
}

/** Paquetes en los que participa un artículo (para la venta cruzada en su ficha). */
export function bundlesForItem(itemId: string): BundleRow[] {
  return all<BundleRow>(
    `SELECT b.*, s.name AS shop_name, s.slug AS shop_slug,
       (SELECT COUNT(DISTINCT bi2.shop_id) FROM bundle_items bi2 WHERE bi2.bundle_id = b.id) AS shops
     FROM bundle_items bi
     JOIN bundles b ON b.id = bi.bundle_id
     JOIN shops s ON s.id = b.owner_shop_id
     WHERE bi.item_id = ? AND b.status = 'active'`,
    [itemId],
  );
}

/* ========================= Adelanto de saldo (factoraje) ==================== */

export function pendingSales(shopId: string) {
  const row = get<{ total: number; orders: number }>(
    `SELECT COALESCE(SUM(payout), 0) AS total, COUNT(*) AS orders
     FROM orders WHERE shop_id = ? AND status IN ('paid', 'shipped', 'received')`,
    [shopId],
  );
  return { total: row?.total ?? 0, orders: row?.orders ?? 0 };
}

export function advancesOf(shopId: string): Advance[] {
  return all<Advance>("SELECT * FROM advances WHERE shop_id = ? ORDER BY created_at DESC", [shopId]);
}

export function activeAdvance(shopId: string): Advance | undefined {
  refreshAdvanceStatus(shopId);
  return get<Advance>(
    "SELECT * FROM advances WHERE shop_id = ? AND status IN ('active', 'overdue') ORDER BY created_at LIMIT 1",
    [shopId],
  );
}

/** Marca como vencidos los adelantos que pasaron su fecha límite sin amortizarse. */
export function refreshAdvanceStatus(shopId: string) {
  run(
    `UPDATE advances SET status = 'overdue'
     WHERE shop_id = ? AND status = 'active' AND outstanding > 0 AND due_at IS NOT NULL AND due_at < ?`,
    [shopId, new Date().toISOString()],
  );
}

/** Historial de cumplimiento de la tienda, base del análisis de riesgo. */
export function shopTrackRecord(shopId: string) {
  const row = get<{
    completed: number; cancelled: number; total: number; volume: number; first_order: string | null;
  }>(
    `SELECT
       SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS completed,
       SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
       COUNT(*) AS total,
       COALESCE(SUM(CASE WHEN status = 'done' THEN payout ELSE 0 END), 0) AS volume,
       MIN(created_at) AS first_order
     FROM orders WHERE shop_id = ?`,
    [shopId],
  );
  const completed = row?.completed ?? 0;
  const cancelled = row?.cancelled ?? 0;
  const total = row?.total ?? 0;

  // Días promedio entre el pago y el cierre de la venta: es el plazo real del adelanto.
  const closed = all<{ created_at: string; completed_at: string }>(
    `SELECT created_at, completed_at FROM orders
     WHERE shop_id = ? AND status = 'done' AND completed_at IS NOT NULL
     ORDER BY completed_at DESC LIMIT 20`,
    [shopId],
  );
  const horizon = closed.length
    ? Math.max(
        7,
        Math.round(
          closed.reduce(
            (sum, o) =>
              sum + (new Date(o.completed_at).getTime() - new Date(o.created_at).getTime()) / 86400000,
            0,
          ) / closed.length,
        ),
      )
    : ADVANCE_DEFAULT_HORIZON;

  return {
    completed,
    cancelled,
    total,
    volume: row?.volume ?? 0,
    cancellationRate: total ? cancelled / total : 0,
    horizonDays: horizon,
  };
}

export type AdvanceEligibility = {
  eligible: boolean;
  blockers: string[];
  checks: { label: string; ok: boolean; detail: string }[];
  tier: { key: string; label: string; rate: number };
  limit: number;
  pending: number;
  horizonDays: number;
  apr: number;
  feeRate: number;
  active?: Advance;
  record: ReturnType<typeof shopTrackRecord>;
};

/** Análisis de riesgo del adelanto: qué se puede prestar, a qué costo y por qué. */
export function advanceEligibility(shop: Shop, user: User): AdvanceEligibility {
  const record = shopTrackRecord(shop.id);
  const pending = pendingSales(shop.id).total;
  const active = activeAdvance(shop.id);
  const shopAgeDays = Math.floor(
    (Date.now() - new Date(shop.created_at).getTime()) / 86400000,
  );

  const tier =
    [...ADVANCE_TIERS].reverse().find((t) => record.completed >= t.minCompleted) ?? {
      key: "sin_historial",
      label: "Sin historial",
      rate: 0,
    };

  const limit = Math.min(
    ADVANCE_MAX_AMOUNT,
    Math.floor(pending * tier.rate),
  );

  const checks = [
    {
      label: `Al menos ${ADVANCE_REQUIREMENTS.minCompletedOrders} ventas completadas`,
      ok: record.completed >= ADVANCE_REQUIREMENTS.minCompletedOrders,
      detail: `${record.completed} completadas`,
    },
    {
      label: `Tienda con ${ADVANCE_REQUIREMENTS.minShopAgeDays} días o más de operación`,
      ok: shopAgeDays >= ADVANCE_REQUIREMENTS.minShopAgeDays,
      detail: `${shopAgeDays} días`,
    },
    {
      label: "Cancelaciones por debajo del 20 %",
      ok: record.cancellationRate <= ADVANCE_REQUIREMENTS.maxCancellationRate,
      detail: `${Math.round(record.cancellationRate * 100)} % de cancelaciones`,
    },
    {
      label: "Identidad verificada",
      ok: !ADVANCE_REQUIREMENTS.requiresVerifiedIdentity || !!user.is_verified,
      detail: user.is_verified ? "verificada" : "pendiente",
    },
    {
      label: "Sin adelantos activos ni vencidos",
      ok: !active,
      detail: active
        ? active.status === "overdue"
          ? "tienes un adelanto vencido"
          : "tienes un adelanto en curso"
        : "sin adeudos",
    },
    {
      label: `Ventas en curso suficientes (mínimo $${ADVANCE_MIN} disponibles)`,
      ok: limit >= ADVANCE_MIN,
      detail: `$${limit} disponibles`,
    },
  ];

  const blockers = checks.filter((c) => !c.ok).map((c) => c.label);

  return {
    eligible: blockers.length === 0,
    blockers,
    checks,
    tier,
    limit,
    pending,
    horizonDays: record.horizonDays,
    apr: advanceApr(ADVANCE_FEE_RATE, record.horizonDays),
    feeRate: ADVANCE_FEE_RATE,
    active,
    record,
  };
}

/* ============================ Importación de catálogo ====================== */

export function importJobsOf(shopId: string) {
  return all<{
    id: string; filename: string; created: number; updated: number;
    skipped: number; errors: string; created_at: string;
  }>("SELECT * FROM import_jobs WHERE shop_id = ? ORDER BY created_at DESC LIMIT 20", [shopId]);
}

/** Productos de tiendas aliadas: socias de mayoreo (en cualquier sentido) o del mismo colectivo. */
export function alliedShopItems(shopId: string, limit = 60) {
  return all<{ id: string; title: string; price: number; shop: string; shop_slug: string }>(
    `SELECT i.id, i.title, i.price, s.name AS shop, s.slug AS shop_slug
     FROM items i JOIN shops s ON s.id = i.shop_id
     WHERE i.status = 'on_sale' AND i.shop_id != ? AND s.status = 'active' AND i.shop_id IN (
       SELECT supplier_shop_id FROM shop_partners WHERE buyer_shop_id = ? AND status = 'approved'
       UNION
       SELECT buyer_shop_id FROM shop_partners WHERE supplier_shop_id = ? AND status = 'approved'
       UNION
       SELECT shop_id FROM collective_members WHERE collective_id IN
         (SELECT collective_id FROM collective_members WHERE shop_id = ?)
     )
     ORDER BY i.created_at DESC LIMIT ?`,
    [shopId, shopId, shopId, shopId, limit],
  );
}

/* ===================== Especialización: producir vs. surtir ================= */

function keywords(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9ñ]+/)
    .filter((word) => word.length > 3)
    .slice(0, 8);
}

/** Proveedores cuya especialidad coincide con lo que esta tienda quiere surtir. */
export function suppliersForNeeds(shop: Shop, limit = 6) {
  const words = keywords(shop.sourcing_needs);
  if (!words.length) return [];
  const like = words.map(() => "(LOWER(s.specialty) LIKE ? OR LOWER(s.category) LIKE ? OR LOWER(s.description) LIKE ?)");
  const params: string[] = [];
  for (const word of words) params.push(`%${word}%`, `%${word}%`, `%${word}%`);
  return all<Shop & { products: number; matched: number }>(
    `SELECT s.*,
       (SELECT COUNT(*) FROM items i JOIN b2b_prices b ON b.item_id = i.id
        WHERE i.shop_id = s.id AND i.status = 'on_sale') AS products,
       1 AS matched
     FROM shops s
     WHERE s.status = 'active' AND s.id != ? AND (${like.join(" OR ")})
     ORDER BY products DESC LIMIT ?`,
    [shop.id, ...params, limit],
  );
}

/** Tiendas que buscan surtirse de lo que esta tienda produce. */
export function buyersForSpecialty(shop: Shop, limit = 6) {
  const words = keywords(`${shop.specialty} ${shop.category}`);
  if (!words.length) return [];
  const like = words.map(() => "LOWER(s.sourcing_needs) LIKE ?");
  const params = words.map((word) => `%${word}%`);
  return all<Shop & { products: number }>(
    `SELECT s.*,
       (SELECT COUNT(*) FROM items i WHERE i.shop_id = s.id AND i.status = 'on_sale') AS products
     FROM shops s
     WHERE s.status = 'active' AND s.id != ? AND s.sourcing_needs != '' AND (${like.join(" OR ")})
     ORDER BY products DESC LIMIT ?`,
    [shop.id, ...params, limit],
  );
}

/** Mezcla del catálogo: cuánto produce la tienda y cuánto surte de otras. */
export function specializationMix(shopId: string) {
  const row = get<{ own: number; sourced: number; sourced_shops: number }>(
    `SELECT
       SUM(CASE WHEN origin = 'own' THEN 1 ELSE 0 END) AS own,
       SUM(CASE WHEN origin = 'sourced' THEN 1 ELSE 0 END) AS sourced,
       COUNT(DISTINCT source_shop_id) AS sourced_shops
     FROM items WHERE shop_id = ? AND status IN ('on_sale', 'stopped', 'trading', 'sold')`,
    [shopId],
  );
  const own = row?.own ?? 0;
  const sourced = row?.sourced ?? 0;
  const total = own + sourced;
  return {
    own,
    sourced,
    total,
    shops: row?.sourced_shops ?? 0,
    ownShare: total ? Math.round((own / total) * 100) : 0,
  };
}

/** Pedidos de mayoreo recibidos que todavía no se publican en la tienda compradora. */
export function sourcedOrdersToList(shopId: string, buyerUserId: string) {
  return all<OrderRow & { listed: number }>(
    `${ORDER_SELECT}
     WHERE o.is_wholesale = 1 AND o.buyer_id = ? AND o.status IN ('shipped', 'received', 'done')
       AND NOT EXISTS (
         SELECT 1 FROM items x WHERE x.shop_id = ? AND x.source_item_id = o.item_id
       )
     ORDER BY o.created_at DESC`,
    [buyerUserId, shopId],
  ).map((order) => ({ ...order, listed: 0 }));
}

export function sourceOf(item: Item) {
  if (!item.source_shop_id) return undefined;
  const shop = get<Shop>("SELECT * FROM shops WHERE id = ?", [item.source_shop_id]);
  if (!shop) return undefined;
  const original = item.source_item_id
    ? get<{ id: string; title: string }>("SELECT id, title FROM items WHERE id = ?", [item.source_item_id])
    : undefined;
  return { shop, original };
}
