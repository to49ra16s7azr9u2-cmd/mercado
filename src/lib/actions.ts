"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { all, get, newId, nowIso, run, tx } from "./db";
import { createSession, currentUser, destroySession, hashPassword, verifyPassword } from "./auth";
import { ledgerEntry, notify } from "./notify";
import { saveImage } from "./upload";
import { FEE_RATE, MAX_PRICE, MIN_PAYOUT, MIN_PRICE, PAYOUT_FEE, shippingCostOf } from "./constants";
import type { Item, User } from "./types";

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
    [newId("c_"), id, "Cupón de bienvenida: 5 € de descuento", "BIENVENIDA5", 5, 20,
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
      return { error: `El precio debe estar entre ${MIN_PRICE} € y ${MAX_PRICE} €.` };
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
      notify({ userId: l.user_id, kind: "like", title: "¡Ha bajado de precio!", body: `${item.title} ahora cuesta ${price} €`, link: `/item/${id}`, image });
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
  if (!Number.isFinite(price) || price < MIN_PRICE) return { error: "Introduce un importe válido." };
  if (price >= item.price) return { error: "La oferta debe ser inferior al precio publicado." };
  if (price < Math.round(item.price * 0.5)) return { error: "La oferta no puede ser inferior al 50 % del precio." };
  run("INSERT INTO offers (id, item_id, user_id, price, status, created_at) VALUES (?,?,?,?,'pending',?)",
    [newId("of_"), itemId, user.id, price, nowIso()]);
  const image = get<{ url: string }>("SELECT url FROM item_images WHERE item_id = ? ORDER BY position LIMIT 1", [itemId])?.url ?? "";
  notify({ userId: item.seller_id, kind: "offer", title: `${user.name} te ha hecho una oferta de ${price} €`, body: item.title, link: `/item/${itemId}`, image });
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
    notify({ userId: offer.user_id, kind: "offer", title: "¡Han aceptado tu oferta!", body: `${item.title} por ${offer.price} €. Complétala antes de que otra persona la compre.`, link: `/item/${item.id}`, image });
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
  const pointsRequested = Math.max(0, Math.round(Number(form.get("points_used")) || 0));
  const couponId = String(form.get("coupon_id") ?? "");

  let couponAmount = 0;
  let coupon: { id: string; amount: number; min_price: number } | undefined;
  if (couponId) {
    coupon = get("SELECT id, amount, min_price FROM coupons WHERE id = ? AND user_id = ? AND used_at IS NULL AND expires_at > ?",
      [couponId, user.id, nowIso()]);
    if (!coupon) return { error: "El cupón seleccionado ya no es válido." };
    if (item.price < coupon.min_price) return { error: "El cupón no se puede aplicar a este importe." };
    couponAmount = coupon.amount;
  }

  const gross = item.price + shippingCost;
  const pointsUsed = Math.min(pointsRequested, fresh.points, Math.max(0, gross - couponAmount));
  const charged = Math.max(0, gross - couponAmount - pointsUsed);

  if (paymentMethod === "balance" && fresh.balance < charged)
    return { error: "No tienes saldo suficiente para completar la compra." };
  if (paymentMethod === "card" && !get("SELECT 1 AS x FROM cards WHERE user_id = ?", [user.id]))
    return { error: "Añade primero una tarjeta en «Métodos de pago»." };

  const fee = Math.round(item.price * FEE_RATE);
  const sellerShipping = item.shipping_payer === "seller" ? shippingCostOf(item.shipping_method) : 0;
  const payout = Math.max(0, item.price - fee - sellerShipping);
  const orderId = newId("o_");

  tx(() => {
    run(
      `INSERT INTO orders (id, item_id, buyer_id, seller_id, price, points_used, coupon_id, coupon_amount,
        charged, fee, shipping_cost, payout, payment_method, status, ship_name, ship_zip, ship_region,
        ship_city, ship_line, ship_phone, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'paid',?,?,?,?,?,?,?)`,
      [orderId, item.id, user.id, item.seller_id, item.price, pointsUsed, coupon?.id ?? null, couponAmount,
       charged, fee, shippingCost, payout, paymentMethod, shipName, shipZip, shipRegion, shipCity,
       shipLine, shipPhone, nowIso()],
    );
    run("UPDATE items SET status = 'trading', updated_at = ? WHERE id = ?", [nowIso(), item.id]);
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
  notify({ userId: item.seller_id, kind: "order", title: "¡Has vendido un artículo!", body: `${item.title} · Prepara el envío`, link: `/transaction/${orderId}`, image });
  notify({ userId: user.id, kind: "order", title: "Compra confirmada", body: `${item.title} · Ya puedes hablar con quien vende`, link: `/transaction/${orderId}`, image });
  run("INSERT INTO messages (id, order_id, user_id, body, created_at) VALUES (?,?,?,?,?)",
    [newId("ms_"), orderId, user.id, "¡Hola! Acabo de comprar el artículo. Gracias de antemano.", nowIso()]);

  revalidatePath("/");
  redirect(`/transaction/${orderId}?new=1`);
}

/* =============================== transacción =================================== */

function loadOrder(id: string) {
  return get<{
    id: string; item_id: string; buyer_id: string; seller_id: string; status: string;
    payout: number; price: number; points_used: number; charged: number; payment_method: string;
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
  if (!order || order.buyer_id !== user.id) return { error: "No puedes valorar esta transacción." };
  if (order.status !== "shipped") return { error: "Todavía no se ha registrado el envío." };
  const score = String(form.get("score") ?? "");
  if (!["good", "normal", "bad"].includes(score)) return { error: "Selecciona una valoración." };
  const body = String(form.get("body") ?? "").trim();
  run("UPDATE orders SET status = 'received', received_at = ? WHERE id = ?", [nowIso(), id]);
  run("INSERT INTO reviews (id, order_id, rater_id, ratee_id, score, body, created_at) VALUES (?,?,?,?,?,?,?)",
    [newId("rv_"), id, user.id, order.seller_id, score, body, nowIso()]);
  notify({ userId: order.seller_id, kind: "review", title: "Han confirmado la recepción", body: "Valora a quien te ha comprado para cerrar la transacción.", link: `/transaction/${id}` });
  revalidatePath(`/transaction/${id}`);
  return { ok: "¡Gracias! Has confirmado la recepción." };
}

export async function rateBuyerAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await currentUser();
  if (!user) redirect("/login");
  const id = String(form.get("order_id") ?? "");
  const order = loadOrder(id);
  if (!order || order.seller_id !== user.id) return { error: "No puedes valorar esta transacción." };
  if (order.status !== "received") return { error: "Aún falta que confirmen la recepción." };
  const score = String(form.get("score") ?? "");
  if (!["good", "normal", "bad"].includes(score)) return { error: "Selecciona una valoración." };
  const body = String(form.get("body") ?? "").trim();
  const item = get<Item>("SELECT * FROM items WHERE id = ?", [order.item_id]);

  tx(() => {
    run("INSERT INTO reviews (id, order_id, rater_id, ratee_id, score, body, created_at) VALUES (?,?,?,?,?,?,?)",
      [newId("rv_"), id, user.id, order.buyer_id, score, body, nowIso()]);
    run("UPDATE orders SET status = 'done', completed_at = ? WHERE id = ?", [nowIso(), id]);
    run("UPDATE items SET status = 'sold', updated_at = ? WHERE id = ?", [nowIso(), order.item_id]);
    run("UPDATE users SET balance = balance + ? WHERE id = ?", [order.payout, user.id]);
    ledgerEntry(user.id, "balance", order.payout, `Venta de «${item?.title ?? ""}»`);
  });

  notify({ userId: order.buyer_id, kind: "review", title: "Transacción finalizada", body: "Ya puedes ver la valoración que has recibido.", link: `/transaction/${id}` });
  revalidatePath(`/transaction/${id}`);
  revalidatePath("/mypage/balance");
  return { ok: "Transacción finalizada. El importe se ha añadido a tu saldo." };
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
    run("UPDATE items SET status = 'on_sale', updated_at = ? WHERE id = ?", [nowIso(), order.item_id]);
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
    return { error: `El importe mínimo para transferir es de ${MIN_PAYOUT} €.` };
  if (amount + PAYOUT_FEE > fresh.balance) return { error: "Saldo insuficiente (recuerda la comisión de transferencia)." };
  if (!/^ES\d{22}$/.test(iban)) return { error: "Introduce un IBAN español válido (ES + 22 dígitos)." };
  if (!holder) return { error: "Indica el titular de la cuenta." };
  tx(() => {
    run("INSERT INTO payouts (id, user_id, amount, fee, iban, holder, status, created_at) VALUES (?,?,?,?,?,?,'pending',?)",
      [newId("p_"), user.id, amount, PAYOUT_FEE, iban, holder, nowIso()]);
    run("UPDATE users SET balance = balance - ? WHERE id = ?", [amount + PAYOUT_FEE, user.id]);
    ledgerEntry(user.id, "balance", -(amount + PAYOUT_FEE), `Transferencia a ${iban.slice(0, 8)}···`);
  });
  notify({ userId: user.id, kind: "news", title: "Transferencia solicitada", body: `Recibirás ${amount} € en 2-4 días laborables.`, link: "/mypage/balance" });
  revalidatePath("/mypage/balance");
  return { ok: "Solicitud de transferencia registrada." };
}

export async function buyPointsAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await currentUser();
  if (!user) redirect("/login?next=/mypage/points");
  const amount = Math.round(Number(form.get("amount")));
  if (![5, 10, 20, 50, 100].includes(amount)) return { error: "Selecciona un importe válido." };
  run("UPDATE users SET points = points + ? WHERE id = ?", [amount, user.id]);
  ledgerEntry(user.id, "points", amount, "Compra de puntos con tarjeta");
  revalidatePath("/mypage/points");
  return { ok: `Has añadido ${amount} puntos.` };
}

export async function convertBalanceToPointsAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await currentUser();
  if (!user) redirect("/login?next=/mypage/points");
  const amount = Math.round(Number(form.get("amount")));
  const fresh = get<User>("SELECT * FROM users WHERE id = ?", [user.id])!;
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Introduce un importe válido." };
  if (amount > fresh.balance) return { error: "No tienes saldo suficiente." };
  tx(() => {
    run("UPDATE users SET balance = balance - ?, points = points + ? WHERE id = ?", [amount, amount, user.id]);
    ledgerEntry(user.id, "balance", -amount, "Conversión de saldo a puntos");
    ledgerEntry(user.id, "points", amount, "Conversión de saldo a puntos");
  });
  revalidatePath("/mypage/points");
  return { ok: `Has convertido ${amount} € de saldo en puntos.` };
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
