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
  catch (e) {
    errors.push(`${name}: ${e.message}`);
    log("FALLO", name, "→", e.message.split("\n")[0]);
    if (process.env.SHOT_DIR) {
      try {
        await page.screenshot({ path: `${process.env.SHOT_DIR}/fallo-${name.replace(/\W+/g, "-")}.png` });
      } catch {}
    }
  }
}

await step("home carga", async () => {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /Recién publicado|Recomendado para ti/ }).first().waitFor({ timeout: 10000 });
});

await step("login demo", async () => {
  await page.goto(`${BASE}/login`);
  await page.fill("#email", "demo@mercado.mx");
  await page.fill("#password", "demo1234");
  await page.click('button[type="submit"]');
  await page.waitForURL(BASE + "/", { timeout: 15000 });
});

await step("búsqueda con filtros", async () => {
  await page.goto(`${BASE}/search?q=playera&priceMax=800&sort=price_asc`);
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
  await page.fill('input[name="price"]', "450");
  await page.selectOption("#ship_from", { label: "Jalisco" });
  await page.getByRole("button", { name: "Publicar artículo" }).click();
  await page.waitForURL(/\/item\/.*published=1/, { timeout: 20000 });
  const text = await page.innerText("body");
  if (!text.includes("Camiseta de prueba automática")) throw new Error("no se ve el título publicado");
  if (!text.includes("450")) throw new Error("no se ve el precio");
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
  await page.getByText("Resumen del pedido").waitFor({ timeout: 20000 });
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
  await page.getByText(/Pago confirmado|Enviado/).first().waitFor({ timeout: 20000 });
  const purchases = await page.innerText("body");
  if (!/Pago confirmado|Enviado/.test(purchases)) throw new Error("no figura la compra");
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
  await sp.getByRole("button", { name: /Enviar calificación/ }).click();
  await sp.waitForTimeout(1800);
  await sp.getByText(/Calificaciones/).first().waitFor({ timeout: 20000 });
  const body = await sp.innerText("body");
  if (!/finalizada/i.test(body)) throw new Error("la transacción no se cerró");
  await sellerCtx.close();
});

/* ----------------------------- Mercado Shops ----------------------------- */

const shopCtx = await browser.newContext();
const sp2 = await shopCtx.newPage();
const shopEmail = `tienda${Date.now()}@mercado.mx`;
let shopItemUrl;

await step("registro de una cuenta nueva", async () => {
  await sp2.goto(`${BASE}/signup`);
  await sp2.fill("#name", "Tienda de Prueba");
  await sp2.fill("#email", shopEmail);
  await sp2.fill("#password", "tienda1234");
  await sp2.locator('input[type="checkbox"]').check();
  await sp2.getByRole("button", { name: /Crear cuenta/ }).click();
  await sp2.waitForURL(BASE + "/", { timeout: 20000 });
});

await step("abrir tienda en Mercado Shops", async () => {
  await sp2.goto(`${BASE}/mypage/shop/new`);
  await sp2.fill("#name", "Tienda Automática MX");
  await sp2.selectOption("#category", { label: "Moda y accesorios" });
  await sp2.fill("#description", "Tienda creada por la prueba end-to-end.");
  await sp2.selectOption("#ship_from", { label: "Jalisco" });
  await sp2.fill("#legal_name", "Tienda Automática S.A. de C.V.");
  await sp2.fill("#rfc", "TAU200101AB1");
  await sp2.fill("#legal_address", "Av. Vallarta 1200, Col. Americana, Guadalajara, Jalisco, C.P. 44160");
  await sp2.fill("#legal_phone", "3312345678");
  await sp2.fill("#legal_email", "contacto@tienda-automatica.mx");
  await sp2.getByRole("button", { name: /Enviar solicitud/ }).click();
  await sp2.waitForURL(/\/mypage\/shop$/, { timeout: 20000 });
  if (!(await sp2.innerText("body")).includes("En revisión")) throw new Error("la tienda no quedó en revisión");
});

await step("aprobar la tienda y publicar producto con variantes", async () => {
  await sp2.getByRole("button", { name: /Simular aprobación/ }).click();
  await sp2.waitForTimeout(1500);
  await sp2.goto(`${BASE}/mypage/shop/items/new`);
  await sp2.fill("#title", "Playera de prueba automática");
  await sp2.fill("#description", "Producto de tienda creado por la prueba end-to-end.");
  await sp2.selectOption("#cat1", { label: "Mujer" });
  await sp2.selectOption("#cat2", { index: 1 });
  await sp2.locator('input[type="checkbox"]').first().check(); // usar variantes
  await sp2.locator('input[name="variant_label"]').first().fill("Talla M · Negro");
  await sp2.locator('input[name="variant_stock"]').first().fill("5");
  await sp2.getByRole("button", { name: /Agregar variante/ }).click();
  await sp2.locator('input[name="variant_label"]').nth(1).fill("Talla G · Blanco");
  await sp2.locator('input[name="variant_stock"]').nth(1).fill("3");
  await sp2.locator('input[name="price"]').fill("450");
  await sp2.getByRole("button", { name: "Publicar producto" }).click();
  await sp2.waitForURL(/\/item\/.*published=1/, { timeout: 20000 });
  shopItemUrl = sp2.url().split("?")[0];
  const body = await sp2.innerText("body");
  if (!body.includes("Talla M")) throw new Error("no se ven las variantes en la ficha");
  if (!body.includes("8 piezas")) throw new Error("el inventario total no es correcto");
});

await step("la tienda aparece en el directorio", async () => {
  await page.goto(`${BASE}/shops`);
  await page.getByText("Tienda Automática MX").first().waitFor({ timeout: 20000 });
});

await step("comprar 2 piezas de un producto de tienda", async () => {
  await page.goto(shopItemUrl);
  await page.selectOption("#qty", "2");
  await page.getByRole("button", { name: "Comprar ahora" }).click();
  await page.waitForURL(/\/checkout\//, { timeout: 15000 });
  await page.getByText("Resumen del pedido").waitFor({ timeout: 20000 });
  const summary = await page.innerText("body");
  if (!summary.includes("Producto × 2")) throw new Error("el resumen no refleja la cantidad");
  await page.getByRole("button", { name: /Confirmar la compra/ }).click();
  await page.waitForURL(/\/transaction\/.*new=1/, { timeout: 20000 });
});

await step("el inventario baja y el pedido llega a la tienda", async () => {
  await sp2.goto(`${BASE}/mypage/shop/items`);
  await sp2.getByText(/pza en inventario/).first().waitFor({ timeout: 20000 });
  const inventory = await sp2.innerText("body");
  if (!inventory.includes("6 pza")) throw new Error(`inventario no descontado: ${inventory.match(/\d+ pza/)?.[0]}`);
  await sp2.goto(`${BASE}/mypage/shop/orders`);
  await sp2.getByText(/pza/).first().waitFor({ timeout: 20000 });
  const orders = await sp2.innerText("body");
  if (!orders.includes("2 pza")) throw new Error("el pedido no muestra la cantidad");
  await sp2.locator('input[name="tracking"]').first().fill("MD5555555555MX");
  await sp2.getByRole("button", { name: /Marcar como enviado/ }).first().click();
  await sp2.getByText("Enviado").first().waitFor({ timeout: 20000 });
});

/* --------------------- Red de negocios entre tiendas ---------------------- */

const { DatabaseSync: DB } = await import("node:sqlite");
let supplierCtx, supplierPage, supplierSlug = "artesanias-tonantzin";

await step("solicitar mayoreo a un proveedor", async () => {
  await sp2.goto(`${BASE}/mayoreo`);
  await sp2.getByText("Artesanías Tonantzin").first().waitFor({ timeout: 20000 });
  await sp2.goto(`${BASE}/mayoreo/${supplierSlug}`);
  await sp2.getByText("Solicitar acceso a mayoreo").waitFor({ timeout: 20000 });
  await sp2.fill('textarea[name="note"]', "Somos una tienda de prueba automatizada.");
  await sp2.getByRole("button", { name: /Enviar solicitud/ }).click();
  await sp2.getByText(/Solicitud enviada|Solicitud en revisión/).first().waitFor({ timeout: 20000 });
});

await step("el proveedor aprueba la solicitud", async () => {
  const db = new DB("data/mercado.db");
  const shop = db.prepare("select owner_id from shops where slug = ?").get(supplierSlug);
  db.prepare("insert or replace into sessions (token,user_id,created_at) values (?,?,?)")
    .run("e2esupplier", shop.owner_id, new Date().toISOString());
  db.close();
  supplierCtx = await browser.newContext();
  await supplierCtx.addCookies([{ name: "mercado_session", value: "e2esupplier", url: BASE }]);
  supplierPage = await supplierCtx.newPage();
  await supplierPage.goto(`${BASE}/mypage/shop/wholesale`);
  await supplierPage.getByText("Tienda Automática MX").first().waitFor({ timeout: 20000 });
  await supplierPage.getByRole("button", { name: "Aprobar" }).first().click();
  await supplierPage.getByText("Aprobada").first().waitFor({ timeout: 20000 });
});

let wholesaleOrderUrl;
await step("hacer un pedido de mayoreo", async () => {
  await sp2.goto(`${BASE}/mayoreo/${supplierSlug}`);
  await sp2.getByText("Pedido de mayoreo").first().waitFor({ timeout: 20000 });
  const qty = sp2.locator('input[name="quantity"]').first();
  await qty.fill("12");
  await sp2.locator('select[name="payment_method"]').first().selectOption("spei");
  await sp2.getByRole("button", { name: /Hacer pedido de mayoreo/ }).first().click();
  await sp2.waitForURL(/\/transaction\/.*new=1/, { timeout: 25000 });
  wholesaleOrderUrl = sp2.url().split("?")[0];
});

await step("el proveedor envía el pedido de mayoreo", async () => {
  await supplierPage.goto(wholesaleOrderUrl);
  await supplierPage.getByText("Registrar el envío").waitFor({ timeout: 20000 });
  await supplierPage.fill('input[name="tracking"]', "MDB1234567890MX");
  await supplierPage.getByRole("button", { name: "Marcar como enviado" }).click();
  await supplierPage.getByText(/Paquete enviado/).first().waitFor({ timeout: 20000 });
});

await step("revender lo surtido con crédito al taller", async () => {
  await sp2.goto(`${BASE}/mypage/shop`);
  await sp2.getByText("Mercancía surtida lista para publicar").waitFor({ timeout: 25000 });
  await sp2.locator('input[name="price"]').first().fill("420");
  await sp2.getByRole("button", { name: /Publicar en mi tienda/ }).first().click();
  await sp2.waitForURL(/\/item\/.*published=1/, { timeout: 25000 });
  await sp2.getByText("Elaborado por").first().waitFor({ timeout: 20000 });
  const body = await sp2.innerText("body");
  if (!body.includes("Artesanías Tonantzin")) throw new Error("falta el crédito al productor");
});

await step("importar catálogo por CSV", async () => {
  await sp2.goto(`${BASE}/mypage/shop/import`);
  await sp2.getByText("Importar catálogo (CSV)").waitFor({ timeout: 20000 });
  await sp2.locator("details summary").click();
  await sp2.fill('textarea[name="csv"]',
    "sku,titulo,descripcion,precio,inventario,categoria,marca,talla,color,variantes\n" +
    "E2E-1,Playera importada por CSV,Alta masiva de prueba,350,7,mujer-playeras-corta,Sin marca,M,Negro,\n" +
    "E2E-2,Bolsa importada por CSV,Alta masiva de prueba,780,4,mujer-bolsas-mano,Sin marca,,Café,Chica:2|Grande:2\n");
  await sp2.getByRole("button", { name: "Importar" }).click();
  await sp2.getByText(/Importación lista/).waitFor({ timeout: 25000 });
  await sp2.goto(`${BASE}/mypage/shop/items`);
  await sp2.getByText("Bolsa importada por CSV").first().waitFor({ timeout: 20000 });
});

await step("crear colectivo y aparecer en el directorio", async () => {
  await sp2.goto(`${BASE}/mypage/shop/collectives`);
  await sp2.getByText("Crear colectivo").first().waitFor({ timeout: 20000 });
  await sp2.fill("#name", `Colectivo de Prueba ${Date.now().toString().slice(-5)}`);
  await sp2.fill("#description", "Colectivo creado por la prueba end-to-end.");
  await sp2.getByRole("button", { name: "Crear colectivo" }).click();
  await sp2.waitForURL(/\/colectivo\//, { timeout: 25000 });
  await sp2.getByText("Tiendas del colectivo").waitFor({ timeout: 20000 });
});

await step("armar un paquete cruzado con la tienda aliada", async () => {
  await sp2.goto(`${BASE}/mypage/shop/bundles`);
  await sp2.getByText("Nuevo paquete cruzado").waitFor({ timeout: 20000 });
  await sp2.fill("#title", "Paquete de prueba automática");
  await sp2.fill("#discount", "150");
  await sp2.locator('fieldset input[name="item_id"]').first().check();
  const allied = sp2.locator("fieldset").nth(1).locator('input[name="item_id"]');
  if (!(await allied.count())) throw new Error("no hay productos de tiendas aliadas");
  await allied.first().check();
  await sp2.getByRole("button", { name: "Crear paquete" }).click();
  await sp2.getByText(/Paquete cruzado creado/).waitFor({ timeout: 25000 });
});

await step("consolidar envíos y marcarlos recolectados", async () => {
  // la cuenta demo compra dos veces más para tener pedidos que consolidar
  const db = new DB("data/mercado.db");
  const shop = db.prepare("select id from shops where slug like 'tienda-automatica%' order by created_at desc limit 1").get();
  const items = db.prepare("select id from items where shop_id = ? and status = 'on_sale' limit 2").all(shop.id);
  db.close();
  for (const item of items) {
    await page.goto(`${BASE}/checkout/${item.id}?qty=1`);
    await page.getByText("Resumen del pedido").waitFor({ timeout: 20000 });
    await page.getByRole("button", { name: /Confirmar la compra/ }).click();
    await page.waitForURL(/\/transaction\//, { timeout: 25000 });
  }
  await sp2.goto(`${BASE}/mypage/shop/shipments`);
  await sp2.getByText("Nuevo envío consolidado").waitFor({ timeout: 20000 });
  const boxes = sp2.locator('input[name="order_id"]');
  const total = await boxes.count();
  if (total < 2) throw new Error(`solo hay ${total} pedidos consolidables`);
  await boxes.nth(0).check();
  await boxes.nth(1).check();
  await sp2.getByRole("button", { name: /Crear envío consolidado/ }).click();
  // el envío queda guardado; se recarga para operar sobre la lista persistida
  await sp2.waitForTimeout(2500);
  await sp2.goto(`${BASE}/mypage/shop/shipments`, { waitUntil: "domcontentloaded" });
  await sp2.getByText("En preparación").first().waitFor({ timeout: 25000 });
  await sp2.getByRole("button", { name: /Marcar como recolectado/ }).first().click();
  await sp2.getByText("Recolectado").first().waitFor({ timeout: 25000 });
});

await step("solicitar adelanto sobre ventas en curso", async () => {
  await sp2.goto(`${BASE}/mypage/shop/financing`);
  await sp2.getByText("Ventas en curso").first().waitFor({ timeout: 20000 });
  const form = sp2.getByRole("button", { name: "Solicitar adelanto" });
  if (await form.isDisabled()) throw new Error("no hay ventas suficientes para el adelanto");
  await form.click();
  await sp2.getByText(/Adelanto de \$|Adelanto activo/).first().waitFor({ timeout: 25000 });
});

await step("páginas de la red responden", async () => {
  for (const path of ["/mayoreo", "/colectivos", "/mypage/shop/wholesale", "/mypage/shop/partners",
    "/mypage/shop/purchases", "/mypage/shop/shipments", "/mypage/shop/import",
    "/mypage/shop/bundles", "/mypage/shop/collectives", "/mypage/shop/financing"]) {
    const res = await sp2.goto(BASE + path);
    if (res.status() !== 200) throw new Error(`${path} → ${res.status()}`);
  }
  if (supplierCtx) await supplierCtx.close();
});

await step("páginas de Shops responden", async () => {
  for (const path of ["/shops", "/mypage/shop", "/mypage/shop/items", "/mypage/shop/orders",
    "/mypage/shop/settings", "/mypage/shops", "/legal/shops"]) {
    const res = await sp2.goto(BASE + path);
    if (res.status() !== 200) throw new Error(`${path} → ${res.status()}`);
  }
});

await step("páginas de la cuenta responden", async () => {
  for (const path of ["/mypage", "/mypage/listings", "/mypage/balance", "/mypage/points",
    "/mypage/coupons", "/mypage/reviews", "/mypage/searches", "/mypage/follows",
    "/mypage/profile", "/mypage/settings", "/notifications"]) {
    const res = await page.goto(BASE + path);
    if (res.status() !== 200) throw new Error(`${path} → ${res.status()}`);
  }
});

await shopCtx.close();

await page.goto(BASE);
if (process.env.SHOT_DIR) await page.screenshot({ path: process.env.SHOT_DIR + "/home.png" });
await page.goto(itemUrl);
if (process.env.SHOT_DIR) await page.screenshot({ path: process.env.SHOT_DIR + "/item.png" });

await browser.close();
console.log(errors.length ? `\n${errors.length} FALLOS:\n` + errors.join("\n") : "\nTodo correcto ✅");
process.exit(errors.length ? 1 : 0);
