import "server-only";
import { all, get } from "./db";
import type { Category, Comment, Item, ItemCard, Notification, Order, Shop, User, Variant } from "./types";

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
