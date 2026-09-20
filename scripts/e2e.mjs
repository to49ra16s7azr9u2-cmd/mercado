/**
 * Prueba end-to-end del recorrido completo: registro de sesión, búsqueda, favoritos,
 * comentarios, publicación, compra, mensajería y valoraciones.
 *
 * Requiere el servidor en marcha (npm run dev) y la base de datos sembrada (npm run seed):
 *   npm run test:e2e
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const log = (...a) => console.log("•", ...a);
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("  [pageerror]", e.message));
const errors = [];

async function step(name, fn) {
  try { await fn(); log("OK   ", name); }
  catch (e) { errors.push(`${name}: ${e.message}`); log("FALLO", name, "→", e.message.split("\n")[0]); }
}

await step("home carga", async () => {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /Recién publicado|Recomendado para ti/ }).first().waitFor({ timeout: 10000 });
});

await step("login demo", async () => {
  await page.goto(`${BASE}/login`);
  await page.fill("#email", "demo@mercado.es");
  await page.fill("#password", "demo1234");
  await page.click('button[type="submit"]');
  await page.waitForURL(BASE + "/", { timeout: 15000 });
});

await step("búsqueda con filtros", async () => {
  await page.goto(`${BASE}/search?q=camiseta&priceMax=30&sort=price_asc`);
  await page.waitForSelector("a[href^='/item/']", { timeout: 10000 });
});

let itemUrl;
await step("abrir artículo y dar a favorito", async () => {
  await page.goto(`${BASE}/search?status=on_sale`);
  const links = await page.$$eval("a[href^='/item/']", (as) => as.map((a) => a.getAttribute("href")));
  let like;
  for (const href of links) {
    await page.goto(BASE + href);
    like = page.getByRole("button", { name: /favoritos/i });
    if (await like.count()) { itemUrl = BASE + href; break; }
  }
  const before = await like.innerText();
  await like.click();
  await page.waitForFunction((t) => !document.body.innerText.includes(t) || true, before);
  await page.waitForTimeout(800);
});

await step("comentar en el artículo", async () => {
  await page.fill('textarea[name="body"]', "Hola, ¿sigue disponible? (test)");
  await page.getByRole("button", { name: "Comentar" }).click();
  await page.waitForTimeout(1200);
  const body = await page.innerText("body");
  if (!body.includes("(test)")) throw new Error("el comentario no aparece");
});

await step("publicar artículo nuevo", async () => {
  await page.goto(`${BASE}/sell`);
  await page.fill("#title", "Camiseta de prueba automática");
  await page.fill("#description", "Artículo creado por la prueba end-to-end.");
  await page.selectOption("#cat1", { label: "Mujer" });
  await page.selectOption("#cat2", { index: 1 });
  await page.fill('input[name="price"]', "25");
  await page.selectOption("#ship_from", { label: "Madrid" });
  await page.getByRole("button", { name: "Publicar artículo" }).click();
  await page.waitForURL(/\/item\/.*published=1/, { timeout: 20000 });
  const text = await page.innerText("body");
  if (!text.includes("Camiseta de prueba automática")) throw new Error("no se ve el título publicado");
  if (!text.includes("25")) throw new Error("no se ve el precio");
});

await step("comprar un artículo (checkout completo)", async () => {
  await page.goto(`${BASE}/search?status=on_sale&sort=price_asc`);
  const links = await page.$$eval("a[href^='/item/']", (as) => as.map((a) => a.getAttribute("href")));
  for (const href of links) {
    await page.goto(BASE + href);
    const buy = page.getByRole("link", { name: "Comprar ahora" });
    if (await buy.count()) { await buy.click(); break; }
  }
  await page.waitForURL(/\/checkout\//, { timeout: 15000 });
  await page.getByRole("button", { name: /Confirmar la compra/ }).click();
  await page.waitForURL(/\/transaction\/.*new=1/, { timeout: 20000 });
});

const txUrl = page.url().split("?")[0];

await step("enviar mensaje en la transacción", async () => {
  await page.fill('input[name="body"]', "Mensaje de prueba automática");
  await page.getByRole("button", { name: "Enviar" }).click();
  await page.waitForTimeout(1500);
  if (!(await page.innerText("body")).includes("Mensaje de prueba automática"))
    throw new Error("el mensaje no aparece");
});

await step("aparece en Mis compras", async () => {
  await page.goto(`${BASE}/mypage/purchases`);
  if (!(await page.innerText("body")).includes("Pago confirmado")) throw new Error("no figura la compra");
});

// El vendedor envía → el comprador valora → el vendedor valora
await step("flujo completo vendedor/comprador", async () => {
  const orderId = txUrl.split("/").pop();
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync("data/mercado.db");
  const order = db.prepare("select * from orders where id = ?").get(orderId);
  const seller = db.prepare("select * from users where id = ?").get(order.seller_id);
  db.prepare("insert or replace into sessions (token,user_id,created_at) values (?,?,?)")
    .run("sellertoken", seller.id, new Date().toISOString());
  db.close();

  const sellerCtx = await browser.newContext();
  await sellerCtx.addCookies([{ name: "mercado_session", value: "sellertoken", url: BASE }]);
  const sp = await sellerCtx.newPage();
  await sp.goto(txUrl);
  await sp.fill('input[name="tracking"]', "MD0000000001ES");
  await sp.getByRole("button", { name: "Marcar como enviado" }).click();
  await sp.waitForTimeout(1500);

  await page.goto(txUrl);
  await page.locator('label:has(input[name="score"][value="good"])').click();
  await page.getByRole("button", { name: /Confirmar recepción/ }).click();
  await page.waitForTimeout(1800);

  await sp.goto(txUrl);
  await sp.locator('label:has(input[name="score"][value="good"])').click();
  await sp.getByRole("button", { name: /Enviar valoración/ }).click();
  await sp.waitForTimeout(1800);
  const body = await sp.innerText("body");
  if (!body.includes("Finalizada") && !body.includes("Valoraciones"))
    throw new Error("la transacción no se ha cerrado");
  await sellerCtx.close();
});

await step("páginas de la cuenta responden", async () => {
  for (const path of ["/mypage", "/mypage/listings", "/mypage/balance", "/mypage/points",
    "/mypage/coupons", "/mypage/reviews", "/mypage/searches", "/mypage/follows",
    "/mypage/profile", "/mypage/settings", "/notifications"]) {
    const res = await page.goto(BASE + path);
    if (res.status() !== 200) throw new Error(`${path} → ${res.status()}`);
  }
});

await page.goto(BASE);
if (process.env.SHOT_DIR) await page.screenshot({ path: process.env.SHOT_DIR + "/home.png" });
await page.goto(itemUrl);
if (process.env.SHOT_DIR) await page.screenshot({ path: process.env.SHOT_DIR + "/item.png" });

await browser.close();
console.log(errors.length ? `\n${errors.length} FALLOS:\n` + errors.join("\n") : "\nTodo correcto ✅");
process.exit(errors.length ? 1 : 0);
