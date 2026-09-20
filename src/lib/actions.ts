"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { all, get, newId, nowIso, run, tx } from "./db";
import { createSession, currentUser, destroySession, hashPassword, verifyPassword } from "./auth";
import { ledgerEntry, notify } from "./notify";
import { saveImage } from "./upload";
import {
  ADVANCE_DUE_DAYS, ADVANCE_FEE_RATE, ADVANCE_MIN, advanceApr, B2B_FEE_RATE, B2B_MIN_QTY,
  CASH_FEE, CONSOLIDATED_UNIT_COST, FEE_RATE, MAX_PRICE, MIN_PAYOUT, MIN_PRICE, MSI_MIN,
  PAYOUT_FEE, shippingCostOf,
} from "./constants";
import { advanceEligibility } from "./queries";
import type { Item, Shipment, Shop, User } from "./types";

export type ActionState = { error?: string; ok?: string };

/* ================================ autenticación ================================ */

function slugifyHandle(name: string) {
  const base = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 16) || "usuario";
  let handle = base;
  let i = 1;
  while (get("SELECT 1 AS x FROM users WHERE handle = ?", [handle])) handle = `${base}${++i}`;
  return handle;
}

export async function signUpAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (name.length < 2) return { error: "Escribe tu nombre (mínimo 2 caracteres)." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "El correo electrónico no es válido." };
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };
  if (get("SELECT 1 AS x FROM users WHERE email = ?", [email]))
    return { error: "Ya existe una cuenta con ese correo electrónico." };

  const id = newId("u_");
  run(
    `INSERT INTO users (id, email, password_hash, name, handle, avatar_seed, bio, points, created_at)
     VALUES (?, ?, ?, ?, ?, ?, '', 300, ?)`,
    [id, email, hashPassword(password), name, slugifyHandle(name), String(Math.floor(Math.random() * 12)), nowIso()],
  );
  ledgerEntry(id, "points", 300, "Puntos de bienvenida");
  notify({ userId: id, kind: "news", title: "¡Te damos la bienvenida a Mercado!", body: "Tienes 300 puntos de regalo para tu primera compra.", link: "/mypage/points" });
  run(
    `INSERT INTO coupons (id, user_id, title, code, amount, min_price, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [newId("c_"), id, "Cupón de bienvenida: $100 de descuento", "BIENVENIDA100", 100, 400,
      new Date(Date.now() + 30 * 864e5).toISOString()],
  );
  await createSession(id);
  redirect("/");
}

export async function logInAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "/");
  const user = get<User>("SELECT * FROM users WHERE email = ?", [email]);
  if (!user || !verifyPassword(password, user.password_hash))
    return { error: "El correo o la contraseña no son correctos." };
  await createSession(user.id);
  redirect(next.startsWith("/") ? next : "/");
}

export async function logOutAction() {
  await destroySession();
  redirect("/");
}

/* =================================== artículos ================================= */

function num(form: FormData, key: string, fallback = 0) {
  const raw = String(form.get(key) ?? "").replace(",", ".");
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

async function collectImages(form: FormData, itemId: string, startPosition: number) {
  const files = form.getAll("photos").filter((f): f is File => f instanceof File);
  let position = startPosition;
  for (const file of files) {
    const url = await saveImage(file);
    if (url) {
      run("INSERT INTO item_images (item_id, url, position) VALUES (?, ?, ?)", [itemId, url, position++]);
    }
  }
  const generated = String(form.get("generated_image") ?? "").trim();
  if (position === startPosition && generated) {
    run("INSERT INTO item_images (item_id, url, position) VALUES (?, ?, ?)", [itemId, generated, position++]);
  }
  return position;
}

export async function saveItemAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await currentUser();
  if (!user) redirect("/login?next=/sell");

  const id = String(form.get("id") ?? "").trim() || newId("m");
  const existing = get<Item>("SELECT * FROM items WHERE id = ?", [id]);
  if (existing && existing.seller_id !== user.id) return { error: "No puedes editar este artículo." };
  if (existing && (existing.status === "sold" || existing.status === "trading"))
    return { error: "Este artículo ya se ha vendido y no se puede editar." };

  const asDraft = String(form.get("intent") ?? "") === "draft";
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const price = Math.round(num(form, "price"));
  const categoryId = Number(form.get("category_id")) || null;
  const brandId = Number(form.get("brand_id")) || null;

  if (!asDraft) {
    if (title.length < 3) return { error: "El título debe tener al menos 3 caracteres." };
    if (!categoryId) return { error: "Selecciona una categoría." };
    if (price < MIN_PRICE || price > MAX_PRICE)
      return { error: `El precio debe estar entre $${MIN_PRICE} y $${MAX_PRICE}.` };
  }

  const values = {
    title, description, price,
    category_id: categoryId,
    brand_id: brandId,
    size: String(form.get("size") ?? ""),
    color: String(form.get("color") ?? ""),
    condition: Number(form.get("condition")) || 1,
    shipping_payer: String(form.get("shipping_payer") ?? "seller"),
    shipping_method: String(form.get("shipping_method") ?? "facil"),
    ship_from: String(form.get("ship_from") ?? ""),
    ship_days: Number(form.get("ship_days")) || 1,
    offers_enabled: form.get("offers_enabled") ? 1 : 0,
    status: asDraft ? "draft" : "on_sale",
  };

  if (existing) {
    run(
      `UPDATE items SET title=?, description=?, price=?, category_id=?, brand_id=?, size=?, color=?,
        condition=?, shipping_payer=?, shipping_method=?, ship_from=?, ship_days=?, offers_enabled=?,
        status=?, updated_at=? WHERE id=?`,
      [values.title, values.description, values.price, values.category_id, values.brand_id, values.size,
       values.color, values.condition, values.shipping_payer, values.shipping_method, values.ship_from,
       values.ship_days, values.offers_enabled,
       existing.status === "stopped" && asDraft ? "stopped" : values.status, nowIso(), id],
    );
  } else {
    run(
      `INSERT INTO items (id, seller_id, title, description, price, category_id, brand_id, size, color,
        condition, shipping_payer, shipping_method, ship_from, ship_days, offers_enabled, status,
        created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, user.id, values.title, values.description, values.price, values.category_id, values.brand_id,
       values.size, values.color, values.condition, values.shipping_payer, values.shipping_method,
       values.ship_from, values.ship_days, values.offers_enabled, values.status, nowIso(), nowIso()],
    );
  }

  const removed = form.getAll("remove_image").map(String);
  for (const imgId of removed) {
    run("DELETE FROM item_images WHERE id = ? AND item_id = ?", [Number(imgId), id]);
  }
  const maxPos = get<{ p: number | null }>("SELECT MAX(position) AS p FROM item_images WHERE item_id = ?", [id])?.p;
  await collectImages(form, id, (maxPos ?? -1) + 1);

  if (!asDraft) {
    const followers = all<{ follower_id: string }>("SELECT follower_id FROM follows WHERE followee_id = ?", [user.id]);
    const image = get<{ url: string }>("SELECT url FROM item_images WHERE item_id = ? ORDER BY position LIMIT 1", [id])?.url ?? "";
    for (const f of followers) {
      notify({ userId: f.follower_id, kind: "news", title: `${user.name} ha publicado un artículo nuevo`, body: values.title, link: `/item/${id}`, image });
    }
  }

  revalidatePath("/");
  revalidatePath("/mypage/listings");
  redirect(asDraft ? "/mypage/drafts" : `/item/${id}?published=1`);
}

export async function deleteItemAction(formData: FormData) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const id = String(formData.get("id") ?? "");
  const item = get<Item>("SELECT * FROM items WHERE id = ?", [id]);
  if (!item || item.seller_id !== user.id) return;
  if (item.status === "trading" || item.status === "sold") return;
  run("DELETE FROM items WHERE id = ?", [id]);
  revalidatePath("/mypage/listings");
  redirect("/mypage/listings");
}

export async function toggleItemPauseAction(formData: FormData) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const id = String(formData.get("id") ?? "");
  const item = get<Item>("SELECT * FROM items WHERE id = ?", [id]);
  if (!item || item.seller_id !== user.id) return;
  const next = item.status === "stopped" ? "on_sale" : item.status === "on_sale" ? "stopped" : item.status;
  run("UPDATE items SET status = ?, updated_at = ? WHERE id = ?", [next, nowIso(), id]);
  revalidatePath(`/item/${id}`);
  revalidatePath("/mypage/listings");
}

export async function updatePriceAction(formData: FormData) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const id = String(formData.get("id") ?? "");
  const price = Math.round(Number(formData.get("price")));
  const item = get<Item>("SELECT * FROM items WHERE id = ?", [id]);
  if (!item || item.seller_id !== user.id) return;
  if (!Number.isFinite(price) || price < MIN_PRICE || price > MAX_PRICE) return;
  const lowered = price < item.price;
  run("UPDATE items SET price = ?, updated_at = ? WHERE id = ?", [price, nowIso(), id]);
  if (lowered) {
    const likers = all<{ user_id: string }>("SELECT user_id FROM likes WHERE item_id = ?", [id]);
    const image = get<{ url: string }>("SELECT url FROM item_images WHERE item_id = ? ORDER BY position LIMIT 1", [id])?.url ?? "";
    for (const l of likers) {
      notify({ userId: l.user_id, kind: "like", title: "¡Ha bajado de precio!", body: `${item.title} ahora cuesta $${price}`, link: `/item/${id}`, image });
    }
  }
  revalidatePath(`/item/${id}`);
}

export async function recordViewAction(itemId: string) {
  run("UPDATE items SET views = views + 1 WHERE id = ?", [itemId]);
  const user = await currentUser();
  if (!user) return;
  run(
    `INSERT INTO history (user_id, item_id, viewed_at) VALUES (?, ?, ?)
     ON CONFLICT(user_id, item_id) DO UPDATE SET viewed_at = excluded.viewed_at`,
    [user.id, itemId, nowIso()],
  );
}

export async function clearHistoryAction() {
  const user = await currentUser();
  if (!user) redirect("/login");
  run("DELETE FROM history WHERE user_id = ?", [user.id]);
  revalidatePath("/mypage/history");
}

/* ================================ social: likes ================================ */

export async function toggleLikeAction(formData: FormData) {
  const user = await currentUser();
  const itemId = String(formData.get("item_id") ?? "");
  if (!user) redirect(`/login?next=/item/${itemId}`);
  const item = get<Item>("SELECT * FROM items WHERE id = ?", [itemId]);
  if (!item) return;
  const liked = get("SELECT 1 AS x FROM likes WHERE user_id = ? AND item_id = ?", [user.id, itemId]);
  if (liked) {
    run("DELETE FROM likes WHERE user_id = ? AND item_id = ?", [user.id, itemId]);
  } else {
    run("INSERT INTO likes (user_id, item_id, created_at) VALUES (?, ?, ?)", [user.id, itemId, nowIso()]);
    if (item.seller_id !== user.id) {
      const image = get<{ url: string }>("SELECT url FROM item_images WHERE item_id = ? ORDER BY position LIMIT 1", [itemId])?.url ?? "";
      notify({ userId: item.seller_id, kind: "like", title: `A ${user.name} le gusta tu artículo`, body: item.title, link: `/item/${itemId}`, image });
    }
  }
  revalidatePath(`/item/${itemId}`);
  revalidatePath("/mypage/likes");
}

/* =============================== comentarios/ofertas =========================== */

export async function addCommentAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await currentUser();
  const itemId = String(form.get("item_id") ?? "");
  if (!user) redirect(`/login?next=/item/${itemId}`);
  const body = String(form.get("body") ?? "").trim();
  if (!body) return { error: "Escribe un comentario." };
  if (body.length > 1000) return { error: "El comentario es demasiado largo (máx. 1000 caracteres)." };
  const item = get<Item>("SELECT * FROM items WHERE id = ?", [itemId]);
  if (!item) return { error: "El artículo ya no está disponible." };
  run("INSERT INTO comments (id, item_id, user_id, body, created_at) VALUES (?,?,?,?,?)",
    [newId("cm_"), itemId, user.id, body, nowIso()]);
  const image = get<{ url: string }>("SELECT url FROM item_images WHERE item_id = ? ORDER BY position LIMIT 1", [itemId])?.url ?? "";
  const others = all<{ user_id: string }>(
    "SELECT DISTINCT user_id FROM comments WHERE item_id = ? AND user_id != ?", [itemId, user.id]);
  const targets = new Set(others.map((o) => o.user_id));
  if (item.seller_id !== user.id) targets.add(item.seller_id);
  for (const t of targets) {
    notify({ userId: t, kind: "comment", title: `${user.name} ha comentado`, body, link: `/item/${itemId}`, image });
  }
  revalidatePath(`/item/${itemId}`);
  return { ok: "Comentario publicado." };
}

export async function deleteCommentAction(formData: FormData) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const id = String(formData.get("id") ?? "");
  const comment = get<{ user_id: string; item_id: string }>("SELECT * FROM comments WHERE id = ?", [id]);
  if (!comment) return;
  const item = get<Item>("SELECT * FROM items WHERE id = ?", [comment.item_id]);
  if (comment.user_id !== user.id && item?.seller_id !== user.id) return;
  run("DELETE FROM comments WHERE id = ?", [id]);
  revalidatePath(`/item/${comment.item_id}`);
}

export async function makeOfferAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await currentUser();
  const itemId = String(form.get("item_id") ?? "");
  if (!user) redirect(`/login?next=/item/${itemId}`);
  const price = Math.round(Number(form.get("price")));
  const item = get<Item>("SELECT * FROM items WHERE id = ?", [itemId]);
  if (!item || item.status !== "on_sale") return { error: "El artículo ya no está a la venta." };
  if (item.seller_id === user.id) return { error: "No puedes hacer una oferta por tu propio artículo." };
  if (!item.offers_enabled) return { error: "Quien vende no acepta ofertas en este artículo." };
  if (!Number.isFinite(price) || price < MIN_PRICE) return { error: "Introduce un monto válido." };
  if (price >= item.price) return { error: "La oferta debe ser inferior al precio publicado." };
  if (price < Math.round(item.price * 0.5)) return { error: "La oferta no puede ser inferior al 50 % del precio." };
  run("INSERT INTO offers (id, item_id, user_id, price, status, created_at) VALUES (?,?,?,?,'pending',?)",
    [newId("of_"), itemId, user.id, price, nowIso()]);
  const image = get<{ url: string }>("SELECT url FROM item_images WHERE item_id = ? ORDER BY position LIMIT 1", [itemId])?.url ?? "";
  notify({ userId: item.seller_id, kind: "offer", title: `${user.name} te hizo una oferta de $${price}`, body: item.title, link: `/item/${itemId}`, image });
  revalidatePath(`/item/${itemId}`);
  return { ok: "Oferta enviada. Quien vende decidirá si la acepta." };
}

export async function respondOfferAction(formData: FormData) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const offer = get<{ id: string; item_id: string; user_id: string; price: number }>(
    "SELECT * FROM offers WHERE id = ?", [id]);
  if (!offer) return;
  const item = get<Item>("SELECT * FROM items WHERE id = ?", [offer.item_id]);
  if (!item || item.seller_id !== user.id) return;
  const image = get<{ url: string }>("SELECT url FROM item_images WHERE item_id = ? ORDER BY position LIMIT 1", [item.id])?.url ?? "";
  if (decision === "accept") {
    run("UPDATE offers SET status = 'accepted' WHERE id = ?", [id]);
    run("UPDATE offers SET status = 'rejected' WHERE item_id = ? AND id != ? AND status = 'pending'", [item.id, id]);
    run("UPDATE items SET price = ?, updated_at = ? WHERE id = ?", [offer.price, nowIso(), item.id]);
    notify({ userId: offer.user_id, kind: "offer", title: "¡Han aceptado tu oferta!", body: `${item.title} por $${offer.price}. Complétala antes de que alguien más lo compre.`, link: `/item/${item.id}`, image });
  } else {
    run("UPDATE offers SET status = 'rejected' WHERE id = ?", [id]);
    notify({ userId: offer.user_id, kind: "offer", title: "Tu oferta no ha sido aceptada", body: item.title, link: `/item/${item.id}`, image });
  }
  revalidatePath(`/item/${item.id}`);
}

/* =================================== seguir ==================================== */

export async function toggleFollowAction(formData: FormData) {
  const user = await currentUser();
  const targetId = String(formData.get("user_id") ?? "");
  const handle = String(formData.get("handle") ?? "");
  if (!user) redirect(`/login?next=/user/${handle}`);
  if (targetId === user.id) return;
  const following = get("SELECT 1 AS x FROM follows WHERE follower_id = ? AND followee_id = ?", [user.id, targetId]);
  if (following) {
    run("DELETE FROM follows WHERE follower_id = ? AND followee_id = ?", [user.id, targetId]);
  } else {
    run("INSERT INTO follows (follower_id, followee_id, created_at) VALUES (?,?,?)", [user.id, targetId, nowIso()]);
    notify({ userId: targetId, kind: "follow", title: `${user.name} ha empezado a seguirte`, link: `/user/${user.handle}` });
  }
  revalidatePath(`/user/${handle}`);
  revalidatePath("/mypage/follows");
}

/* ================================== compra ==================================== */

export async function purchaseAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await currentUser();
  const itemId = String(form.get("item_id") ?? "");
  if (!user) redirect(`/login?next=/checkout/${itemId}`);

  const item = get<Item>("SELECT * FROM items WHERE id = ?", [itemId]);
  if (!item) return { error: "El artículo ya no existe." };
  if (item.status !== "on_sale") return { error: "Este artículo ya no está disponible." };
  if (item.seller_id === user.id) return { error: "No puedes comprar tu propio artículo." };

  const shop = item.shop_id ? get<Shop>("SELECT * FROM shops WHERE id = ?", [item.shop_id]) : undefined;
  if (item.shop_id && shop?.status !== "active")
    return { error: "La tienda no está disponible en este momento." };

  // Variante y cantidad (solo aplican a los artículos de Mercado Shops)
  const variantId = Number(form.get("variant_id")) || 0;
  const variants = all<{ id: number; label: string; stock: number }>(
    "SELECT id, label, stock FROM item_variants WHERE item_id = ?", [itemId]);
  let variant: { id: number; label: string; stock: number } | undefined;
  if (variants.length) {
    variant = variants.find((v) => v.id === variantId);
    if (!variant) return { error: "Elige una variante disponible." };
    if (variant.stock <= 0) return { error: "Esa variante está agotada." };
  }

  const maxStock = variant ? variant.stock : item.shop_id ? item.stock : 1;
  const quantity = item.shop_id ? Math.max(1, Math.round(Number(form.get("quantity")) || 1)) : 1;
  if (quantity > maxStock)
    return { error: `Solo quedan ${maxStock} piezas disponibles.` };

  const fresh = get<User>("SELECT * FROM users WHERE id = ?", [user.id])!;
  const shipName = String(form.get("ship_name") ?? fresh.addr_name).trim();
  const shipZip = String(form.get("ship_zip") ?? fresh.addr_zip).trim();
  const shipRegion = String(form.get("ship_region") ?? fresh.addr_region).trim();
  const shipCity = String(form.get("ship_city") ?? fresh.addr_city).trim();
  const shipLine = String(form.get("ship_line") ?? fresh.addr_line).trim();
  const shipPhone = String(form.get("ship_phone") ?? fresh.addr_phone).trim();
  if (!shipName || !shipZip || !shipRegion || !shipCity || !shipLine)
    return { error: "Completa la dirección de envío." };

  const paymentMethod = String(form.get("payment_method") ?? "card");
  const shippingCost = item.shipping_payer === "buyer" ? shippingCostOf(item.shipping_method) : 0;
  const cashFee = paymentMethod === "cash" ? CASH_FEE : 0;
  const subtotal = item.price * quantity;
  const pointsRequested = Math.max(0, Math.round(Number(form.get("points_used")) || 0));
  const couponId = String(form.get("coupon_id") ?? "");

  let couponAmount = 0;
  let coupon: { id: string; amount: number; min_price: number } | undefined;
  if (couponId) {
    coupon = get("SELECT id, amount, min_price FROM coupons WHERE id = ? AND user_id = ? AND used_at IS NULL AND expires_at > ?",
      [couponId, user.id, nowIso()]);
    if (!coupon) return { error: "El cupón seleccionado ya no es válido." };
    if (subtotal < coupon.min_price) return { error: "El cupón no aplica para este monto." };
    couponAmount = coupon.amount;
  }

  const gross = subtotal + shippingCost + cashFee;
  const pointsUsed = Math.min(pointsRequested, fresh.points, Math.max(0, gross - couponAmount));
  const charged = Math.max(0, gross - couponAmount - pointsUsed);

  if (paymentMethod === "balance" && fresh.balance < charged)
    return { error: "No tienes saldo suficiente para completar la compra." };
  if ((paymentMethod === "card" || paymentMethod === "msi") &&
      !get("SELECT 1 AS x FROM cards WHERE user_id = ?", [user.id]))
    return { error: "Primero agrega una tarjeta en «Métodos de pago»." };
  if (paymentMethod === "msi" && charged < MSI_MIN)
    return { error: `Los meses sin intereses aplican en compras desde $${MSI_MIN}.` };

  const fee = Math.round(subtotal * FEE_RATE);
  const sellerShipping = item.shipping_payer === "seller" ? shippingCostOf(item.shipping_method) : 0;
  const payout = Math.max(0, subtotal - fee - sellerShipping);
  const orderId = newId("o_");
  const remaining = maxStock - quantity;

  tx(() => {
    run(
      `INSERT INTO orders (id, item_id, buyer_id, seller_id, price, quantity, shop_id, variant_label,
        points_used, coupon_id, coupon_amount, charged, fee, shipping_cost, payout, payment_method,
        status, ship_name, ship_zip, ship_region, ship_city, ship_line, ship_phone, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'paid',?,?,?,?,?,?,?)`,
      [orderId, item.id, user.id, item.seller_id, item.price, quantity, item.shop_id ?? null,
       variant?.label ?? "", pointsUsed, coupon?.id ?? null, couponAmount, charged, fee,
       shippingCost + cashFee, payout, paymentMethod, shipName, shipZip, shipRegion, shipCity,
       shipLine, shipPhone, nowIso()],
    );

    if (variant) {
      run("UPDATE item_variants SET stock = stock - ? WHERE id = ?", [quantity, variant.id]);
    }
    if (item.shop_id) {
      run("UPDATE items SET stock = MAX(stock - ?, 0), updated_at = ? WHERE id = ?",
        [quantity, nowIso(), item.id]);
      const stockLeft = variants.length
        ? (get<{ n: number }>("SELECT COALESCE(SUM(stock), 0) AS n FROM item_variants WHERE item_id = ?", [item.id])?.n ?? 0)
        : remaining;
      if (stockLeft <= 0) {
        run("UPDATE items SET status = 'trading', stock = 0, updated_at = ? WHERE id = ?", [nowIso(), item.id]);
      }
    } else {
      run("UPDATE items SET status = 'trading', updated_at = ? WHERE id = ?", [nowIso(), item.id]);
    }

    if (pointsUsed > 0) {
      run("UPDATE users SET points = points - ? WHERE id = ?", [pointsUsed, user.id]);
      ledgerEntry(user.id, "points", -pointsUsed, `Puntos usados en «${item.title}»`);
    }
    if (coupon) run("UPDATE coupons SET used_at = ? WHERE id = ?", [nowIso(), coupon.id]);
    if (paymentMethod === "balance" && charged > 0) {
      run("UPDATE users SET balance = balance - ? WHERE id = ?", [charged, user.id]);
      ledgerEntry(user.id, "balance", -charged, `Compra de «${item.title}»`);
    }
    run("UPDATE offers SET status = 'closed' WHERE item_id = ? AND status = 'pending'", [item.id]);
  });

  const image = get<{ url: string }>("SELECT url FROM item_images WHERE item_id = ? ORDER BY position LIMIT 1", [item.id])?.url ?? "";
  notify({
    userId: item.seller_id,
    kind: "order",
    title: shop ? "¡Nueva venta en tu tienda!" : "¡Vendiste un artículo!",
    body: `${item.title}${quantity > 1 ? ` × ${quantity}` : ""} · Prepara el envío`,
    link: `/transaction/${orderId}`,
    image,
  });
  notify({ userId: user.id, kind: "order", title: "Compra confirmada", body: `${item.title} · Ya puedes escribirle a quien vende`, link: `/transaction/${orderId}`, image });
  run("INSERT INTO messages (id, order_id, user_id, body, created_at) VALUES (?,?,?,?,?)",
    [newId("ms_"), orderId, user.id, "¡Hola! Acabo de realizar la compra. Quedo al pendiente del envío.", nowIso()]);

  issueBundleCoupons(item.id, user.id);

  revalidatePath("/");
  redirect(`/transaction/${orderId}?new=1`);
}

/**
 * Venta cruzada: si el artículo forma parte de un paquete con otras tiendas,
 * quien compra recibe un cupón para gastar en los negocios aliados.
 */
function issueBundleCoupons(itemId: string, buyerId: string) {
  const bundles = all<{ id: string; title: string; discount: number; min_price: number }>(
    `SELECT b.id, b.title, b.discount, b.min_price FROM bundle_items bi
     JOIN bundles b ON b.id = bi.bundle_id
     WHERE bi.item_id = ? AND b.status = 'active'`,
    [itemId],
  );
  for (const bundle of bundles) {
    const partners = all<{ name: string }>(
      `SELECT DISTINCT s.name FROM bundle_items bi JOIN shops s ON s.id = bi.shop_id
       WHERE bi.bundle_id = ? AND bi.item_id != ?`,
      [bundle.id, itemId],
    );
    if (!partners.length) continue;
    const names = partners.map((p) => p.name).join(", ");
    run(
      `INSERT INTO coupons (id, user_id, title, code, amount, min_price, expires_at)
       VALUES (?,?,?,?,?,?,?)`,
      [newId("c_"), buyerId, `Paquete «${bundle.title}»: $${bundle.discount} en ${names}`,
       `PAQUETE${bundle.discount}`, bundle.discount, bundle.min_price,
       new Date(Date.now() + 30 * 864e5).toISOString()],
    );
    notify({
      userId: buyerId, kind: "shop",
      title: `Ganaste un cupón de $${bundle.discount}`,
      body: `Úsalo en ${names} gracias al paquete «${bundle.title}».`,
      link: "/mypage/coupons",
    });
  }
}

/* =============================== transacción =================================== */

function loadOrder(id: string) {
  return get<{
    id: string; item_id: string; buyer_id: string; seller_id: string; status: string;
    payout: number; price: number; points_used: number; charged: number; payment_method: string;
    quantity: number; shop_id: string | null; variant_label: string;
  }>("SELECT * FROM orders WHERE id = ?", [id]);
}

export async function shipOrderAction(formData: FormData) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const id = String(formData.get("order_id") ?? "");
  const order = loadOrder(id);
  if (!order || order.seller_id !== user.id || order.status !== "paid") return;
  const tracking = String(formData.get("tracking") ?? "").trim() || `MD${Date.now().toString().slice(-10)}ES`;
  run("UPDATE orders SET status = 'shipped', shipped_at = ?, tracking = ? WHERE id = ?", [nowIso(), tracking, id]);
  const item = get<Item>("SELECT * FROM items WHERE id = ?", [order.item_id]);
  notify({ userId: order.buyer_id, kind: "order", title: "Tu pedido está en camino", body: `${item?.title ?? ""} · Seguimiento ${tracking}`, link: `/transaction/${id}` });
  run("INSERT INTO messages (id, order_id, user_id, body, created_at) VALUES (?,?,?,?,?)",
    [newId("ms_"), id, user.id, `He enviado el paquete. Número de seguimiento: ${tracking}`, nowIso()]);
  revalidatePath(`/transaction/${id}`);
}

export async function confirmReceiptAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await currentUser();
  if (!user) redirect("/login");
  const id = String(form.get("order_id") ?? "");
  const order = loadOrder(id);
  if (!order || order.buyer_id !== user.id) return { error: "No puedes calificar esta transacción." };
  if (order.status !== "shipped") return { error: "Todavía no se ha registrado el envío." };
  const score = String(form.get("score") ?? "");
  if (!["good", "normal", "bad"].includes(score)) return { error: "Selecciona una calificación." };
  const body = String(form.get("body") ?? "").trim();
  run("UPDATE orders SET status = 'received', received_at = ? WHERE id = ?", [nowIso(), id]);
  run("INSERT INTO reviews (id, order_id, rater_id, ratee_id, score, body, created_at) VALUES (?,?,?,?,?,?,?)",
    [newId("rv_"), id, user.id, order.seller_id, score, body, nowIso()]);
  notify({ userId: order.seller_id, kind: "review", title: "Han confirmado la recepción", body: "Califica a quien te ha comprado para cerrar la transacción.", link: `/transaction/${id}` });
  revalidatePath(`/transaction/${id}`);
  return { ok: "¡Gracias! Has confirmado la recepción." };
}

export async function rateBuyerAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await currentUser();
  if (!user) redirect("/login");
  const id = String(form.get("order_id") ?? "");
  const order = loadOrder(id);
  if (!order || order.seller_id !== user.id) return { error: "No puedes calificar esta transacción." };
  if (order.status !== "received") return { error: "Aún falta que confirmen la recepción." };
  const score = String(form.get("score") ?? "");
  if (!["good", "normal", "bad"].includes(score)) return { error: "Selecciona una calificación." };
  const body = String(form.get("body") ?? "").trim();
  const item = get<Item>("SELECT * FROM items WHERE id = ?", [order.item_id]);

  tx(() => {
    run("INSERT INTO reviews (id, order_id, rater_id, ratee_id, score, body, created_at) VALUES (?,?,?,?,?,?,?)",
      [newId("rv_"), id, user.id, order.buyer_id, score, body, nowIso()]);
    run("UPDATE orders SET status = 'done', completed_at = ? WHERE id = ?", [nowIso(), id]);
    const current = get<Item>("SELECT * FROM items WHERE id = ?", [order.item_id]);
    if (current && current.shop_id && current.stock > 0) {
      run("UPDATE items SET status = 'on_sale', updated_at = ? WHERE id = ?", [nowIso(), order.item_id]);
    } else if (current && current.status !== "sold") {
      run("UPDATE items SET status = 'sold', updated_at = ? WHERE id = ?", [nowIso(), order.item_id]);
    }
    const advance = order.shop_id
      ? get<{ id: string; outstanding: number; status: string }>(
          `SELECT id, outstanding, status FROM advances WHERE shop_id = ?
             AND status IN ('active','overdue') ORDER BY created_at LIMIT 1`,
          [order.shop_id],
        )
      : undefined;
    const repayment = advance ? Math.min(advance.outstanding, order.payout) : 0;
    const credited = order.payout - repayment;

    if (credited > 0) {
      run("UPDATE users SET balance = balance + ? WHERE id = ?", [credited, user.id]);
      ledgerEntry(user.id, "balance", credited, `Venta de «${item?.title ?? ""}»`);
    }
    if (advance && repayment > 0) {
      const outstanding = advance.outstanding - repayment;
      run("UPDATE advances SET outstanding = ?, status = ?, closed_at = ? WHERE id = ?", [
        outstanding,
        // un adelanto vencido sigue vencido mientras quede saldo por amortizar
        outstanding <= 0 ? "repaid" : advance.status,
        outstanding <= 0 ? nowIso() : null,
        advance.id,
      ]);
      ledgerEntry(user.id, "balance", 0,
        `Amortización del adelanto: −$${repayment} de la venta de «${item?.title ?? ""}»`);
    }
  });

  notify({ userId: order.buyer_id, kind: "review", title: "Transacción finalizada", body: "Ya puedes ver la calificación que has recibido.", link: `/transaction/${id}` });
  revalidatePath(`/transaction/${id}`);
  revalidatePath("/mypage/balance");
  return { ok: "Transacción finalizada. El monto se ha agregado a tu saldo." };
}

export async function cancelOrderAction(formData: FormData) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const id = String(formData.get("order_id") ?? "");
  const order = loadOrder(id);
  if (!order) return;
  if (order.buyer_id !== user.id && order.seller_id !== user.id) return;
  if (order.status !== "paid") return;
  const item = get<Item>("SELECT * FROM items WHERE id = ?", [order.item_id]);

  tx(() => {
    run("UPDATE orders SET status = 'cancelled', completed_at = ? WHERE id = ?", [nowIso(), id]);
    if (order.shop_id) {
      // En Mercado Shops se devuelve el inventario reservado.
      run("UPDATE items SET status = 'on_sale', stock = stock + ?, updated_at = ? WHERE id = ?",
        [order.quantity, nowIso(), order.item_id]);
      if (order.variant_label) {
        run("UPDATE item_variants SET stock = stock + ? WHERE item_id = ? AND label = ?",
          [order.quantity, order.item_id, order.variant_label]);
      }
    } else {
      run("UPDATE items SET status = 'on_sale', updated_at = ? WHERE id = ?", [nowIso(), order.item_id]);
    }
    if (order.points_used > 0) {
      run("UPDATE users SET points = points + ? WHERE id = ?", [order.points_used, order.buyer_id]);
      ledgerEntry(order.buyer_id, "points", order.points_used, "Devolución de puntos por cancelación");
    }
    if (order.payment_method === "balance" && order.charged > 0) {
      run("UPDATE users SET balance = balance + ? WHERE id = ?", [order.charged, order.buyer_id]);
      ledgerEntry(order.buyer_id, "balance", order.charged, "Reembolso por cancelación");
    }
  });

  const other = user.id === order.buyer_id ? order.seller_id : order.buyer_id;
  notify({ userId: other, kind: "order", title: "Transacción cancelada", body: item?.title ?? "", link: `/transaction/${id}` });
  revalidatePath(`/transaction/${id}`);
}

export async function sendMessageAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await currentUser();
  if (!user) redirect("/login");
  const id = String(form.get("order_id") ?? "");
  const body = String(form.get("body") ?? "").trim();
  if (!body) return { error: "Escribe un mensaje." };
  const order = loadOrder(id);
  if (!order || (order.buyer_id !== user.id && order.seller_id !== user.id))
    return { error: "No tienes acceso a esta conversación." };
  run("INSERT INTO messages (id, order_id, user_id, body, created_at) VALUES (?,?,?,?,?)",
    [newId("ms_"), id, user.id, body, nowIso()]);
  const other = user.id === order.buyer_id ? order.seller_id : order.buyer_id;
  notify({ userId: other, kind: "message", title: `Mensaje de ${user.name}`, body, link: `/transaction/${id}` });
  revalidatePath(`/transaction/${id}`);
  return { ok: "" };
}

/* ============================== notificaciones ================================= */

export async function markAllReadAction() {
  const user = await currentUser();
  if (!user) redirect("/login");
  run("UPDATE notifications SET is_read = 1 WHERE user_id = ?", [user.id]);
  revalidatePath("/notifications");
}

export async function markReadAction(formData: FormData) {
  const user = await currentUser();
  if (!user) return;
  run("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?", [String(formData.get("id")), user.id]);
  revalidatePath("/notifications");
}

/* ============================ búsquedas guardadas ============================== */

export async function saveSearchAction(formData: FormData) {
  const user = await currentUser();
  const query = String(formData.get("query") ?? "");
  if (!user) redirect(`/login?next=/search${query}`);
  const label = String(formData.get("label") ?? "").trim() || "Búsqueda guardada";
  run("INSERT INTO saved_searches (id, user_id, label, query, notify, created_at) VALUES (?,?,?,?,1,?)",
    [newId("ss_"), user.id, label, query, nowIso()]);
  revalidatePath("/mypage/searches");
}

export async function deleteSavedSearchAction(formData: FormData) {
  const user = await currentUser();
  if (!user) redirect("/login");
  run("DELETE FROM saved_searches WHERE id = ? AND user_id = ?", [String(formData.get("id")), user.id]);
  revalidatePath("/mypage/searches");
}

export async function toggleSearchNotifyAction(formData: FormData) {
  const user = await currentUser();
  if (!user) redirect("/login");
  run("UPDATE saved_searches SET notify = 1 - notify WHERE id = ? AND user_id = ?",
    [String(formData.get("id")), user.id]);
  revalidatePath("/mypage/searches");
}

/* ================================== ajustes ==================================== */

export async function updateProfileAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await currentUser();
  if (!user) redirect("/login?next=/mypage/profile");
  const name = String(form.get("name") ?? "").trim();
  const handle = String(form.get("handle") ?? "").trim().toLowerCase();
  const bio = String(form.get("bio") ?? "").trim();
  if (name.length < 2) return { error: "El nombre debe tener al menos 2 caracteres." };
  if (!/^[a-z0-9_]{3,20}$/.test(handle))
    return { error: "El nombre de usuario debe tener entre 3 y 20 caracteres (letras, números y _)." };
  const taken = get<{ id: string }>("SELECT id FROM users WHERE handle = ? AND id != ?", [handle, user.id]);
  if (taken) return { error: "Ese nombre de usuario ya está en uso." };
  const avatar = String(form.get("avatar_seed") ?? user.avatar_seed);
  run("UPDATE users SET name = ?, handle = ?, bio = ?, avatar_seed = ? WHERE id = ?",
    [name, handle, bio, avatar, user.id]);
  revalidatePath("/mypage");
  return { ok: "Perfil actualizado." };
}

export async function updateAddressAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await currentUser();
  if (!user) redirect("/login?next=/mypage/address");
  const fields = {
    addr_name: String(form.get("addr_name") ?? "").trim(),
    addr_zip: String(form.get("addr_zip") ?? "").trim(),
    addr_region: String(form.get("addr_region") ?? "").trim(),
    addr_city: String(form.get("addr_city") ?? "").trim(),
    addr_line: String(form.get("addr_line") ?? "").trim(),
    addr_phone: String(form.get("addr_phone") ?? "").trim(),
  };
  if (!fields.addr_name || !fields.addr_zip || !fields.addr_city || !fields.addr_line)
    return { error: "Completa todos los campos obligatorios." };
  if (!/^\d{5}$/.test(fields.addr_zip)) return { error: "El código postal debe tener 5 dígitos." };
  run(
    `UPDATE users SET addr_name=?, addr_zip=?, addr_region=?, addr_city=?, addr_line=?, addr_phone=?
     WHERE id = ?`,
    [fields.addr_name, fields.addr_zip, fields.addr_region, fields.addr_city, fields.addr_line,
     fields.addr_phone, user.id],
  );
  revalidatePath("/mypage/address");
  return { ok: "Dirección guardada." };
}

export async function updateNotificationSettingsAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await currentUser();
  if (!user) redirect("/login?next=/mypage/settings");
  run(
    `UPDATE users SET notify_like=?, notify_comment=?, notify_order=?, notify_message=?, notify_news=?
     WHERE id = ?`,
    [form.get("notify_like") ? 1 : 0, form.get("notify_comment") ? 1 : 0, form.get("notify_order") ? 1 : 0,
     form.get("notify_message") ? 1 : 0, form.get("notify_news") ? 1 : 0, user.id],
  );
  revalidatePath("/mypage/settings");
  return { ok: "Preferencias de notificación guardadas." };
}

export async function changePasswordAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await currentUser();
  if (!user) redirect("/login?next=/mypage/settings");
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  if (!verifyPassword(current, user.password_hash)) return { error: "La contraseña actual no es correcta." };
  if (next.length < 8) return { error: "La nueva contraseña debe tener al menos 8 caracteres." };
  run("UPDATE users SET password_hash = ? WHERE id = ?", [hashPassword(next), user.id]);
  return { ok: "Contraseña actualizada." };
}

export async function verifyIdentityAction() {
  const user = await currentUser();
  if (!user) redirect("/login");
  run("UPDATE users SET is_verified = 1 WHERE id = ?", [user.id]);
  notify({ userId: user.id, kind: "news", title: "Identidad verificada", body: "Ya puedes solicitar transferencias de tu saldo.", link: "/mypage/balance" });
  revalidatePath("/mypage/identity");
}

export async function addCardAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await currentUser();
  if (!user) redirect("/login?next=/mypage/payment");
  const number = String(form.get("number") ?? "").replace(/\s+/g, "");
  const exp = String(form.get("exp") ?? "").trim();
  const holder = String(form.get("holder") ?? "").trim();
  const cvv = String(form.get("cvv") ?? "").trim();
  if (!/^\d{13,19}$/.test(number)) return { error: "El número de tarjeta no es válido." };
  if (!/^\d{2}\/\d{2}$/.test(exp)) return { error: "La caducidad debe tener el formato MM/AA." };
  if (!/^\d{3,4}$/.test(cvv)) return { error: "El CVV no es válido." };
  if (!holder) return { error: "Indica el titular de la tarjeta." };
  const brand = number.startsWith("4") ? "Visa" : number.startsWith("5") ? "Mastercard" : number.startsWith("3") ? "Amex" : "Tarjeta";
  const first = !get("SELECT 1 AS x FROM cards WHERE user_id = ?", [user.id]);
  run("INSERT INTO cards (id, user_id, brand, last4, exp, holder, is_default, created_at) VALUES (?,?,?,?,?,?,?,?)",
    [newId("cd_"), user.id, brand, number.slice(-4), exp, holder, first ? 1 : 0, nowIso()]);
  revalidatePath("/mypage/payment");
  return { ok: "Tarjeta añadida." };
}

export async function deleteCardAction(formData: FormData) {
  const user = await currentUser();
  if (!user) redirect("/login");
  run("DELETE FROM cards WHERE id = ? AND user_id = ?", [String(formData.get("id")), user.id]);
  revalidatePath("/mypage/payment");
}

export async function setDefaultCardAction(formData: FormData) {
  const user = await currentUser();
  if (!user) redirect("/login");
  run("UPDATE cards SET is_default = 0 WHERE user_id = ?", [user.id]);
  run("UPDATE cards SET is_default = 1 WHERE id = ? AND user_id = ?", [String(formData.get("id")), user.id]);
  revalidatePath("/mypage/payment");
}

export async function requestPayoutAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await currentUser();
  if (!user) redirect("/login?next=/mypage/balance");
  const fresh = get<User>("SELECT * FROM users WHERE id = ?", [user.id])!;
  if (!fresh.is_verified) return { error: "Verifica tu identidad antes de solicitar una transferencia." };
  const amount = Math.round(Number(form.get("amount")));
  const iban = String(form.get("iban") ?? "").replace(/\s+/g, "").toUpperCase();
  const holder = String(form.get("holder") ?? "").trim();
  if (!Number.isFinite(amount) || amount < MIN_PAYOUT)
    return { error: `El monto mínimo para transferir es de $${MIN_PAYOUT}.` };
  if (amount + PAYOUT_FEE > fresh.balance) return { error: "Saldo insuficiente (recuerda la comisión de transferencia)." };
  if (!/^\d{18}$/.test(iban)) return { error: "Escribe una CLABE interbancaria válida (18 dígitos)." };
  if (!holder) return { error: "Indica el titular de la cuenta." };
  tx(() => {
    run("INSERT INTO payouts (id, user_id, amount, fee, iban, holder, status, created_at) VALUES (?,?,?,?,?,?,'pending',?)",
      [newId("p_"), user.id, amount, PAYOUT_FEE, iban, holder, nowIso()]);
    run("UPDATE users SET balance = balance - ? WHERE id = ?", [amount + PAYOUT_FEE, user.id]);
    ledgerEntry(user.id, "balance", -(amount + PAYOUT_FEE), `Transferencia a CLABE ${iban.slice(0, 6)}···`);
  });
  notify({ userId: user.id, kind: "news", title: "Transferencia solicitada", body: `Recibirás $${amount} en 2 a 4 días hábiles.`, link: "/mypage/balance" });
  revalidatePath("/mypage/balance");
  return { ok: "Solicitud de transferencia registrada." };
}

export async function buyPointsAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await currentUser();
  if (!user) redirect("/login?next=/mypage/points");
  const amount = Math.round(Number(form.get("amount")));
  if (![100, 200, 500, 1000, 2000].includes(amount)) return { error: "Selecciona un monto válido." };
  run("UPDATE users SET points = points + ? WHERE id = ?", [amount, user.id]);
  ledgerEntry(user.id, "points", amount, "Compra de puntos con tarjeta");
  revalidatePath("/mypage/points");
  return { ok: `Has agregado ${amount} puntos.` };
}

export async function convertBalanceToPointsAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await currentUser();
  if (!user) redirect("/login?next=/mypage/points");
  const amount = Math.round(Number(form.get("amount")));
  const fresh = get<User>("SELECT * FROM users WHERE id = ?", [user.id])!;
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Introduce un monto válido." };
  if (amount > fresh.balance) return { error: "No tienes saldo suficiente." };
  tx(() => {
    run("UPDATE users SET balance = balance - ?, points = points + ? WHERE id = ?", [amount, amount, user.id]);
    ledgerEntry(user.id, "balance", -amount, "Conversión de saldo a puntos");
    ledgerEntry(user.id, "points", amount, "Conversión de saldo a puntos");
  });
  revalidatePath("/mypage/points");
  return { ok: `Convertiste $${amount} de saldo en puntos.` };
}

export async function reportAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await currentUser();
  if (!user) redirect("/login");
  const target = String(form.get("target") ?? "item");
  const targetId = String(form.get("target_id") ?? "");
  const reason = String(form.get("reason") ?? "").trim();
  if (!reason) return { error: "Selecciona un motivo." };
  run("INSERT INTO reports (id, user_id, target, target_id, reason, body, created_at) VALUES (?,?,?,?,?,?,?)",
    [newId("rp_"), user.id, target, targetId, reason, String(form.get("body") ?? "").trim(), nowIso()]);
  return { ok: "Gracias por avisarnos. Nuestro equipo lo revisará." };
}

/* ============================== Mercado Shops ================================= */

function slugifyShop(name: string) {
  const base = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 28) || "tienda";
  let slug = base;
  let i = 1;
  while (get("SELECT 1 AS x FROM shops WHERE slug = ?", [slug])) slug = `${base}-${++i}`;
  return slug;
}

export async function createShopAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await currentUser();
  if (!user) redirect("/login?next=/mypage/shop/new");
  if (get("SELECT 1 AS x FROM shops WHERE owner_id = ?", [user.id]))
    return { error: "Ya tienes una tienda registrada." };

  const name = String(form.get("name") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const category = String(form.get("category") ?? "").trim();
  const businessType = String(form.get("business_type") ?? "persona_fisica");
  const legalName = String(form.get("legal_name") ?? "").trim();
  const rfc = String(form.get("rfc") ?? "").trim().toUpperCase();
  const legalAddress = String(form.get("legal_address") ?? "").trim();
  const legalZip = String(form.get("legal_zip") ?? "").trim();
  const legalCity = String(form.get("legal_city") ?? "").trim();
  const legalRegion = String(form.get("legal_region") ?? "").trim();
  const addressPublic = form.get("address_public") ? 1 : 0;
  const legalPhone = String(form.get("legal_phone") ?? "").replace(/\s+/g, "");
  const legalEmail = String(form.get("legal_email") ?? "").trim().toLowerCase();
  const returnPolicy = String(form.get("return_policy") ?? "").trim();
  const deliveryNote = String(form.get("delivery_note") ?? "").trim();
  const shipFrom = String(form.get("ship_from") ?? "").trim();

  if (name.length < 3) return { error: "El nombre de la tienda debe tener al menos 3 caracteres." };
  if (!category) return { error: "Elige el giro de tu tienda." };
  if (!legalName) return { error: "Indica el nombre o razón social del titular." };
  if (!/^([A-ZÑ&]{3,4})\d{6}[A-Z0-9]{3}$/.test(rfc))
    return { error: "El RFC no tiene un formato válido (ej. XAXX010101000)." };
  if (!/^\d{10}$/.test(legalPhone)) return { error: "El teléfono debe tener 10 dígitos." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(legalEmail)) return { error: "El correo de contacto no es válido." };
  if (!legalAddress) return { error: "Indica la calle y número del domicilio fiscal." };
  if (!/^\d{5}$/.test(legalZip)) return { error: "El código postal debe tener 5 dígitos." };
  if (!legalCity || !legalRegion) return { error: "Indica el municipio o alcaldía y el estado." };

  const shopId = newId("sh_");
  run(
    `INSERT INTO shops (id, owner_id, name, slug, description, category, logo_seed, cover_emoji,
      business_type, legal_name, rfc, legal_address, legal_zip, legal_city, legal_region,
      address_public, legal_phone, legal_email, return_policy, delivery_note, ship_from,
      specialty, sourcing_needs, is_producer, status, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'pending',?)`,
    [shopId, user.id, name, slugifyShop(name), description, category,
     String(Math.floor(Math.random() * 12)), String(form.get("cover_emoji") ?? "🛍️"),
     businessType, legalName, rfc, legalAddress, legalZip, legalCity, legalRegion, addressPublic,
     legalPhone, legalEmail, returnPolicy,
     deliveryNote, shipFrom, String(form.get("specialty") ?? "").trim(),
     String(form.get("sourcing_needs") ?? "").trim(), form.get("is_producer") ? 1 : 0, nowIso()],
  );
  notify({
    userId: user.id, kind: "shop", title: "Recibimos tu solicitud de Mercado Shops",
    body: "Revisaremos tus datos fiscales. Te avisaremos en cuanto se active la tienda.",
    link: "/mypage/shop",
  });
  revalidatePath("/mypage/shop");
  redirect("/mypage/shop");
}

export async function updateShopAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await currentUser();
  if (!user) redirect("/login?next=/mypage/shop/settings");
  const shop = get<Shop>("SELECT * FROM shops WHERE owner_id = ?", [user.id]);
  if (!shop) return { error: "Todavía no tienes una tienda." };

  const name = String(form.get("name") ?? "").trim();
  const legalPhone = String(form.get("legal_phone") ?? "").replace(/\s+/g, "");
  const legalEmail = String(form.get("legal_email") ?? "").trim().toLowerCase();
  if (name.length < 3) return { error: "El nombre de la tienda debe tener al menos 3 caracteres." };
  if (!/^\d{10}$/.test(legalPhone)) return { error: "El teléfono debe tener 10 dígitos." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(legalEmail)) return { error: "El correo de contacto no es válido." };
  if (!/^\d{5}$/.test(String(form.get("legal_zip") ?? "").trim()))
    return { error: "El código postal debe tener 5 dígitos." };

  run(
    `UPDATE shops SET name=?, description=?, category=?, cover_emoji=?, logo_seed=?, business_type=?,
      legal_name=?, rfc=?, legal_address=?, legal_zip=?, legal_city=?, legal_region=?,
      address_public=?, legal_phone=?, legal_email=?, return_policy=?,
      delivery_note=?, ship_from=?, specialty=?, sourcing_needs=?, is_producer=? WHERE id = ?`,
    [name, String(form.get("description") ?? "").trim(), String(form.get("category") ?? ""),
     String(form.get("cover_emoji") ?? shop.cover_emoji), String(form.get("logo_seed") ?? shop.logo_seed),
     String(form.get("business_type") ?? shop.business_type), String(form.get("legal_name") ?? "").trim(),
     String(form.get("rfc") ?? "").trim().toUpperCase(), String(form.get("legal_address") ?? "").trim(),
     String(form.get("legal_zip") ?? "").trim(), String(form.get("legal_city") ?? "").trim(),
     String(form.get("legal_region") ?? "").trim(), form.get("address_public") ? 1 : 0,
     legalPhone, legalEmail, String(form.get("return_policy") ?? "").trim(),
     String(form.get("delivery_note") ?? "").trim(), String(form.get("ship_from") ?? "").trim(),
     String(form.get("specialty") ?? "").trim(), String(form.get("sourcing_needs") ?? "").trim(),
     form.get("is_producer") ? 1 : 0, shop.id],
  );
  revalidatePath("/mypage/shop/settings");
  revalidatePath(`/shop/${shop.slug}`);
  return { ok: "Datos de la tienda actualizados." };
}

/** Simula la revisión del equipo de Mercado Shops (proyecto de demostración). */
export async function reviewShopAction() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const shop = get<Shop>("SELECT * FROM shops WHERE owner_id = ?", [user.id]);
  if (!shop || shop.status === "active") return;
  run("UPDATE shops SET status = 'active' WHERE id = ?", [shop.id]);
  notify({
    userId: user.id, kind: "shop", title: "¡Tu tienda ya está activa!",
    body: "Ya puedes publicar productos con inventario en Mercado Shops.",
    link: `/shop/${shop.slug}`,
  });
  revalidatePath("/mypage/shop");
}

export async function toggleShopFollowAction(formData: FormData) {
  const user = await currentUser();
  const shopId = String(formData.get("shop_id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  if (!user) redirect(`/login?next=/shop/${slug}`);
  const following = get("SELECT 1 AS x FROM shop_follows WHERE user_id = ? AND shop_id = ?", [user.id, shopId]);
  if (following) {
    run("DELETE FROM shop_follows WHERE user_id = ? AND shop_id = ?", [user.id, shopId]);
  } else {
    run("INSERT INTO shop_follows (user_id, shop_id, created_at) VALUES (?,?,?)", [user.id, shopId, nowIso()]);
    const shop = get<Shop>("SELECT * FROM shops WHERE id = ?", [shopId]);
    if (shop) {
      notify({ userId: shop.owner_id, kind: "shop", title: `${user.name} sigue tu tienda`, link: `/shop/${shop.slug}` });
    }
  }
  revalidatePath(`/shop/${slug}`);
  revalidatePath("/mypage/shops");
}

export async function saveShopItemAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await currentUser();
  if (!user) redirect("/login?next=/mypage/shop/items/new");
  const shop = get<Shop>("SELECT * FROM shops WHERE owner_id = ?", [user.id]);
  if (!shop) return { error: "Primero abre tu tienda en Mercado Shops." };
  if (shop.status !== "active") return { error: "Tu tienda todavía está en revisión." };

  const id = String(form.get("id") ?? "").trim() || newId("m");
  const existing = get<Item>("SELECT * FROM items WHERE id = ?", [id]);
  if (existing && existing.seller_id !== user.id) return { error: "No puedes editar este producto." };

  const asDraft = String(form.get("intent") ?? "") === "draft";
  const title = String(form.get("title") ?? "").trim();
  const price = Math.round(num(form, "price"));
  const categoryId = Number(form.get("category_id")) || null;

  const variantLabels = form.getAll("variant_label").map((v) => String(v).trim());
  const variantStocks = form.getAll("variant_stock").map((v) => Math.max(0, Math.round(Number(v) || 0)));
  const variantSkus = form.getAll("variant_sku").map((v) => String(v).trim());
  const variants = variantLabels
    .map((label, i) => ({ label, stock: variantStocks[i] ?? 0, sku: variantSkus[i] ?? "" }))
    .filter((v) => v.label);

  const stockField = Math.max(0, Math.round(Number(form.get("stock")) || 0));
  const stock = variants.length ? variants.reduce((sum, v) => sum + v.stock, 0) : stockField;

  if (!asDraft) {
    if (title.length < 3) return { error: "El título debe tener al menos 3 caracteres." };
    if (!categoryId) return { error: "Selecciona una categoría." };
    if (price < MIN_PRICE || price > MAX_PRICE)
      return { error: `El precio debe estar entre $${MIN_PRICE} y $${MAX_PRICE}.` };
    if (stock < 1) return { error: "Indica el inventario disponible (al menos 1 pieza)." };
  }

  const values: Array<string | number | null> = [
    title,
    String(form.get("description") ?? "").trim(),
    price,
    categoryId,
    Number(form.get("brand_id")) || null,
    String(form.get("size") ?? ""),
    String(form.get("color") ?? ""),
    1, // los productos de tienda son nuevos salvo que se indique lo contrario
    String(form.get("shipping_payer") ?? "seller"),
    String(form.get("shipping_method") ?? "facil"),
    String(form.get("ship_from") ?? shop.ship_from),
    Number(form.get("ship_days")) || 1,
    stock,
  ];

  if (existing) {
    run(
      `UPDATE items SET title=?, description=?, price=?, category_id=?, brand_id=?, size=?, color=?,
        condition=?, shipping_payer=?, shipping_method=?, ship_from=?, ship_days=?, stock=?,
        status=?, offers_enabled=0, shop_id=?, updated_at=? WHERE id=?`,
      [...values, asDraft ? "draft" : stock > 0 ? "on_sale" : "stopped", shop.id, nowIso(), id],
    );
  } else {
    run(
      `INSERT INTO items (id, seller_id, title, description, price, category_id, brand_id, size, color,
        condition, shipping_payer, shipping_method, ship_from, ship_days, stock, status,
        offers_enabled, shop_id, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?,?)`,
      [id, user.id, ...values, asDraft ? "draft" : "on_sale", shop.id, nowIso(), nowIso()],
    );
  }

  for (const imgId of form.getAll("remove_image").map(String)) {
    run("DELETE FROM item_images WHERE id = ? AND item_id = ?", [Number(imgId), id]);
  }
  const maxPos = get<{ p: number | null }>("SELECT MAX(position) AS p FROM item_images WHERE item_id = ?", [id])?.p;
  await collectImages(form, id, (maxPos ?? -1) + 1);

  run("DELETE FROM item_variants WHERE item_id = ?", [id]);
  variants.forEach((variant, index) => {
    run("INSERT INTO item_variants (item_id, label, sku, stock, position) VALUES (?,?,?,?,?)",
      [id, variant.label, variant.sku, variant.stock, index]);
  });

  if (!asDraft) {
    const image = get<{ url: string }>("SELECT url FROM item_images WHERE item_id = ? ORDER BY position LIMIT 1", [id])?.url ?? "";
    const followers = all<{ user_id: string }>("SELECT user_id FROM shop_follows WHERE shop_id = ?", [shop.id]);
    for (const follower of followers) {
      notify({ userId: follower.user_id, kind: "shop", title: `${shop.name} publicó un producto nuevo`, body: title, link: `/item/${id}`, image });
    }
  }

  revalidatePath("/mypage/shop/items");
  revalidatePath(`/shop/${shop.slug}`);
  redirect(asDraft ? "/mypage/shop/items?tab=draft" : `/item/${id}?published=1`);
}

export async function updateStockAction(formData: FormData) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const id = String(formData.get("id") ?? "");
  const stock = Math.max(0, Math.round(Number(formData.get("stock")) || 0));
  const item = get<Item>("SELECT * FROM items WHERE id = ?", [id]);
  if (!item || item.seller_id !== user.id || !item.shop_id) return;
  const hasVariants = !!get("SELECT 1 AS x FROM item_variants WHERE item_id = ?", [id]);
  if (hasVariants) return;
  run("UPDATE items SET stock = ?, status = ?, updated_at = ? WHERE id = ?",
    [stock, stock > 0 ? "on_sale" : "stopped", nowIso(), id]);
  revalidatePath("/mypage/shop/items");
  revalidatePath(`/item/${id}`);
}

/* ======================= Red de negocios: mayoreo (B2B) ====================== */

async function myShop() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/mypage/shop");
  const shop = get<Shop>("SELECT * FROM shops WHERE owner_id = ?", [user.id]);
  return { user, shop };
}

export async function requestPartnerAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, shop } = await myShop();
  const supplierId = String(form.get("supplier_shop_id") ?? "");
  if (!shop) return { error: "Primero abre tu tienda para comprar en mayoreo." };
  if (shop.status !== "active") return { error: "Tu tienda todavía está en revisión." };
  const supplier = get<Shop>("SELECT * FROM shops WHERE id = ?", [supplierId]);
  if (!supplier) return { error: "La tienda proveedora ya no existe." };
  if (supplier.id === shop.id) return { error: "No puedes solicitarte mayoreo a ti misma." };
  const existing = get<{ status: string }>(
    "SELECT status FROM shop_partners WHERE buyer_shop_id = ? AND supplier_shop_id = ?",
    [shop.id, supplier.id],
  );
  if (existing?.status === "approved") return { ok: "Ya tienes esta relación aprobada." };
  if (existing?.status === "pending") return { ok: "Tu solicitud sigue en revisión." };

  const note = String(form.get("note") ?? "").trim();
  if (existing) {
    run("UPDATE shop_partners SET status = 'pending', note = ?, created_at = ?, decided_at = NULL WHERE buyer_shop_id = ? AND supplier_shop_id = ?",
      [note, nowIso(), shop.id, supplier.id]);
  } else {
    run(`INSERT INTO shop_partners (id, buyer_shop_id, supplier_shop_id, status, note, created_at)
         VALUES (?,?,?,'pending',?,?)`,
      [newId("pa_"), shop.id, supplier.id, note, nowIso()]);
  }
  notify({
    userId: supplier.owner_id, kind: "shop",
    title: `${shop.name} quiere comprarte en mayoreo`,
    body: note || "Revisa la solicitud en tu panel de proveedores.",
    link: "/mypage/shop/wholesale",
  });
  revalidatePath("/mayoreo");
  revalidatePath("/mypage/shop/partners");
  return { ok: "Solicitud enviada. Te avisaremos cuando la revisen." };
}

export async function decidePartnerAction(formData: FormData) {
  const { shop } = await myShop();
  if (!shop) return;
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const partner = get<{ id: string; buyer_shop_id: string; supplier_shop_id: string }>(
    "SELECT * FROM shop_partners WHERE id = ?", [id]);
  if (!partner || partner.supplier_shop_id !== shop.id) return;
  const status = decision === "approve" ? "approved" : "rejected";
  run("UPDATE shop_partners SET status = ?, decided_at = ? WHERE id = ?", [status, nowIso(), id]);
  const buyer = get<Shop>("SELECT * FROM shops WHERE id = ?", [partner.buyer_shop_id]);
  if (buyer) {
    notify({
      userId: buyer.owner_id, kind: "shop",
      title: status === "approved"
        ? `${shop.name} aprobó tu acceso a mayoreo`
        : `${shop.name} no aprobó tu solicitud de mayoreo`,
      body: status === "approved" ? "Ya puedes ver sus precios por volumen." : "",
      link: status === "approved" ? `/mayoreo/${shop.slug}` : "/mypage/shop/partners",
    });
  }
  revalidatePath("/mypage/shop/wholesale");
}

export async function saveB2bPricesAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, shop } = await myShop();
  if (!shop) return { error: "Primero abre tu tienda." };
  const itemId = String(form.get("item_id") ?? "");
  const item = get<Item>("SELECT * FROM items WHERE id = ?", [itemId]);
  if (!item || item.seller_id !== user.id || item.shop_id !== shop.id)
    return { error: "Ese producto no es de tu tienda." };

  const qtys = form.getAll("tier_qty").map((v) => Math.round(Number(v) || 0));
  const prices = form.getAll("tier_price").map((v) => Math.round(Number(v) || 0));
  const tiers = qtys
    .map((qty, i) => ({ qty, price: prices[i] ?? 0 }))
    .filter((t) => t.qty > 0 && t.price > 0)
    .sort((a, b) => a.qty - b.qty);

  for (const tier of tiers) {
    if (tier.price >= item.price)
      return { error: "El precio de mayoreo debe ser menor que el precio de menudeo." };
    if (tier.qty < B2B_MIN_QTY)
      return { error: `El volumen mínimo para mayoreo es de ${B2B_MIN_QTY} piezas.` };
  }

  run("DELETE FROM b2b_prices WHERE item_id = ?", [itemId]);
  for (const tier of tiers) {
    run("INSERT INTO b2b_prices (item_id, min_qty, price) VALUES (?,?,?)", [itemId, tier.qty, tier.price]);
  }
  revalidatePath("/mypage/shop/wholesale");
  revalidatePath(`/mayoreo/${shop.slug}`);
  return { ok: tiers.length ? "Precios de mayoreo guardados." : "Se quitó el mayoreo de este producto." };
}

export async function wholesalePurchaseAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, shop } = await myShop();
  if (!shop) return { error: "Necesitas una tienda para comprar en mayoreo." };
  const itemId = String(form.get("item_id") ?? "");
  const quantity = Math.max(1, Math.round(Number(form.get("quantity")) || 0));
  const item = get<Item>("SELECT * FROM items WHERE id = ?", [itemId]);
  if (!item || !item.shop_id) return { error: "El producto ya no está disponible." };
  if (item.status !== "on_sale") return { error: "El producto está agotado." };
  if (item.shop_id === shop.id) return { error: "No puedes comprarte a ti misma." };

  const supplier = get<Shop>("SELECT * FROM shops WHERE id = ?", [item.shop_id]);
  if (!supplier || supplier.status !== "active") return { error: "La tienda proveedora no está disponible." };
  const partner = get<{ status: string }>(
    "SELECT status FROM shop_partners WHERE buyer_shop_id = ? AND supplier_shop_id = ?",
    [shop.id, supplier.id],
  );
  if (partner?.status !== "approved") return { error: "Necesitas una relación de mayoreo aprobada." };

  const tier = get<{ price: number; min_qty: number }>(
    "SELECT price, min_qty FROM b2b_prices WHERE item_id = ? AND min_qty <= ? ORDER BY min_qty DESC LIMIT 1",
    [itemId, quantity],
  );
  if (!tier) {
    const min = get<{ n: number }>("SELECT MIN(min_qty) AS n FROM b2b_prices WHERE item_id = ?", [itemId])?.n;
    return { error: min ? `El pedido mínimo es de ${min} piezas.` : "Este producto no tiene precio de mayoreo." };
  }
  if (quantity > item.stock) return { error: `Solo hay ${item.stock} piezas disponibles.` };

  const fresh = get<User>("SELECT * FROM users WHERE id = ?", [user.id])!;
  const subtotal = tier.price * quantity;
  const paymentMethod = String(form.get("payment_method") ?? "balance");
  if (paymentMethod === "balance" && fresh.balance < subtotal)
    return { error: "No tienes saldo suficiente. Usa otro método de pago." };
  if (paymentMethod === "card" && !get("SELECT 1 AS x FROM cards WHERE user_id = ?", [user.id]))
    return { error: "Agrega una tarjeta en «Métodos de pago»." };

  const fee = Math.round(subtotal * B2B_FEE_RATE);
  const payout = Math.max(0, subtotal - fee);
  const orderId = newId("o_");

  tx(() => {
    run(
      `INSERT INTO orders (id, item_id, buyer_id, seller_id, price, quantity, shop_id, variant_label,
        is_wholesale, points_used, coupon_id, coupon_amount, charged, fee, shipping_cost, payout,
        payment_method, status, ship_name, ship_zip, ship_region, ship_city, ship_line, ship_phone,
        created_at)
       VALUES (?,?,?,?,?,?,?,'',1,0,NULL,0,?,?,0,?,?,'paid',?,?,?,?,?,?,?)`,
      [orderId, item.id, user.id, item.seller_id, tier.price, quantity, supplier.id,
       subtotal, fee, payout, paymentMethod, shop.legal_name || shop.name,
       fresh.addr_zip, shop.ship_from || fresh.addr_region, fresh.addr_city,
       shop.legal_address || fresh.addr_line, shop.legal_phone || fresh.addr_phone, nowIso()],
    );
    run("UPDATE items SET stock = MAX(stock - ?, 0), updated_at = ? WHERE id = ?", [quantity, nowIso(), item.id]);
    const left = get<{ stock: number }>("SELECT stock FROM items WHERE id = ?", [item.id])?.stock ?? 0;
    if (left <= 0) run("UPDATE items SET status = 'trading' WHERE id = ?", [item.id]);
    if (paymentMethod === "balance") {
      run("UPDATE users SET balance = balance - ? WHERE id = ?", [subtotal, user.id]);
      ledgerEntry(user.id, "balance", -subtotal, `Compra de mayoreo: ${item.title} × ${quantity}`);
    }
  });

  notify({
    userId: supplier.owner_id, kind: "order",
    title: `Pedido de mayoreo de ${shop.name}`,
    body: `${item.title} × ${quantity} piezas`,
    link: `/transaction/${orderId}`,
  });
  run("INSERT INTO messages (id, order_id, user_id, body, created_at) VALUES (?,?,?,?,?)",
    [newId("ms_"), orderId, user.id,
     `Pedido de mayoreo de ${shop.name}: ${quantity} piezas. ¿Nos confirmas el tiempo de entrega y si podemos recibir factura?`,
     nowIso()]);

  revalidatePath("/mypage/shop/purchases");
  redirect(`/transaction/${orderId}?new=1`);
}

/* ========================== Envíos consolidados ============================= */

export async function createShipmentAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { shop } = await myShop();
  if (!shop) return { error: "Primero abre tu tienda." };
  const orderIds = form.getAll("order_id").map(String).filter(Boolean);
  if (orderIds.length < 2) return { error: "Selecciona al menos 2 pedidos para consolidar." };

  const method = String(form.get("method") ?? "comodo");
  const pickupDate = String(form.get("pickup_date") ?? "").trim();
  const unitCost = CONSOLIDATED_UNIT_COST[method] ?? 65;
  const individual = shippingCostOf(method) || unitCost;

  const orders = all<{ id: string; ship_region: string; shipment_id: string | null; status: string }>(
    `SELECT id, ship_region, shipment_id, status FROM orders
     WHERE id IN (${orderIds.map(() => "?").join(",")}) AND shop_id = ?`,
    [...orderIds, shop.id],
  ).filter((o) => o.status === "paid" && !o.shipment_id);
  if (orders.length < 2) return { error: "Los pedidos elegidos ya no se pueden consolidar." };

  const shipmentId = newId("sp_");
  const totalCost = unitCost * orders.length;
  const saved = Math.max(0, individual * orders.length - totalCost);
  const regions = [...new Set(orders.map((o) => o.ship_region))];

  tx(() => {
    run(
      `INSERT INTO shipments (id, shop_id, method, region, status, pickup_date, unit_cost, total_cost, saved, created_at)
       VALUES (?,?,?,?,'open',?,?,?,?,?)`,
      [shipmentId, shop.id, method, regions.join(", "), pickupDate, unitCost, totalCost, saved, nowIso()],
    );
    for (const order of orders) {
      run("UPDATE orders SET shipment_id = ? WHERE id = ?", [shipmentId, order.id]);
    }
  });

  revalidatePath("/mypage/shop/shipments");
  return { ok: `Envío consolidado creado con ${orders.length} pedidos. Ahorro estimado: $${saved}.` };
}

export async function pickUpShipmentAction(formData: FormData) {
  const { shop } = await myShop();
  if (!shop) return;
  const id = String(formData.get("shipment_id") ?? "");
  const shipment = get<Shipment>("SELECT * FROM shipments WHERE id = ?", [id]);
  if (!shipment || shipment.shop_id !== shop.id || shipment.status !== "open") return;
  const base = String(formData.get("tracking") ?? "").trim() || `MDC${Date.now().toString().slice(-8)}`;

  const orders = all<{ id: string; buyer_id: string; item_id: string }>(
    "SELECT id, buyer_id, item_id FROM orders WHERE shipment_id = ? AND status = 'paid'", [id]);

  tx(() => {
    run("UPDATE shipments SET status = 'picked_up', tracking = ? WHERE id = ?", [base, id]);
    orders.forEach((order, index) => {
      const tracking = `${base}-${String(index + 1).padStart(2, "0")}`;
      run("UPDATE orders SET status = 'shipped', shipped_at = ?, tracking = ? WHERE id = ?",
        [nowIso(), tracking, order.id]);
      run("INSERT INTO messages (id, order_id, user_id, body, created_at) VALUES (?,?,?,?,?)",
        [newId("ms_"), order.id, shop.owner_id,
         `Tu pedido salió en la recolección consolidada del ${shipment.pickup_date || "día de hoy"}. Guía: ${tracking}`,
         nowIso()]);
    });
  });

  for (const order of orders) {
    const item = get<Item>("SELECT * FROM items WHERE id = ?", [order.item_id]);
    notify({
      userId: order.buyer_id, kind: "order", title: "Tu pedido va en camino",
      body: `${item?.title ?? ""} · salió en un envío consolidado`,
      link: `/transaction/${order.id}`,
    });
  }
  revalidatePath("/mypage/shop/shipments");
  revalidatePath("/mypage/shop/orders");
}

/* ======================= Importación de catálogo (CSV) ====================== */

/** Analizador de CSV con soporte de comillas dobles. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += char;
      continue;
    }
    if (char === '"') { quoted = true; continue; }
    if (char === ",") { row.push(field); field = ""; continue; }
    if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
      field = "";
      continue;
    }
    field += char;
  }
  row.push(field);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

export async function importCatalogAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, shop } = await myShop();
  if (!shop) return { error: "Primero abre tu tienda." };
  if (shop.status !== "active") return { error: "Tu tienda todavía está en revisión." };

  const file = form.get("file");
  let text = String(form.get("csv") ?? "");
  let filename = "pegado.csv";
  if (file instanceof File && file.size > 0) {
    if (file.size > 2 * 1024 * 1024) return { error: "El archivo no puede pesar más de 2 MB." };
    text = await file.text();
    filename = file.name;
  }
  if (!text.trim()) return { error: "Sube un archivo CSV o pega su contenido." };

  const rows = parseCsv(text);
  if (rows.length < 2) return { error: "El CSV no tiene filas de productos." };
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => headers.indexOf(name);
  const iSku = col("sku");
  const iTitle = col("titulo");
  const iPrice = col("precio");
  if (iSku < 0 || iTitle < 0 || iPrice < 0)
    return { error: "El CSV debe incluir al menos las columnas sku, titulo y precio." };

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const problems: string[] = [];

  for (const [index, row] of rows.slice(1).entries()) {
    const line = index + 2;
    const sku = (row[iSku] ?? "").trim();
    const title = (row[iTitle] ?? "").trim();
    const price = Math.round(Number((row[iPrice] ?? "").replace(/[^\d.]/g, "")) || 0);
    if (!sku || !title) { skipped++; problems.push(`Fila ${line}: falta sku o título.`); continue; }
    if (price < MIN_PRICE || price > MAX_PRICE) {
      skipped++; problems.push(`Fila ${line}: precio fuera de rango.`); continue;
    }

    const value = (name: string) => {
      const i = col(name);
      return i >= 0 ? (row[i] ?? "").trim() : "";
    };
    const categorySlug = value("categoria");
    const category = categorySlug
      ? get<{ id: number }>("SELECT id FROM categories WHERE slug = ?", [categorySlug])
      : undefined;
    if (categorySlug && !category) {
      skipped++; problems.push(`Fila ${line}: la categoría «${categorySlug}» no existe.`); continue;
    }
    const brandName = value("marca");
    const brand = brandName
      ? get<{ id: number }>("SELECT id FROM brands WHERE name = ?", [brandName])
      : undefined;

    const variantsRaw = value("variantes");
    const variants = variantsRaw
      ? variantsRaw.split("|").map((chunk) => {
          const [label, qty] = chunk.split(":");
          return { label: (label ?? "").trim(), stock: Math.max(0, Math.round(Number(qty) || 0)) };
        }).filter((v) => v.label)
      : [];
    const stockField = Math.max(0, Math.round(Number(value("inventario")) || 0));
    const stock = variants.length ? variants.reduce((sum, v) => sum + v.stock, 0) : stockField;

    const existing = get<Item>(
      "SELECT * FROM items WHERE shop_id = ? AND external_sku = ?", [shop.id, sku]);
    const itemId = existing?.id ?? newId("m");
    const description = value("descripcion");
    const size = value("talla");
    const color = value("color");
    const status = stock > 0 ? "on_sale" : "stopped";

    if (existing) {
      run(
        `UPDATE items SET title=?, description=?, price=?, category_id=?, brand_id=?, size=?, color=?,
          stock=?, status=?, updated_at=? WHERE id=?`,
        [title, description, price, category?.id ?? existing.category_id, brand?.id ?? existing.brand_id,
         size, color, stock, status, nowIso(), itemId],
      );
      updated++;
    } else {
      run(
        `INSERT INTO items (id, seller_id, title, description, price, category_id, brand_id, size, color,
          condition, shipping_payer, shipping_method, ship_from, ship_days, offers_enabled, shop_id,
          stock, external_sku, status, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,1,'seller','comodo',?,1,0,?,?,?,?,?,?)`,
        [itemId, user.id, title, description, price, category?.id ?? null, brand?.id ?? null,
         size, color, shop.ship_from, shop.id, stock, sku, status, nowIso(), nowIso()],
      );
      run("INSERT INTO item_images (item_id, url, position) VALUES (?,?,0)", [
        itemId,
        `/api/photo?seed=${encodeURIComponent(itemId)}&e=%F0%9F%9B%8D%EF%B8%8F&t=${encodeURIComponent(title.slice(0, 32))}`,
      ]);
      created++;
    }

    run("DELETE FROM item_variants WHERE item_id = ?", [itemId]);
    variants.forEach((variant, position) => {
      run("INSERT INTO item_variants (item_id, label, sku, stock, position) VALUES (?,?,?,?,?)",
        [itemId, variant.label, `${sku}-${position + 1}`, variant.stock, position]);
    });
  }

  run(
    `INSERT INTO import_jobs (id, shop_id, filename, created, updated, skipped, errors, created_at)
     VALUES (?,?,?,?,?,?,?,?)`,
    [newId("im_"), shop.id, filename, created, updated, skipped, problems.slice(0, 10).join(" · "), nowIso()],
  );

  revalidatePath("/mypage/shop/items");
  revalidatePath("/mypage/shop/import");
  return {
    ok: `Importación lista: ${created} productos nuevos, ${updated} actualizados, ${skipped} omitidos.`,
    error: problems.length ? problems.slice(0, 3).join(" · ") : undefined,
  };
}

/* ================================ Colectivos =============================== */

export async function createCollectiveAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, shop } = await myShop();
  if (!shop) return { error: "Necesitas una tienda para crear un colectivo." };
  const name = String(form.get("name") ?? "").trim();
  if (name.length < 3) return { error: "El nombre debe tener al menos 3 caracteres." };
  const base = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "colectivo";
  let slug = base;
  let i = 1;
  while (get("SELECT 1 AS x FROM collectives WHERE slug = ?", [slug])) slug = `${base}-${++i}`;

  const collectiveId = newId("co_");
  tx(() => {
    run(
      `INSERT INTO collectives (id, name, slug, description, emoji, region, owner_id, created_at)
       VALUES (?,?,?,?,?,?,?,?)`,
      [collectiveId, name, slug, String(form.get("description") ?? "").trim(),
       String(form.get("emoji") ?? "🏛️"), String(form.get("region") ?? ""), user.id, nowIso()],
    );
    run("INSERT INTO collective_members (collective_id, shop_id, role, joined_at) VALUES (?,?,'owner',?)",
      [collectiveId, shop.id, nowIso()]);
  });
  revalidatePath("/colectivos");
  redirect(`/colectivo/${slug}`);
}

export async function toggleCollectiveMembershipAction(formData: FormData) {
  const { shop } = await myShop();
  const slug = String(formData.get("slug") ?? "");
  if (!shop) redirect("/mypage/shop/new");
  const collectiveId = String(formData.get("collective_id") ?? "");
  const member = get<{ role: string }>(
    "SELECT role FROM collective_members WHERE collective_id = ? AND shop_id = ?",
    [collectiveId, shop.id],
  );
  if (member) {
    if (member.role === "owner") return;
    run("DELETE FROM collective_members WHERE collective_id = ? AND shop_id = ?", [collectiveId, shop.id]);
  } else {
    run("INSERT INTO collective_members (collective_id, shop_id, role, joined_at) VALUES (?,?,'member',?)",
      [collectiveId, shop.id, nowIso()]);
    const collective = get<{ owner_id: string; name: string }>(
      "SELECT owner_id, name FROM collectives WHERE id = ?", [collectiveId]);
    if (collective && collective.owner_id !== shop.owner_id) {
      notify({
        userId: collective.owner_id, kind: "shop",
        title: `${shop.name} se unió a ${collective.name}`,
        link: `/colectivo/${slug}`,
      });
    }
  }
  revalidatePath(`/colectivo/${slug}`);
  revalidatePath("/mypage/shop/collectives");
}

/* ============================ Paquetes cruzados ============================= */

export async function createBundleAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { shop } = await myShop();
  if (!shop) return { error: "Necesitas una tienda para armar paquetes." };
  const title = String(form.get("title") ?? "").trim();
  const discount = Math.max(0, Math.round(Number(form.get("discount")) || 0));
  const itemIds = form.getAll("item_id").map(String).filter(Boolean);
  if (title.length < 3) return { error: "Ponle un nombre al paquete." };
  if (discount < 10 || discount > 500) return { error: "El cupón cruzado debe estar entre $10 y $500." };
  if (itemIds.length < 2) return { error: "Elige al menos 2 productos de tiendas distintas." };

  const items = all<{ id: string; shop_id: string | null; price: number }>(
    `SELECT id, shop_id, price FROM items WHERE id IN (${itemIds.map(() => "?").join(",")}) AND status = 'on_sale'`,
    itemIds,
  ).filter((item) => item.shop_id);
  const shops = new Set(items.map((item) => item.shop_id));
  if (!shops.has(shop.id)) return { error: "Incluye al menos un producto de tu tienda." };
  if (shops.size < 2) return { error: "Un paquete cruzado necesita productos de al menos 2 tiendas." };

  const bundleId = newId("bu_");
  const minPrice = Math.min(...items.map((item) => item.price));
  tx(() => {
    run(
      `INSERT INTO bundles (id, title, description, owner_shop_id, discount, min_price, status, created_at)
       VALUES (?,?,?,?,?,?,'active',?)`,
      [bundleId, title, String(form.get("description") ?? "").trim(), shop.id, discount, minPrice, nowIso()],
    );
    items.forEach((item, position) => {
      run("INSERT INTO bundle_items (bundle_id, item_id, shop_id, position) VALUES (?,?,?,?)",
        [bundleId, item.id, item.shop_id, position]);
    });
  });

  for (const shopId of shops) {
    if (shopId === shop.id) continue;
    const partner = get<Shop>("SELECT * FROM shops WHERE id = ?", [shopId!]);
    if (partner) {
      notify({
        userId: partner.owner_id, kind: "shop",
        title: `${shop.name} incluyó tus productos en un paquete cruzado`,
        body: title, link: "/mypage/shop/bundles",
      });
    }
  }

  revalidatePath("/mypage/shop/bundles");
  return { ok: "Paquete cruzado creado." };
}

export async function deleteBundleAction(formData: FormData) {
  const { shop } = await myShop();
  if (!shop) return;
  const id = String(formData.get("id") ?? "");
  const bundle = get<{ owner_shop_id: string }>("SELECT owner_shop_id FROM bundles WHERE id = ?", [id]);
  if (!bundle || bundle.owner_shop_id !== shop.id) return;
  run("DELETE FROM bundles WHERE id = ?", [id]);
  revalidatePath("/mypage/shop/bundles");
}

/* ========================= Adelanto de saldo (factoraje) ==================== */

export async function requestAdvanceAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, shop } = await myShop();
  if (!shop) return { error: "Necesitas una tienda para solicitar un adelanto." };

  const fresh = get<User>("SELECT * FROM users WHERE id = ?", [user.id])!;
  const eligibility = advanceEligibility(shop, fresh);
  if (!eligibility.eligible)
    return { error: `No podemos adelantarte ahora mismo: ${eligibility.blockers.join(" · ")}.` };

  const amount = Math.round(Number(form.get("amount")) || 0);
  if (amount < ADVANCE_MIN) return { error: `El adelanto mínimo es de $${ADVANCE_MIN}.` };
  if (amount > eligibility.limit)
    return {
      error: `Puedes adelantar hasta $${eligibility.limit} (${Math.round(eligibility.tier.rate * 100)} % de tus ventas en curso según tu historial).`,
    };
  if (!form.get("acepta_costo"))
    return { error: "Confirma que entiendes el costo del adelanto antes de continuar." };

  const fee = Math.round(amount * ADVANCE_FEE_RATE);
  const dueAt = new Date(Date.now() + ADVANCE_DUE_DAYS * 86400000).toISOString();
  const apr = advanceApr(ADVANCE_FEE_RATE, eligibility.horizonDays);

  tx(() => {
    run(
      `INSERT INTO advances (id, shop_id, user_id, amount, fee, outstanding, fee_rate, apr,
        horizon_days, due_at, tier, status, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,'active',?)`,
      [newId("ad_"), shop.id, user.id, amount, fee, amount + fee, ADVANCE_FEE_RATE, apr,
       eligibility.horizonDays, dueAt, eligibility.tier.key, nowIso()],
    );
    run("UPDATE users SET balance = balance + ? WHERE id = ?", [amount, user.id]);
    ledgerEntry(user.id, "balance", amount,
      `Adelanto sobre ventas en curso · comisión $${fee} · CAT aproximado ${apr} %`);
  });

  notify({
    userId: user.id, kind: "shop", title: "Adelanto depositado",
    body: `Recibiste $${amount}. Se descontarán $${amount + fee} de tus ventas conforme se completen.`,
    link: "/mypage/shop/financing",
  });
  revalidatePath("/mypage/shop/financing");
  revalidatePath("/mypage/balance");
  return { ok: `Adelanto de $${amount} depositado (comisión $${fee}, CAT aproximado ${apr} %).` };
}

export async function listSourcedItemAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, shop } = await myShop();
  if (!shop) return { error: "Primero abre tu tienda." };
  const orderId = String(form.get("order_id") ?? "");
  const order = get<{
    id: string; item_id: string; buyer_id: string; shop_id: string | null;
    quantity: number; price: number; is_wholesale: number; status: string;
  }>("SELECT * FROM orders WHERE id = ?", [orderId]);
  if (!order || order.buyer_id !== user.id || !order.is_wholesale)
    return { error: "Ese pedido de mayoreo no es tuyo." };
  if (order.status === "paid") return { error: "Espera a recibir la mercancía para publicarla." };

  const source = get<Item>("SELECT * FROM items WHERE id = ?", [order.item_id]);
  if (!source) return { error: "El producto original ya no existe." };
  if (get("SELECT 1 AS x FROM items WHERE shop_id = ? AND source_item_id = ?", [shop.id, source.id]))
    return { error: "Ya publicaste este producto en tu tienda." };

  const price = Math.round(Number(form.get("price")) || 0);
  const stock = Math.max(1, Math.min(order.quantity, Math.round(Number(form.get("stock")) || order.quantity)));
  if (price <= order.price)
    return { error: `El precio de venta debe ser mayor a tu costo (${order.price}).` };
  if (price > MAX_PRICE) return { error: "El precio es demasiado alto." };

  const supplierShop = order.shop_id ? get<Shop>("SELECT * FROM shops WHERE id = ?", [order.shop_id]) : undefined;
  const itemId = newId("m");
  const title = String(form.get("title") ?? source.title).trim() || source.title;

  run(
    `INSERT INTO items (id, seller_id, title, description, price, category_id, brand_id, size, color,
      condition, shipping_payer, shipping_method, ship_from, ship_days, offers_enabled, shop_id,
      stock, external_sku, origin, source_shop_id, source_item_id, status, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,1,'seller','comodo',?,1,0,?,?,?,'sourced',?,?, 'on_sale',?,?)`,
    [itemId, user.id, title,
     `${String(form.get("description") ?? source.description).trim()}\n\nProducto elaborado por ${supplierShop?.name ?? "una tienda aliada"} y surtido por ${shop.name}.`,
     price, source.category_id, source.brand_id, source.size, source.color,
     shop.ship_from, shop.id, stock, source.external_sku || "", order.shop_id, source.id,
     nowIso(), nowIso()],
  );

  const image = get<{ url: string }>(
    "SELECT url FROM item_images WHERE item_id = ? ORDER BY position LIMIT 1", [source.id]);
  run("INSERT INTO item_images (item_id, url, position) VALUES (?,?,0)", [
    itemId,
    image?.url ?? `/api/photo?seed=${encodeURIComponent(itemId)}&e=%F0%9F%9B%8D%EF%B8%8F&t=${encodeURIComponent(title.slice(0, 32))}`,
  ]);

  if (supplierShop) {
    notify({
      userId: supplierShop.owner_id, kind: "shop",
      title: `${shop.name} ya vende tu producto`,
      body: `${title} · con crédito a tu taller en la ficha del producto.`,
      link: `/item/${itemId}`,
    });
  }

  revalidatePath("/mypage/shop/items");
  revalidatePath(`/shop/${shop.slug}`);
  redirect(`/item/${itemId}?published=1`);
}
