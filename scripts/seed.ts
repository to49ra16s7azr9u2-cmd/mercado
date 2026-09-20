/**
 * Genera la base de datos de demostración de Mercado.
 * Uso: npm run seed  (borra y recrea data/mercado.db)
 */
import { DatabaseSync } from "node:sqlite";
import { scryptSync, randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DB_PATH = path.join(ROOT, "data", "mercado.db");
fs.mkdirSync(path.join(ROOT, "data"), { recursive: true });
for (const suffix of ["", "-wal", "-shm"]) {
  try { fs.unlinkSync(DB_PATH + suffix); } catch {}
}

const db = new DatabaseSync(DB_PATH);
db.exec(fs.readFileSync(path.join(ROOT, "src", "db", "schema.sql"), "utf8"));

/* ------------------------------ utilidades ------------------------------ */

let counter = 0;
const id = (p: string) => `${p}${(++counter).toString(36)}${randomUUID().slice(0, 6)}`;
const hash = (pw: string) => {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 64).toString("hex")}`;
};
let rngState = 987654321;
const rnd = () => ((rngState = (rngState * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length) % arr.length];
const int = (min: number, max: number) => min + Math.floor(rnd() * (max - min + 1));
const daysAgo = (d: number) => new Date(Date.now() - d * 86400000 - int(0, 8000000)).toISOString();

/* ------------------------------ categorías ------------------------------ */

type Node = { name: string; slug: string; icon?: string; children?: Node[] };
const treeSource = fs.readFileSync(path.join(ROOT, "src", "lib", "constants.ts"), "utf8");
const treeJson = treeSource
  .slice(treeSource.indexOf("export const CATEGORY_TREE"))
  .replace(/^[^[]*/, "")
  .slice(0, treeSource.slice(treeSource.indexOf("export const CATEGORY_TREE")).replace(/^[^[]*/, "").indexOf("\n];") + 2);
const CATEGORY_TREE: Node[] = eval(treeJson);

const catIdBySlug = new Map<string, number>();
let catId = 0;
const insertCat = db.prepare(
  "INSERT INTO categories (id, parent_id, name, slug, icon, level, sort) VALUES (?,?,?,?,?,?,?)",
);
function walk(nodes: Node[], parent: number | null, level: number) {
  nodes.forEach((node, index) => {
    const myId = ++catId;
    catIdBySlug.set(node.slug, myId);
    insertCat.run(myId, parent, node.name, node.slug, node.icon ?? "", level, index);
    if (node.children) walk(node.children, myId, level + 1);
  });
}
walk(CATEGORY_TREE, null, 0);

/* -------------------------------- marcas -------------------------------- */

const BRANDS = [
  "Zara", "Nike", "Adidas", "Apple", "Samsung", "Sony", "Nintendo", "LEGO", "Mango", "H&M",
  "Uniqlo", "Massimo Dutti", "Levi's", "The North Face", "Chanel", "Louis Vuitton", "Gucci",
  "Bershka", "Pull&Bear", "Desigual", "Xiaomi", "Canon", "Dyson", "IKEA", "Stradivarius",
  "Puma", "New Balance", "Sin marca",
];
const brandIdByName = new Map<string, number>();
const insertBrand = db.prepare("INSERT INTO brands (id, name) VALUES (?, ?)");
BRANDS.forEach((name, i) => {
  insertBrand.run(i + 1, name);
  brandIdByName.set(name, i + 1);
});

/* ------------------------------- usuarios ------------------------------- */

const REGIONS = ["Madrid", "Cataluña", "Andalucía", "Comunidad Valenciana", "Galicia", "País Vasco", "Castilla y León", "Murcia", "Aragón", "Canarias"];
const CITIES: Record<string, string> = {
  Madrid: "Madrid", Cataluña: "Barcelona", Andalucía: "Sevilla",
  "Comunidad Valenciana": "Valencia", Galicia: "A Coruña", "País Vasco": "Bilbao",
  "Castilla y León": "Valladolid", Murcia: "Murcia", Aragón: "Zaragoza", Canarias: "Las Palmas",
};

const PEOPLE = [
  ["Lucía Fernández", "lucia_f", "Vendo ropa que ya no me pongo. Envío en 24 h de lunes a viernes 📦"],
  ["Carlos Ramírez", "carlos_rmz", "Coleccionista de videojuegos retro. Todo probado y funcionando."],
  ["Marta Ortega", "marta_o", "Armario en constante limpieza. ¡Acepto ofertas razonables!"],
  ["Javier Serrano", "javi_serrano", "Fotografía y electrónica. Facturas disponibles."],
  ["Elena Navarro", "elena_nav", "Ropa de bebé y juguetes en muy buen estado. Hogar sin humo."],
  ["Diego Molina", "diego_mol", "Deporte, bici y montaña. Pregunta sin compromiso."],
  ["Paula Castro", "paula_castro", "Hecho a mano con mucho cariño ✨"],
  ["Andrés Gil", "andres_gil", "Libros, vinilos y cómics. Envío certificado."],
  ["Nuria Sanz", "nuria_sanz", "Cosmética sin abrir y perfumes originales."],
  ["Hugo Delgado", "hugo_delgado", "Muebles y decoración. Entrega en mano en Madrid."],
  ["Sofía Iglesias", "sofia_ig", "Vintage y segunda mano con historia."],
  ["Pablo Vargas", "pablo_vargas", "Tecnología revisada. Respondo rápido 😊"],
];

const insertUser = db.prepare(
  `INSERT INTO users (id, email, password_hash, name, handle, avatar_seed, bio, balance, points,
    is_verified, addr_name, addr_zip, addr_region, addr_city, addr_line, addr_phone, created_at)
   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
);

const users: { id: string; name: string; handle: string }[] = [];

function addUser(name: string, handle: string, bio: string, email: string, password: string, verified = 1) {
  const uid = id("u_");
  const region = pick(REGIONS);
  insertUser.run(
    uid, email, hash(password), name, handle, String(users.length % 12), bio,
    int(0, 320), int(0, 500), verified, name, String(int(1000, 52999)).padStart(5, "0"),
    region, CITIES[region], `Calle ${pick(["Mayor", "Serrano", "Gran Vía", "del Sol", "Aragón", "Colón"])} ${int(1, 120)}, ${int(1, 6)}ºB`,
    `6${int(10000000, 99999999)}`, daysAgo(int(200, 800)),
  );
  users.push({ id: uid, name, handle });
  return uid;
}

const demoId = addUser("Ana Demo", "ana_demo", "Cuenta de demostración de Mercado. ¡Prueba a comprar y vender!", "demo@mercado.es", "demo1234");
for (const [name, handle, bio] of PEOPLE) {
  addUser(name, handle, bio, `${handle}@mercado.es`, "mercado1234");
}

db.prepare("INSERT INTO cards (id, user_id, brand, last4, exp, holder, is_default, created_at) VALUES (?,?,?,?,?,?,1,?)")
  .run(id("cd_"), demoId, "Visa", "4242", "12/29", "ANA DEMO", daysAgo(120));
db.prepare("UPDATE users SET balance = 148, points = 620 WHERE id = ?").run(demoId);

/* -------------------------------- catálogo ------------------------------- */

type Product = { t: string; e: string; cat: string; brand?: string; min: number; max: number; size?: string[] };

const CATALOG: Product[] = [
  { t: "Vestido midi de flores", e: "👗", cat: "mujer-vestidos-vestido", brand: "Zara", min: 8, max: 35, size: ["S", "M", "L"] },
  { t: "Vestido negro de fiesta", e: "👗", cat: "mujer-vestidos-vestido", brand: "Mango", min: 12, max: 60, size: ["XS", "S", "M"] },
  { t: "Falda plisada midi", e: "🩱", cat: "mujer-vestidos-falda", brand: "Stradivarius", min: 6, max: 25, size: ["S", "M"] },
  { t: "Camiseta básica de algodón", e: "👚", cat: "mujer-camisetas-corta", brand: "H&M", min: 3, max: 12, size: ["S", "M", "L"] },
  { t: "Blusa de seda con lazada", e: "👚", cat: "mujer-blusas", brand: "Massimo Dutti", min: 10, max: 45, size: ["S", "M"] },
  { t: "Camisa oversize de rayas", e: "👔", cat: "mujer-blusas", brand: "Zara", min: 7, max: 28, size: ["M", "L"] },
  { t: "Abrigo largo de paño", e: "🧥", cat: "mujer-abrigos-abrigo", brand: "Mango", min: 25, max: 120, size: ["S", "M", "L"] },
  { t: "Cazadora vaquera oversize", e: "🧥", cat: "mujer-abrigos-cazadora", brand: "Levi's", min: 18, max: 70, size: ["M", "L"] },
  { t: "Plumífero acolchado ligero", e: "🧥", cat: "mujer-abrigos-plumifero", brand: "Uniqlo", min: 20, max: 85, size: ["S", "M"] },
  { t: "Vaqueros mom fit tiro alto", e: "👖", cat: "mujer-pantalones-vaqueros", brand: "Levi's", min: 12, max: 55, size: ["36", "38", "40"] },
  { t: "Pantalón de vestir recto", e: "👖", cat: "mujer-pantalones-vestir", brand: "Zara", min: 8, max: 35, size: ["38", "40", "42"] },
  { t: "Zapatillas blancas de piel", e: "👟", cat: "mujer-zapatos-zapatillas", brand: "Adidas", min: 20, max: 80, size: ["38", "39", "40"] },
  { t: "Botas altas de caña ancha", e: "👢", cat: "mujer-zapatos-botas", brand: "Zara", min: 22, max: 90, size: ["37", "38", "39"] },
  { t: "Salones de tacón medio", e: "👠", cat: "mujer-zapatos-tacones", brand: "Mango", min: 12, max: 55, size: ["37", "38"] },
  { t: "Bolso bandolera acolchado", e: "👜", cat: "mujer-bolsos-bandolera", brand: "Bershka", min: 8, max: 40 },
  { t: "Bolso tote de piel", e: "👜", cat: "mujer-bolsos-mano", brand: "Massimo Dutti", min: 30, max: 160 },
  { t: "Mochila urbana impermeable", e: "🎒", cat: "mujer-bolsos-mochilas", brand: "The North Face", min: 25, max: 95 },
  { t: "Collar de plata de ley", e: "📿", cat: "mujer-accesorios-collares", brand: "Sin marca", min: 8, max: 45 },
  { t: "Reloj analógico dorado", e: "⌚", cat: "mujer-accesorios-relojes", brand: "Sin marca", min: 15, max: 120 },
  { t: "Gafas de sol de pasta", e: "🕶️", cat: "mujer-accesorios-gafas", brand: "Sin marca", min: 10, max: 90 },

  { t: "Camiseta de algodón orgánico", e: "👕", cat: "hombre-camisetas-camiseta", brand: "Uniqlo", min: 4, max: 18, size: ["M", "L", "XL"] },
  { t: "Camisa oxford slim fit", e: "👔", cat: "hombre-camisetas-camisa", brand: "Massimo Dutti", min: 10, max: 45, size: ["M", "L"] },
  { t: "Sudadera con capucha", e: "🧥", cat: "hombre-camisetas-sudadera", brand: "Nike", min: 15, max: 60, size: ["M", "L", "XL"] },
  { t: "Cazadora bomber", e: "🧥", cat: "hombre-abrigos-cazadora", brand: "Pull&Bear", min: 15, max: 65, size: ["M", "L"] },
  { t: "Abrigo de lana clásico", e: "🧥", cat: "hombre-abrigos-abrigo", brand: "Zara", min: 30, max: 140, size: ["L", "XL"] },
  { t: "Vaqueros slim lavado oscuro", e: "👖", cat: "hombre-pantalones-vaqueros", brand: "Levi's", min: 15, max: 65, size: ["40", "42", "44"] },
  { t: "Chinos beige", e: "👖", cat: "hombre-pantalones-chinos", brand: "Zara", min: 9, max: 35, size: ["42", "44"] },
  { t: "Zapatillas running", e: "👟", cat: "hombre-zapatos-zapatillas", brand: "New Balance", min: 25, max: 110, size: ["42", "43", "44"] },
  { t: "Zapatos Oxford de piel", e: "👞", cat: "hombre-zapatos-vestir", brand: "Sin marca", min: 20, max: 95, size: ["42", "43"] },
  { t: "Reloj automático de acero", e: "⌚", cat: "hombre-accesorios-relojes", brand: "Sin marca", min: 40, max: 320 },
  { t: "Cinturón de piel reversible", e: "🪢", cat: "hombre-accesorios-cinturones", brand: "Sin marca", min: 8, max: 40 },

  { t: "Pack de 5 bodies de algodón", e: "🧷", cat: "bebe-ropa-bodies", brand: "H&M", min: 5, max: 18 },
  { t: "Conjunto de punto para bebé", e: "🧦", cat: "bebe-ropa-conjuntos", brand: "Zara", min: 6, max: 25 },
  { t: "Camiseta infantil estampada", e: "👕", cat: "bebe-nino-camisetas", brand: "H&M", min: 3, max: 12 },
  { t: "Pantalón vaquero infantil", e: "👖", cat: "bebe-nino-pantalones", brand: "Zara", min: 4, max: 16 },
  { t: "Carrito de paseo plegable", e: "🍼", cat: "bebe-carritos-carrito", brand: "Sin marca", min: 45, max: 280 },
  { t: "Silla de coche grupo 1/2/3", e: "🚗", cat: "bebe-carritos-silla", brand: "Sin marca", min: 35, max: 180 },
  { t: "Lote de juguetes de madera", e: "🧸", cat: "bebe-juguetes", brand: "Sin marca", min: 8, max: 45 },

  { t: "Silla de escritorio ergonómica", e: "🪑", cat: "hogar-muebles-sillas", brand: "IKEA", min: 25, max: 160 },
  { t: "Mesa de centro de roble", e: "🪵", cat: "hogar-muebles-mesas", brand: "IKEA", min: 30, max: 190 },
  { t: "Estantería KALLAX 4 huecos", e: "🗄️", cat: "hogar-muebles-estanterias", brand: "IKEA", min: 20, max: 90 },
  { t: "Vajilla de porcelana 12 piezas", e: "🍽️", cat: "hogar-cocina-vajilla", brand: "Sin marca", min: 15, max: 70 },
  { t: "Robot de cocina multifunción", e: "🍲", cat: "hogar-cocina-electro", brand: "Sin marca", min: 45, max: 320 },
  { t: "Aspirador sin cable", e: "🧹", cat: "hogar-cocina-electro", brand: "Dyson", min: 90, max: 420 },
  { t: "Lámpara de mesa nórdica", e: "💡", cat: "hogar-decoracion", brand: "IKEA", min: 8, max: 45 },
  { t: "Juego de sábanas 150 cm", e: "🛏️", cat: "hogar-cama", brand: "Sin marca", min: 10, max: 45 },

  { t: "El nombre del viento (tapa dura)", e: "📕", cat: "libros-libros-novela", brand: "Sin marca", min: 5, max: 22 },
  { t: "Lote de 10 novelas de bolsillo", e: "📚", cat: "libros-libros-novela", brand: "Sin marca", min: 8, max: 30 },
  { t: "Manga One Piece tomos 1-12", e: "📖", cat: "libros-libros-comic", brand: "Sin marca", min: 20, max: 85 },
  { t: "Libro de texto de bachillerato", e: "📘", cat: "libros-libros-texto", brand: "Sin marca", min: 5, max: 30 },
  { t: "CD original de rock de los 90", e: "💿", cat: "libros-musica-cd", brand: "Sin marca", min: 3, max: 18 },
  { t: "Vinilo LP edición limitada", e: "🎵", cat: "libros-musica-vinilo", brand: "Sin marca", min: 12, max: 65 },
  { t: "Juego de Nintendo Switch", e: "🎮", cat: "libros-videojuegos-switch", brand: "Nintendo", min: 15, max: 55 },
  { t: "Mando Pro inalámbrico", e: "🎮", cat: "libros-videojuegos-switch", brand: "Nintendo", min: 30, max: 65 },
  { t: "Juego de PlayStation 5", e: "🕹️", cat: "libros-videojuegos-ps", brand: "Sony", min: 15, max: 60 },
  { t: "Consola retro con 500 juegos", e: "🕹️", cat: "libros-videojuegos-consolas", brand: "Sin marca", min: 25, max: 120 },

  { t: "Figura coleccionable de anime", e: "🗿", cat: "juguetes-figuras", brand: "Sin marca", min: 10, max: 90 },
  { t: "Lote de cartas Pokémon", e: "🃏", cat: "juguetes-cartas", brand: "Sin marca", min: 8, max: 150 },
  { t: "Set LEGO Creator sin abrir", e: "🧱", cat: "juguetes-lego", brand: "LEGO", min: 20, max: 180 },
  { t: "Guitarra acústica con funda", e: "🎸", cat: "juguetes-instrumentos", brand: "Sin marca", min: 40, max: 220 },

  { t: "Paleta de sombras sin estrenar", e: "💄", cat: "belleza-maquillaje", brand: "Sin marca", min: 6, max: 40 },
  { t: "Sérum facial con vitamina C", e: "🧴", cat: "belleza-piel", brand: "Sin marca", min: 8, max: 45 },
  { t: "Perfume 100 ml precintado", e: "🌸", cat: "belleza-perfumes", brand: "Chanel", min: 35, max: 140 },
  { t: "Secador iónico profesional", e: "💇", cat: "belleza-cabello", brand: "Dyson", min: 60, max: 380 },

  { t: "iPhone 13 128 GB libre", e: "📱", cat: "electronica-moviles-smartphone", brand: "Apple", min: 180, max: 520 },
  { t: "Samsung Galaxy S22 libre", e: "📱", cat: "electronica-moviles-smartphone", brand: "Samsung", min: 150, max: 420 },
  { t: "Xiaomi Redmi Note 12", e: "📱", cat: "electronica-moviles-smartphone", brand: "Xiaomi", min: 70, max: 190 },
  { t: "iPad de 10,2 pulgadas Wi-Fi", e: "📲", cat: "electronica-moviles-tablet", brand: "Apple", min: 120, max: 380 },
  { t: "Funda con teclado para tablet", e: "⌨️", cat: "electronica-moviles-accesorios", brand: "Sin marca", min: 8, max: 45 },
  { t: "MacBook Air M1 256 GB", e: "💻", cat: "electronica-ordenadores-portatil", brand: "Apple", min: 350, max: 780 },
  { t: "Monitor 27\" QHD 144 Hz", e: "🖥️", cat: "electronica-ordenadores-perifericos", brand: "Samsung", min: 90, max: 320 },
  { t: "Teclado mecánico retroiluminado", e: "⌨️", cat: "electronica-ordenadores-perifericos", brand: "Sin marca", min: 20, max: 110 },
  { t: "Cámara réflex con objetivo 18-55", e: "📷", cat: "electronica-camaras-reflex", brand: "Canon", min: 130, max: 520 },
  { t: "Objetivo 50 mm f/1.8", e: "🔭", cat: "electronica-camaras-objetivos", brand: "Canon", min: 60, max: 190 },
  { t: "Auriculares con cancelación de ruido", e: "🎧", cat: "electronica-audio-auriculares", brand: "Sony", min: 45, max: 260 },
  { t: "AirPods Pro 2.ª generación", e: "🎧", cat: "electronica-audio-auriculares", brand: "Apple", min: 90, max: 220 },
  { t: "Altavoz Bluetooth resistente al agua", e: "🔊", cat: "electronica-audio-altavoces", brand: "Sony", min: 25, max: 130 },

  { t: "Bicicleta de carretera talla 54", e: "🚲", cat: "deporte-ciclismo", brand: "Sin marca", min: 120, max: 780 },
  { t: "Casco de ciclismo homologado", e: "🪖", cat: "deporte-ciclismo", brand: "Sin marca", min: 15, max: 90 },
  { t: "Mancuernas ajustables 20 kg", e: "🏋️", cat: "deporte-fitness", brand: "Sin marca", min: 25, max: 140 },
  { t: "Esterilla de yoga antideslizante", e: "🧘", cat: "deporte-fitness", brand: "Sin marca", min: 8, max: 35 },
  { t: "Tienda de campaña 3 plazas", e: "⛺", cat: "deporte-camping", brand: "Sin marca", min: 30, max: 160 },
  { t: "Camiseta oficial de fútbol", e: "⚽", cat: "deporte-futbol", brand: "Nike", min: 15, max: 75 },

  { t: "Pendientes artesanales de arcilla", e: "🎨", cat: "handmade-accesorios", brand: "Sin marca", min: 5, max: 25 },
  { t: "Vela de soja aromática", e: "🕯️", cat: "handmade-velas", brand: "Sin marca", min: 6, max: 22 },
  { t: "Cuaderno encuadernado a mano", e: "📓", cat: "handmade-papeleria", brand: "Sin marca", min: 8, max: 30 },

  { t: "Entrada para concierto en Madrid", e: "🎫", cat: "entradas-conciertos", brand: "Sin marca", min: 25, max: 120 },
  { t: "Entrada de fútbol Primera División", e: "🏟️", cat: "entradas-deportes", brand: "Sin marca", min: 30, max: 180 },
  { t: "Abono de cine 5 sesiones", e: "🎬", cat: "entradas-cine", brand: "Sin marca", min: 15, max: 45 },

  { t: "Juego de escobillas limpiaparabrisas", e: "🚗", cat: "motor-recambios", brand: "Sin marca", min: 8, max: 35 },
  { t: "Guantes de moto verano", e: "🧤", cat: "motor-moto", brand: "Sin marca", min: 12, max: 60 },
  { t: "Casco integral talla M", e: "🪖", cat: "motor-cascos", brand: "Sin marca", min: 40, max: 220 },

  { t: "Transportín para gato", e: "🐈", cat: "otros-mascotas", brand: "Sin marca", min: 10, max: 45 },
  { t: "Lote de material de oficina", e: "📎", cat: "otros-oficina", brand: "Sin marca", min: 5, max: 30 },
  { t: "Taladro percutor con maletín", e: "🔧", cat: "otros-bricolaje", brand: "Sin marca", min: 25, max: 130 },
];

const DESCRIPTIONS = [
  "Está en muy buen estado, apenas lo he usado. Se envía limpio y bien protegido.",
  "Lo compré hace poco pero no le doy uso. No tiene defectos ni marcas.",
  "Producto original. Acepto ofertas razonables, pero no regalo 🙂",
  "Se vende por falta de espacio en casa. Puedo enviar más fotos si las necesitas.",
  "Perfecto funcionamiento, revisado antes de publicarlo. Envío en 24-48 h.",
  "Solo lo he usado un par de veces. Guardado en casa sin humo ni mascotas.",
  "Tiene alguna señal mínima de uso que no se aprecia al llevarlo puesto.",
  "Precio negociable si te llevas varios artículos de mi perfil.",
];

const EXTRA = [
  "\n\n· Envío el mismo día si compras antes de las 15:00.\n· Embalaje reforzado.\n· Pregunta lo que necesites por los comentarios.",
  "\n\nMedidas aproximadas en las fotos. Cualquier duda, escríbeme antes de comprar.",
  "\n\nNo admito devoluciones por cambio de opinión, pero describo con total honestidad.",
  "",
];

/* ------------------------------ artículos -------------------------------- */

const insertItem = db.prepare(
  `INSERT INTO items (id, seller_id, title, description, price, category_id, brand_id, size, color,
    condition, shipping_payer, shipping_method, ship_from, ship_days, offers_enabled, status, views,
    created_at, updated_at)
   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
);
const insertImage = db.prepare("INSERT INTO item_images (item_id, url, position) VALUES (?,?,?)");
const insertLike = db.prepare("INSERT OR IGNORE INTO likes (user_id, item_id, created_at) VALUES (?,?,?)");
const insertComment = db.prepare("INSERT INTO comments (id, item_id, user_id, body, created_at) VALUES (?,?,?,?,?)");

const COLORS = ["Negro", "Blanco", "Azul", "Verde", "Rojo", "Beige", "Gris", "Rosa", "Multicolor"];
const METHODS = ["facil", "facil", "comodo", "comodo", "certificado", "paqueteria", "mano"];

type Created = { id: string; sellerId: string; title: string; price: number };
const created: Created[] = [];

const variants = ["", " · edición 2024", " (como nuevo)", " en perfecto estado", " — lote", " original"];
let itemIndex = 0;

for (let round = 0; round < 2; round++) {
  for (const product of CATALOG) {
    itemIndex++;
    if (round === 1 && itemIndex % 3 !== 0) continue;
    const seller = users[int(1, users.length - 1)];
    const itemId = id("m");
    const price = int(product.min, product.max);
    const title = round === 0 ? product.t : product.t + pick(variants);
    const cat = catIdBySlug.get(product.cat)!;
    const description = pick(DESCRIPTIONS) + pick(EXTRA);
    const shippingPayer = rnd() > 0.28 ? "seller" : "buyer";
    const created_at = daysAgo(int(0, 120));
    const region = pick(REGIONS);
    insertItem.run(
      itemId, seller.id, title, description, price, cat,
      brandIdByName.get(product.brand ?? "Sin marca") ?? null,
      product.size ? pick(product.size) : "", pick(COLORS), int(1, 4), shippingPayer,
      pick(METHODS), region, int(1, 3), rnd() > 0.25 ? 1 : 0, "on_sale", int(3, 900),
      created_at, created_at,
    );
    const photos = int(1, 4);
    for (let p = 0; p < photos; p++) {
      insertImage.run(
        itemId,
        `/api/photo?seed=${encodeURIComponent(itemId + p)}&e=${encodeURIComponent(product.e)}&t=${encodeURIComponent(title.slice(0, 32))}`,
        p,
      );
    }
    for (const user of users) {
      if (user.id !== seller.id && rnd() > 0.82) insertLike.run(user.id, itemId, created_at);
    }
    if (rnd() > 0.72) {
      const asker = users[int(1, users.length - 1)];
      if (asker.id !== seller.id) {
        const question = pick([
          "¡Hola! ¿Sigue disponible?",
          "Buenas, ¿aceptarías una oferta un poco más baja?",
          "¿Me puedes decir las medidas exactas, por favor?",
          "¿Cuánto tardarías en enviarlo?",
          "¿Tiene algún defecto que no se vea en las fotos?",
        ]);
        const qTime = daysAgo(int(0, 20));
        insertComment.run(id("cm_"), itemId, asker.id, question, qTime);
        insertComment.run(
          id("cm_"), itemId, seller.id,
          pick([
            "¡Hola! Sí, sigue disponible 😊",
            "Buenas, lo envío en menos de 24 h desde que se compra.",
            "Te he añadido una foto más con las medidas. ¡Gracias por el interés!",
            "Puedo ajustar un poco el precio, hazme una oferta.",
            "Está impecable, no tiene ningún defecto.",
          ]),
          new Date(new Date(qTime).getTime() + 3600000).toISOString(),
        );
      }
    }
    created.push({ id: itemId, sellerId: seller.id, title, price });
  }
}

/* ------------------- artículos y actividad de la cuenta demo ------------------ */

const demoProducts = CATALOG.slice(0, 4);
const demoItems: Created[] = [];
demoProducts.forEach((product, i) => {
  const itemId = id("m");
  const price = int(product.min, product.max);
  const created_at = daysAgo(i * 4 + 1);
  insertItem.run(
    itemId, demoId, `${product.t} · publicado por Ana`, pick(DESCRIPTIONS), price,
    catIdBySlug.get(product.cat)!, brandIdByName.get(product.brand ?? "Sin marca") ?? null,
    product.size ? pick(product.size) : "", pick(COLORS), int(1, 3), "seller", "facil",
    "Madrid", 1, 1, "on_sale", int(20, 400), created_at, created_at,
  );
  insertImage.run(itemId, `/api/photo?seed=${encodeURIComponent(itemId)}&e=${encodeURIComponent(product.e)}&t=${encodeURIComponent(product.t.slice(0, 32))}`, 0);
  demoItems.push({ id: itemId, sellerId: demoId, title: product.t, price });
});

// borrador
const draftId = id("m");
insertItem.run(
  draftId, demoId, "Chaqueta vaquera (borrador)", "Pendiente de añadir fotos y medidas.", 0,
  catIdBySlug.get("mujer-abrigos-cazadora")!, brandIdByName.get("Levi's")!, "M", "Azul", 2,
  "seller", "facil", "Madrid", 1, 1, "draft", 0, daysAgo(2), daysAgo(2),
);

// favoritos, historial y seguimientos de la cuenta demo
for (const item of created.slice(0, 14)) insertLike.run(demoId, item.id, daysAgo(int(0, 20)));
const insertHistory = db.prepare("INSERT OR REPLACE INTO history (user_id, item_id, viewed_at) VALUES (?,?,?)");
for (const item of created.slice(5, 30)) insertHistory.run(demoId, item.id, daysAgo(int(0, 10)));
const insertFollow = db.prepare("INSERT OR IGNORE INTO follows (follower_id, followee_id, created_at) VALUES (?,?,?)");
for (const user of users.slice(1, 7)) insertFollow.run(demoId, user.id, daysAgo(int(5, 60)));
for (const user of users.slice(2, 9)) insertFollow.run(user.id, demoId, daysAgo(int(5, 60)));
for (const a of users.slice(1)) {
  for (const b of users.slice(1)) {
    if (a.id !== b.id && rnd() > 0.85) insertFollow.run(a.id, b.id, daysAgo(int(5, 200)));
  }
}

/* --------------------------------- pedidos -------------------------------- */

const insertOrder = db.prepare(
  `INSERT INTO orders (id, item_id, buyer_id, seller_id, price, points_used, coupon_id, coupon_amount,
    charged, fee, shipping_cost, payout, payment_method, status, ship_name, ship_zip, ship_region,
    ship_city, ship_line, ship_phone, tracking, created_at, shipped_at, received_at, completed_at)
   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
);
const insertMessage = db.prepare("INSERT INTO messages (id, order_id, user_id, body, created_at) VALUES (?,?,?,?,?)");
const insertReview = db.prepare("INSERT INTO reviews (id, order_id, rater_id, ratee_id, score, body, created_at) VALUES (?,?,?,?,?,?,?)");
const insertLedger = db.prepare("INSERT INTO ledger (id, user_id, kind, amount, memo, created_at) VALUES (?,?,?,?,?,?)");
const insertNotification = db.prepare(
  "INSERT INTO notifications (id, user_id, kind, title, body, link, image, is_read, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
);

function makeOrder(item: Created, buyerId: string, status: "paid" | "shipped" | "received" | "done", ageDays: number) {
  const orderId = id("o_");
  const fee = Math.round(item.price * 0.1);
  const payout = item.price - fee;
  const createdAt = daysAgo(ageDays);
  const shippedAt = status === "paid" ? null : daysAgo(Math.max(0, ageDays - 1));
  const receivedAt = status === "paid" || status === "shipped" ? null : daysAgo(Math.max(0, ageDays - 3));
  const completedAt = status === "done" ? daysAgo(Math.max(0, ageDays - 3)) : null;
  const buyer = users.find((u) => u.id === buyerId)!;
  insertOrder.run(
    orderId, item.id, buyerId, item.sellerId, item.price, 0, null, 0, item.price, fee, 0, payout,
    pick(["card", "balance", "bizum", "paypal"]), status, buyer.name, "28013", "Madrid", "Madrid",
    `Calle Mayor ${int(1, 80)}, 2ºA`, `6${int(10000000, 99999999)}`,
    status === "paid" ? "" : `MD${int(1000000000, 9999999999)}ES`,
    createdAt, shippedAt, receivedAt, completedAt,
  );
  db.prepare("UPDATE items SET status = ? WHERE id = ?").run(status === "done" ? "sold" : "trading", item.id);
  insertMessage.run(id("ms_"), orderId, buyerId, "¡Hola! Acabo de comprar el artículo, muchas gracias 😊", createdAt);
  insertMessage.run(id("ms_"), orderId, item.sellerId, "¡Gracias a ti! Lo preparo hoy mismo y te aviso en cuanto salga.", new Date(new Date(createdAt).getTime() + 5400000).toISOString());
  if (status !== "paid") {
    insertMessage.run(id("ms_"), orderId, item.sellerId, "Ya está enviado, te paso el número de seguimiento por aquí.", shippedAt!);
  }
  if (status === "received" || status === "done") {
    insertReview.run(id("rv_"), orderId, buyerId, item.sellerId, "good", pick([
      "Todo perfecto, tal y como se describe. ¡Muy recomendable!",
      "Envío rapidísimo y muy buen trato. Repetiré.",
      "Artículo en perfecto estado y muy bien embalado.",
    ]), receivedAt!);
  }
  if (status === "done") {
    insertReview.run(id("rv_"), orderId, item.sellerId, buyerId, "good", pick([
      "Comprador ejemplar, pago inmediato. ¡Gracias!",
      "Todo genial, muy amable. Un placer.",
    ]), completedAt!);
    insertLedger.run(id("l_"), item.sellerId, "balance", payout, `Venta de «${item.title}»`, completedAt!);
    db.prepare("UPDATE users SET balance = balance + ? WHERE id = ?").run(payout, item.sellerId);
  }
  return orderId;
}

// historial de ventas de otras personas (para generar valoraciones)
for (let i = 0; i < 26; i++) {
  const item = created[int(0, created.length - 1)];
  if (!item || item.sellerId === demoId) continue;
  const buyer = users[int(0, users.length - 1)];
  if (buyer.id === item.sellerId) continue;
  const row = db.prepare("SELECT status FROM items WHERE id = ?").get(item.id) as { status: string };
  if (row.status !== "on_sale") continue;
  makeOrder(item, buyer.id, "done", int(10, 120));
}

// transacciones en curso de la cuenta demo
const demoPurchase = created.find((c) => c.sellerId !== demoId)!;
const demoOrderShipped = makeOrder(demoPurchase, demoId, "shipped", 3);
const demoPurchase2 = created.find((c) => c.sellerId !== demoId && c.id !== demoPurchase.id)!;
makeOrder(demoPurchase2, demoId, "done", 25);
const demoSale = demoItems[0];
const demoSaleOrder = makeOrder(demoSale, users[3].id, "paid", 1);

/* ------------------------- cupones, puntos y avisos ------------------------ */

const insertCoupon = db.prepare(
  "INSERT INTO coupons (id, user_id, title, code, amount, min_price, expires_at, used_at) VALUES (?,?,?,?,?,?,?,?)",
);
insertCoupon.run(id("c_"), demoId, "Cupón de bienvenida: 5 € de descuento", "BIENVENIDA5", 5, 20, new Date(Date.now() + 25 * 864e5).toISOString(), null);
insertCoupon.run(id("c_"), demoId, "10 % en moda (máx. 10 €)", "MODA10", 10, 50, new Date(Date.now() + 9 * 864e5).toISOString(), null);
insertCoupon.run(id("c_"), demoId, "3 € por invitar a una amiga", "AMIGA3", 3, 10, new Date(Date.now() - 3 * 864e5).toISOString(), null);
insertLedger.run(id("l_"), demoId, "points", 300, "Puntos de bienvenida", daysAgo(90));
insertLedger.run(id("l_"), demoId, "points", 320, "Compra de puntos con tarjeta", daysAgo(20));
insertLedger.run(id("l_"), demoId, "balance", 148, "Venta de «Vestido midi de flores»", daysAgo(15));

const notifications: [string, string, string, string][] = [
  ["order", "Tu pedido está en camino", "El vendedor ha enviado tu artículo. Consulta el seguimiento.", `/transaction/${demoOrderShipped}`],
  ["order", "¡Has vendido un artículo!", "Prepara el envío lo antes posible.", `/transaction/${demoSaleOrder}`],
  ["like", "A Carlos Ramírez le gusta tu artículo", demoItems[1]?.title ?? "", `/item/${demoItems[1]?.id ?? ""}`],
  ["comment", "Marta Ortega ha comentado en tu artículo", "¿Sigue disponible?", `/item/${demoItems[0]?.id ?? ""}`],
  ["news", "Novedad: envíos con recogida en punto", "Ahora puedes elegir punto de recogida al publicar.", "/guide#envios"],
  ["news", "Tu cupón caduca pronto", "Te quedan 9 días para usar MODA10.", "/mypage/coupons"],
];
notifications.forEach(([kind, title, body, link], i) => {
  insertNotification.run(id("n_"), demoId, kind, title, body, link, "", i > 2 ? 1 : 0, daysAgo(i));
});

const insertSaved = db.prepare("INSERT INTO saved_searches (id, user_id, label, query, notify, created_at) VALUES (?,?,?,?,?,?)");
insertSaved.run(id("ss_"), demoId, "Zapatillas talla 38 hasta 40 €", "?q=zapatillas&priceMax=40", 1, daysAgo(12));
insertSaved.run(id("ss_"), demoId, "Nintendo Switch", "?q=Nintendo%20Switch&status=on_sale", 1, daysAgo(4));

/* --------------------------------- resumen -------------------------------- */

const count = (table: string) =>
  (db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;

console.log("Base de datos creada en", DB_PATH);
for (const table of ["users", "categories", "brands", "items", "item_images", "likes", "comments", "orders", "messages", "reviews", "follows", "notifications", "coupons"]) {
  console.log(` · ${table}: ${count(table)}`);
}
console.log("\nCuenta de demostración: demo@mercado.es / demo1234");
db.close();
